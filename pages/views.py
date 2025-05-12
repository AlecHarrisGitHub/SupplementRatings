from rest_framework import viewsets, serializers
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Avg, Case, When, FloatField, F, Value, BooleanField, Exists, OuterRef, ExpressionWrapper, Count, Q
from django.db.models.functions import Round
from .models import Supplement, Rating, Comment, Condition, EmailVerificationToken, Brand, UserUpvote
from .serializers import (
    SupplementSerializer, 
    RatingSerializer, 
    CommentSerializer, 
    ConditionSerializer,
    BrandSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action, throttle_classes
from rest_framework.permissions import IsAdminUser, AllowAny
import pandas as pd
from django.db import transaction
from rest_framework import status
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db import IntegrityError
from pages.throttles import RegisterRateThrottle
from .permissions import IsOwnerOrReadOnly, IsOwnerOrAdmin
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
import os

logging.warning("DEBUG: REST_FRAMEWORK_THROTTLE_RATES = %s", getattr(settings, 'REST_FRAMEWORK_THROTTLE_RATES', None))

class SupplementViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.action == 'retrieve':
            return Supplement.objects.all()

        queryset = Supplement.objects.all()
        name_search = self.request.query_params.get('name', None)
        category_search = self.request.query_params.get('category', None)
        conditions_search = self.request.query_params.get('conditions', None)
        brands_search = self.request.query_params.get('brands', None)
        dosage_search = self.request.query_params.get('dosage', None)
        frequency_search = self.request.query_params.get('frequency', None)
        sort_by = self.request.query_params.get('sort_by', 'highest_rating')
        offset = int(self.request.query_params.get('offset', 0))
        limit = int(self.request.query_params.get('limit', 10))

        # Apply basic filters first
        if name_search:
            queryset = queryset.filter(name__icontains=name_search)

        if category_search:
            queryset = queryset.filter(category__iexact=category_search)

        # Then apply rating-related filters
        filter_conditions = {}
        if conditions_search:
            condition_names = conditions_search.split(',')
            filter_conditions['ratings__conditions__name__in'] = condition_names
        
        if brands_search:
            brands = brands_search.split(',')
            filter_conditions['ratings__brands__in'] = brands
        
        if dosage_search:
            filter_conditions['ratings__dosage'] = dosage_search
        
        if frequency_search:
            frequency_parts = frequency_search.split('_')
            if len(frequency_parts) == 2:
                filter_conditions['ratings__dosage_frequency'] = frequency_parts[0]
                filter_conditions['ratings__frequency_unit'] = frequency_parts[1]

        if filter_conditions:
            queryset = queryset.filter(**filter_conditions)

        # Add annotations for sorting
        queryset = queryset.annotate(
            avg_rating=Avg('ratings__score'),
            rating_count=Count('ratings', distinct=True),
            has_filtered_rating=Value(True, output_field=BooleanField())
        )

        # Apply sorting
        if sort_by == 'most_ratings':
            queryset = queryset.order_by('-rating_count', '-avg_rating')
        else:  # highest_rating
            queryset = queryset.order_by(F('avg_rating').desc(nulls_last=True), '-rating_count')

        if self.action == 'list':
            return queryset[offset:offset + limit]
        return queryset

    @action(detail=False, methods=['get'])
    def categories(self, request):
        categories = Supplement.objects.values_list('category', flat=True).distinct()
        return Response(list(categories))

class RatingViewSet(viewsets.ModelViewSet):
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = Rating.objects.all()
        supplement_id = self.request.query_params.get('supplement', None)
        if supplement_id:
            queryset = queryset.filter(supplement_id=supplement_id)
        return queryset.prefetch_related('conditions', 'comments')

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response({'error': 'You can only edit your own ratings'}, status=403)
        
        instance.is_edited = True
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Check if user already rated this supplement
        existing_rating = Rating.objects.filter(
            user=self.request.user,
            supplement_id=serializer.validated_data['supplement'].id
        ).first()

        if existing_rating:
            raise serializers.ValidationError({
                'detail': 'You have already rated this supplement.'
            })

        serializer.save(user=self.request.user)

    @action(detail=True, methods=['POST'], 
            authentication_classes=[JWTAuthentication],
            permission_classes=[IsAuthenticated])
    def upvote(self, request, pk=None):
        print("REQUEST HEADERS:", request.headers)
        print("AUTH:", request.auth)
        print("AUTHENTICATORS:", request._authenticator)
        print("USER IS AUTHENTICATED:", request.user.is_authenticated)
        print("USER:", request.user.username if request.user.is_authenticated else "ANONYMOUS")
        
        try:
            rating = self.get_object()
            print("RATING FETCHED SUCCESSFULLY")
            
            # Don't allow self-upvoting
            if rating.user == request.user:
                print("SELF-UPVOTE ATTEMPT")
                return Response({'error': 'You cannot upvote your own rating'}, status=400)

            try:
                # Try to create upvote
                print("CREATING UPVOTE")
                UserUpvote.objects.create(user=request.user, rating=rating)
                rating.upvotes += 1
                rating.save()
                print("UPVOTE SUCCESSFUL")
                return Response({'upvotes': rating.upvotes})
            except IntegrityError:
                # User has already upvoted, so remove the upvote
                print("REMOVING EXISTING UPVOTE")
                UserUpvote.objects.filter(user=request.user, rating=rating).delete()
                rating.upvotes = max(0, rating.upvotes - 1)  # Ensure we don't go below 0
                rating.save()
                print("UPVOTE REMOVED SUCCESSFULLY")
                return Response({'upvotes': rating.upvotes})
        except Exception as e:
            print("ERROR IN UPVOTE:", str(e))
            return Response({'error': str(e)}, status=500)

    def check_object_permissions(self, request, obj):
        print("CHECKING OBJECT PERMISSIONS")
        print("REQUEST METHOD:", request.method)
        print("PERMISSIONS:", self.permission_classes)
        return super().check_object_permissions(request, obj)

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        return Comment.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response({'error': 'You can only edit your own comments'}, status=403)
        
        instance.is_edited = True
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['POST'], 
            authentication_classes=[JWTAuthentication],
            permission_classes=[IsAuthenticated])
    def upvote(self, request, pk=None):
        comment = self.get_object()
        
        # Don't allow self-upvoting
        if comment.user == request.user:
            return Response({'error': 'You cannot upvote your own comment'}, status=400)

        try:
            # Try to create upvote
            UserUpvote.objects.create(user=request.user, comment=comment)
            comment.upvotes += 1
            comment.save()
            return Response({'upvotes': comment.upvotes})
        except IntegrityError:
            # User has already upvoted, so remove the upvote
            UserUpvote.objects.filter(user=request.user, comment=comment).delete()
            comment.upvotes = max(0, comment.upvotes - 1)  # Ensure we don't go below 0
            comment.save()
            return Response({'upvotes': comment.upvotes})

