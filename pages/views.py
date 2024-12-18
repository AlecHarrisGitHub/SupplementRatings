from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Avg, Case, When, FloatField, F, Value, BooleanField, Exists, OuterRef
from .models import Supplement, Rating, Comment, Condition
from .serializers import (
    SupplementSerializer, 
    RatingSerializer, 
    CommentSerializer, 
    ConditionSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
import pandas as pd
from django.db import transaction

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
                )
            ).order_by('-has_condition_rating', F('avg_rating').desc(nulls_last=True))
        else:
            queryset = queryset.annotate(
                avg_rating=Avg('ratings__score'),
                has_condition_rating=Value(True, output_field=BooleanField())
            ).order_by(F('avg_rating').desc(nulls_last=True))

        return queryset.distinct()

class RatingViewSet(viewsets.ModelViewSet):
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Rating.objects.all()

    def perform_create(self, serializer):
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

