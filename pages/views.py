from rest_framework import viewsets, serializers
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Avg, Case, When, FloatField, F, Value, BooleanField, Exists, OuterRef, ExpressionWrapper, Count, Q
from django.db.models.functions import Round
from .models import Supplement, Rating, Comment, Condition, EmailVerificationToken
from .serializers import (
    SupplementSerializer, 
    RatingSerializer, 
    CommentSerializer, 
    ConditionSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAdminUser, AllowAny
import pandas as pd
from django.db import transaction
from rest_framework import status
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

class SupplementViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Supplement.objects.all()
        name_search = self.request.query_params.get('name', None)
        condition_search = self.request.query_params.get('condition', None)

        if name_search:
            queryset = queryset.filter(name__icontains=name_search)

        if condition_search:
            matching_supplements = queryset
            queryset = matching_supplements.annotate(
                has_condition_rating=Exists(
                    Rating.objects.filter(
                        supplement_id=OuterRef('id'),
                        condition__name__iexact=condition_search
                    )
                ),
                avg_rating=Avg(
                    Case(
                        When(
                            ratings__condition__name__iexact=condition_search,
                            then='ratings__score'
                        ),
                        default=None,
                        output_field=FloatField(),
                    )
                ),
                rating_count=Count(
                    'ratings',
                    filter=Q(ratings__condition__name__iexact=condition_search)
                )
            ).order_by('-has_condition_rating', F('avg_rating').desc(nulls_last=True))
        else:
            queryset = queryset.annotate(
                avg_rating=Avg('ratings__score'),
                rating_count=Count('ratings'),
                has_condition_rating=Value(True, output_field=BooleanField())
            ).order_by(F('avg_rating').desc(nulls_last=True))

        return queryset.distinct()

class RatingViewSet(viewsets.ModelViewSet):
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Rating.objects.all()
        supplement_id = self.request.query_params.get('supplement', None)
        if supplement_id:
            queryset = queryset.filter(supplement_id=supplement_id)
        return queryset.prefetch_related('conditions', 'comments')

    def perform_create(self, serializer):
        # Check if user already rated this supplement
        existing_rating = Rating.objects.filter(
            user=self.request.user,
            supplement_id=serializer.validated_data['supplement'].id
        ).first()

        if existing_rating:
            raise serializers.ValidationError({
                'detail': 'You have already rated this supplement. You can only rate each supplement once.'
            }, code=400)

        serializer.save(user=self.request.user)

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ConditionViewSet(viewsets.ModelViewSet):
    serializer_class = ConditionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Condition.objects.all()

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_supplements_csv(request):
    print("Auth header:", request.headers.get('Authorization'))
    print("User:", request.user)
    print("Is authenticated:", request.user.is_authenticated)
    print("Is admin:", request.user.is_staff)
    
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    if not request.user.is_staff:
        return Response({'error': 'Admin privileges required'}, status=403)
        
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=400)
    
    try:
        df = pd.read_csv(csv_file)
        required_columns = ['name', 'category']
        
        if not all(col in df.columns for col in required_columns):
            return Response({
                'error': f'CSV must contain columns: {", ".join(required_columns)}'
            }, status=400)
        
        with transaction.atomic():
            for _, row in df.iterrows():
                Supplement.objects.create(
                    name=row['name'],
                    category=row['category']
                )
        
        return Response({'message': 'Supplements uploaded successfully'})
    
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_conditions_csv(request):
    print("Received request for conditions upload")
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
def register_user(request):
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
        verification_url = f"http://localhost:5173/verify-email/{verification_token.token}"
        
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