class ConditionViewSet(viewsets.ModelViewSet):
    serializer_class = ConditionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Condition.objects.all()

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_supplements_csv(request):
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=400)
    
    try:
        df = pd.read_csv(csv_file)
        required_columns = ['name', 'category', 'dosage_unit']
        
        if not all(col in df.columns for col in required_columns):
            return Response({
                'error': f'CSV must contain columns: {", ".join(required_columns)}'
            }, status=400)
        
        with transaction.atomic():
            # Delete all existing supplements
            Supplement.objects.all().delete()
            
            # Create new supplements
            for _, row in df.iterrows():
                Supplement.objects.create(
                    name=row['name'],
                    category=row['category'],
                    dosage_unit=row['dosage_unit']
                )
        
        return Response({'message': 'Supplements uploaded successfully'})
    
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_conditions_csv(request):
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=400)
    
    try:
        df = pd.read_csv(csv_file)
        if 'name' not in df.columns:
            return Response({'error': 'CSV must contain a name column'}, status=400)
        
        with transaction.atomic():
            # Delete all existing conditions
            Condition.objects.all().delete()
            
            # Create new conditions
            for _, row in df.iterrows():
                Condition.objects.create(name=row['name'])
        
        return Response({'message': 'Conditions uploaded successfully'})
    
    except Exception as e:
        print(f"Error in upload: {str(e)}")
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def test_auth(request):
    return Response({
        'message': 'Authentication successful',
        'user': request.user.username,
        'is_staff': request.user.is_staff
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_details(request):
    return Response({
        'username': request.user.username,
        'is_staff': request.user.is_staff,
        'email': request.user.email
    })

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([RegisterRateThrottle])
def register_user(request):
    print("DEBUG: register_user CALLED")
    try:
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not password or not email:
            return Response(
                {'error': 'Username, email and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user but set as inactive
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=False
        )

        # Create verification token
        verification_token = EmailVerificationToken.objects.create(user=user)

        # Send verification email
        is_production = os.environ.get('PRODUCTION', 'False').lower() == 'true'
        domain = 'https://supplementratings.com' if is_production else 'http://localhost:5173'
        verification_url = f"{domain}/verify-email/{verification_token.token}"
        
        try:
            print("Email settings:")
            print(f"Backend: {settings.EMAIL_BACKEND}")
            print(f"Host: {settings.EMAIL_HOST}")
            print(f"Port: {settings.EMAIL_PORT}")
            print(f"TLS: {settings.EMAIL_USE_TLS}")
            print(f"User: {settings.EMAIL_HOST_USER}")
            print(f"Password length: {len(settings.EMAIL_HOST_PASSWORD)}")
            
            send_mail(
                'Verify your email',
                f'Click the following link to verify your email: {verification_url}',
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False,
            )
        except Exception as mail_error:
            # If email sending fails, delete the user and token
            user.delete()
            print(f"Detailed email error: {str(mail_error)}")
            return Response(
                {'error': f'Failed to send verification email: {str(mail_error)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'message': 'User registered successfully. Please check your email to verify your account.',
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request, token):
    try:
        verification = EmailVerificationToken.objects.get(token=token)
        
        if not verification.is_valid():
            return Response({'error': 'Verification link has expired'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        user = verification.user
        user.is_active = True
        user.save()
        
        verification.delete()
        
        return Response({'message': 'Email verified successfully'})
    except EmailVerificationToken.DoesNotExist:
        return Response({'error': 'Invalid verification token'}, 
                       status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_brands_csv(request):
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=400)
    
    try:
        df = pd.read_csv(csv_file)
        if 'name' not in df.columns:
            return Response({'error': 'CSV must contain a name column'}, status=400)
        
        with transaction.atomic():
            # Delete all existing brands
            Brand.objects.all().delete()
            
            # Create new brands
            for _, row in df.iterrows():
                Brand.objects.create(name=row['name'])
        
        return Response({'message': 'Brands uploaded successfully'})
    
    except Exception as e:
        print(f"Error in upload: {str(e)}")
        return Response({'error': str(e)}, status=400)

