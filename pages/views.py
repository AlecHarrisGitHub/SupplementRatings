from rest_framework import viewsets, serializers
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, IsAdminUser, AllowAny
from rest_framework import permissions
from django.db.models import Avg, Case, When, FloatField, F, Value, BooleanField, Exists, OuterRef, ExpressionWrapper, Count, Q
from django.db.models.functions import Round
from .models import Supplement, Rating, Comment, Condition, EmailVerificationToken, Brand, UserUpvote, Profile
from .serializers import (
    SupplementSerializer, 
    RatingSerializer, 
    CommentSerializer, 
    ConditionSerializer,
    BrandSerializer,
    RegisterUserSerializer,
    BasicUserSerializer,
    ProfileSerializer,
    PublicProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
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
from decouple import config
from rest_framework import filters
from rest_framework.pagination import LimitOffsetPagination
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from .forms import ProfileUpdateForm
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from rest_framework.parsers import MultiPartParser, FormParser # For file uploads
from django_filters.rest_framework import DjangoFilterBackend # Import DjangoFilterBackend
from .filters import SupplementFilter # Import your custom filter

logger = logging.getLogger(__name__) # Moved logger to module level

# Custom Ordering Filter
class CustomOrderingFilter(filters.OrderingFilter):
    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        if ordering:
            new_ordering = []
            for field in ordering:
                if field == 'avg_rating': # Ascending
                    new_ordering.append(F('avg_rating').asc(nulls_first=True))
                elif field == '-avg_rating': # Descending
                    new_ordering.append(F('avg_rating').desc(nulls_last=True))
                elif field == 'rating_count': # Ascending
                     new_ordering.append(F('rating_count').asc(nulls_last=True)) # Ensure consistent null handling for count
                elif field == '-rating_count': # Descending
                     new_ordering.append(F('rating_count').desc(nulls_last=True))
                else:
                    new_ordering.append(field)
            return new_ordering
        return ordering

# logging.warning("DEBUG: REST_FRAMEWORK_THROTTLE_RATES = %s", getattr(settings, 'REST_FRAMEWORK_THROTTLE_RATES', None))

class SupplementViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, CustomOrderingFilter]
    filterset_class = SupplementFilter # Use your custom filterset
    search_fields = ['name', 'category']
    ordering_fields = ['name', 'id', 'category', 'avg_rating', 'rating_count']

    def get_queryset(self):
        queryset = Supplement.objects.all()

        # Build a Q object for filtering ratings within annotations
        rating_aggregation_q_filter = Q()
        
        conditions_param = self.request.query_params.get('conditions', None)
        if conditions_param:
            condition_names = [name.strip() for name in conditions_param.split(',') if name.strip()]
            if condition_names:
                rating_aggregation_q_filter &= Q(ratings__conditions__name__in=condition_names)

        benefits_param = self.request.query_params.get('benefits', None)
        if benefits_param:
            benefit_names = [name.strip() for name in benefits_param.split(',') if name.strip()]
            if benefit_names:
                rating_aggregation_q_filter &= Q(ratings__benefits__name__in=benefit_names)

        side_effects_param = self.request.query_params.get('side_effects', None)
        if side_effects_param:
            side_effect_names = [name.strip() for name in side_effects_param.split(',') if name.strip()]
            if side_effect_names:
                rating_aggregation_q_filter &= Q(ratings__side_effects__name__in=side_effect_names)
        
        # Annotate with filtered aggregations
        # The `filter` argument to Avg and Count applies to the related 'ratings' queryset
        queryset = queryset.annotate(
            avg_rating=Round(
                Avg('ratings__score', 
                    filter=rating_aggregation_q_filter # This Q object filters the ratings being aggregated
                ),
                2, 
                output_field=FloatField()
            ),
            rating_count=Count(
                'ratings__id', 
                filter=rating_aggregation_q_filter, # This Q object filters the ratings being counted
                distinct=True
            )
        )
        
        is_ordering_requested = self.request.query_params.get(filters.OrderingFilter.ordering_param, None) is not None
        if not is_ordering_requested:
            queryset = queryset.order_by(F('avg_rating').desc(nulls_last=True), F('rating_count').desc(nulls_last=True), 'name')

        return queryset.distinct()

    @action(detail=False, methods=['get'])
    def categories(self, request):
        categories = Supplement.objects.values_list('category', flat=True).distinct()
        return Response(list(categories))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object() # The supplement to be deleted

        # Ensure only admins can delete - adding an explicit check here
        # or adjust permission_classes for the entire ViewSet or just this action.
        if not request.user.is_staff:
            return Response(
                {'error': 'You do not have permission to delete supplements.'},
                status=status.HTTP_403_FORBIDDEN
            )

        transfer_to_supplement_id = request.query_params.get('transfer_ratings_to_id')
        # Explicitly delete ratings if this param is true, otherwise default behavior (cascade)
        # or transfer if transfer_to_supplement_id is provided.
        delete_ratings_explicitly = request.query_params.get('delete_ratings', 'false').lower() == 'true'

        ratings_to_transfer = Rating.objects.filter(supplement=instance)
        transferred_count = 0
        skipped_due_to_conflict_count = 0
        deleted_directly_count = 0

        if transfer_to_supplement_id:
            try:
                target_supplement = Supplement.objects.get(id=transfer_to_supplement_id)
                if target_supplement == instance:
                    return Response(
                        {'error': 'Cannot transfer ratings to the same supplement.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                with transaction.atomic():
                    for rating in ratings_to_transfer:
                        # Check if the user already has a rating for the target supplement
                        if Rating.objects.filter(user=rating.user, supplement=target_supplement).exists():
                            skipped_due_to_conflict_count += 1
                            # Optionally, delete this conflicting rating from the source supplement now
                            # rating.delete() 
                            # For now, we just skip, it will be deleted when 'instance' is deleted if not transferred
                        else:
                            rating.supplement = target_supplement
                            rating.save()
                            transferred_count += 1
                    
                    instance.delete() # Delete the original supplement
                
                message = f"Supplement '{instance.name}' deleted. {transferred_count} ratings transferred to '{target_supplement.name}'."
                if skipped_due_to_conflict_count > 0:
                    message += f" {skipped_due_to_conflict_count} ratings were not transferred due to existing ratings by the same users on the target supplement and were deleted with the original supplement."
                return Response({'message': message}, status=status.HTTP_200_OK)

            except Supplement.DoesNotExist:
                return Response(
                    {'error': f'Target supplement with id {transfer_to_supplement_id} not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except IntegrityError as e: # Should be caught by the pre-check, but as a safeguard
                 logging.error(f"Integrity error during rating transfer for supplement {instance.id}: {str(e)}")
                 return Response(
                     {'error': f'A database integrity error occurred during rating transfer: {str(e)}'},
                     status=status.HTTP_400_BAD_REQUEST
                 )
            except Exception as e:
                logging.error(f"Error during rating transfer for supplement {instance.id}: {str(e)}")
                return Response(
                    {'error': f'An unexpected error occurred during rating transfer: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # If not transferring, or if delete_ratings_explicitly is true.
        # The default on_delete=models.CASCADE on Rating.supplement will handle deletion of ratings.
        # If delete_ratings_explicitly is true, it's more of a confirmation of default behavior.
        # If neither transfer nor explicit delete, it just falls through to standard delete.
        
        try:
            with transaction.atomic():
                # No specific count needed here as cascade handles it, unless we want to report
                # For clarity, we can count them before deletion if delete_ratings_explicitly is true
                if delete_ratings_explicitly: # or even if not, just to report what will happen
                    deleted_directly_count = ratings_to_transfer.count()

                instance.delete() # This will also delete related ratings due to CASCADE
            
            message = f"Supplement '{instance.name}' and its associated ratings ({deleted_directly_count if delete_ratings_explicitly else 'cascaded'}) deleted successfully."
            return Response({'message': message}, status=status.HTTP_200_OK)
        except Exception as e:
            logging.error(f"Error during supplement deletion for {instance.id}: {str(e)}")
            return Response(
                {'error': f'An unexpected error occurred during supplement deletion: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RatingViewSet(viewsets.ModelViewSet):
    serializer_class = RatingSerializer
    permission_classes = [IsOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]
    pagination_class = LimitOffsetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'supplement__name', 'comment']
    ordering_fields = ['created_at', 'updated_at', 'score', 'upvotes']

    def create(self, request, *args, **kwargs):
        logger.warning(f"request.data: {request.data}")
        logger.warning(f"request.FILES: {request.FILES}")

        # Work on a copy, never mutate request.data directly
        data = request.data.copy()
        conditions_list = data.getlist('conditions')
        logger.info(f"Initial conditions_list from data.getlist: {conditions_list}")

        if conditions_list and len(conditions_list) == 1:
            conditions_str = conditions_list[0]
            if isinstance(conditions_str, str) and ',' in conditions_str:
                logger.info(f"Splitting conditions string: '{conditions_str}'")
                processed_conditions = [pk.strip() for pk in conditions_str.split(',') if pk.strip()]
                data.setlist('conditions', processed_conditions)
                logger.info(f"Modified conditions in data: {data.getlist('conditions')}")

        # Add the file if it exists
        if 'image' in request.FILES:
            data['image'] = request.FILES['image']

        logger.warning(f"RatingViewSet create modified data: {data}")

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            logger.error(f"RatingViewSet serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        queryset = Rating.objects.all()
        supplement_id = self.request.query_params.get('supplement', None)
        if supplement_id:
            queryset = queryset.filter(supplement_id=supplement_id)
        return queryset.prefetch_related('conditions', 'comments')

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and not request.user.is_staff:
            return Response({'error': 'You can only edit your own ratings, unless you are an admin.'}, status=status.HTTP_403_FORBIDDEN)
        
        instance.is_edited = True
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        logger.info("Entering perform_create") # General entry log
        logger.debug(f"perform_create - serializer.validated_data: {serializer.validated_data}")
        logger.debug(f"perform_create - serializer.initial_data (for reference): {serializer.initial_data}")

        supplement_obj = serializer.validated_data.get('supplement')
        if not supplement_obj:
            logger.error("perform_create: Supplement object is None or missing in validated_data.")
            raise serializers.ValidationError({'detail': 'Supplement is required and was not provided or validated.'})

        existing_rating = Rating.objects.filter(
            user=self.request.user,
            supplement=supplement_obj
        ).first()

        if existing_rating:
            logger.warning(f"User {self.request.user.id} already rated supplement {supplement_obj.id}. Raising ValidationError.")
            raise serializers.ValidationError({'detail': 'You have already rated this supplement.'})

        logger.info(f"perform_create: Attempting to save rating for user {self.request.user.id} and supplement {supplement_obj.id}")
        try:
            serializer.save(user=self.request.user)
            logger.info(f"perform_create: Successfully saved rating. New rating ID: {serializer.instance.id if serializer.instance else 'Unknown'}")
        except Exception as e:
            logger.error(f"perform_create: Exception during serializer.save(): {str(e)}", exc_info=True)
            raise # Re-raise the exception to ensure it's handled by DRF and results in a 500

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upvote(self, request, pk=None):
        try:
            rating = self.get_object()
            user = request.user

            if rating.user == user:
                return Response({'status': 'error', 'message': 'Cannot upvote your own rating.'}, status=status.HTTP_403_FORBIDDEN)

            try:
                UserUpvote.objects.create(user=request.user, rating=rating)
                rating.upvotes = F('upvotes') + 1
                rating.save(update_fields=['upvotes'])
                rating.refresh_from_db()
                return Response({'status': 'upvote added', 'upvotes_count': rating.upvotes}, status=status.HTTP_200_OK)
            except IntegrityError:
                # Assumed that IntegrityError means the user has already upvoted; remove the upvote.
                UserUpvote.objects.filter(user=request.user, rating=rating).delete()
                
                # Atomically decrement, ensuring upvotes do not go below 0.
                # This update happens only if upvotes > 0.
                Rating.objects.filter(pk=rating.pk, upvotes__gt=0).update(upvotes=F('upvotes') - 1)
                
                rating.refresh_from_db() # Get the latest state of the rating
                return Response({'status': 'upvote removed', 'upvotes_count': rating.upvotes}, status=status.HTTP_200_OK)

        except Exception as e:
            # Log the full exception details for debugging
            logging.error(f"Unexpected error in RatingViewSet.upvote for rating pk {pk} by user {request.user.id if request.user else 'Unknown'}: {str(e)}", exc_info=True)
            # Return a generic error message to the client
            return Response({'status': 'error', 'message': 'An unexpected error occurred while processing your request.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_ratings(self, request):
        """
        Returns ratings made by the currently authenticated user.
        """
        user = request.user
        queryset = Rating.objects.filter(user=user).order_by('-created_at')
        
        # Paginate the queryset
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]
    pagination_class = LimitOffsetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'content', 'rating__supplement__name']
    ordering_fields = ['created_at', 'upvotes']

    def get_queryset(self):
        return Comment.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and not request.user.is_staff:
            return Response({'error': 'You can only edit your own comments, unless you are an admin.'}, status=403)
        
        instance.is_edited = True
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['POST'], 
            authentication_classes=[JWTAuthentication],
            permission_classes=[IsAuthenticated])
    def upvote(self, request, pk=None):
        comment = self.get_object()
        
        if comment.user == request.user:
            return Response({'error': 'You cannot upvote your own comment'}, status=400)

        try:
            UserUpvote.objects.create(user=request.user, comment=comment)
            comment.upvotes += 1
            comment.save()
            return Response({'upvotes': comment.upvotes})
        except IntegrityError:
            UserUpvote.objects.filter(user=request.user, comment=comment).delete()
            comment.upvotes = max(0, comment.upvotes - 1)
            comment.save()
            return Response({'upvotes': comment.upvotes})

class ConditionViewSet(viewsets.ModelViewSet):
    serializer_class = ConditionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Condition.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object() # The condition to be deleted

        if not request.user.is_staff:
            return Response(
                {'error': 'You do not have permission to delete conditions/purposes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        transfer_to_condition_id = request.query_params.get('transfer_ratings_to_condition_id')
        ratings_associated = Rating.objects.filter(conditions=instance)
        ratings_deleted_count = 0
        ratings_transferred_count = 0

        with transaction.atomic():
            if transfer_to_condition_id:
                try:
                    target_condition = Condition.objects.get(id=transfer_to_condition_id)
                    if target_condition == instance:
                        return Response(
                            {'error': 'Cannot transfer ratings to the same condition/purpose.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    for rating in ratings_associated:
                        rating.conditions.remove(instance) # Remove old condition
                        rating.conditions.add(target_condition) # Add new one (Django handles duplicates)
                        # No need to call rating.save() explicitly for M2M changes unless other fields on rating change
                        ratings_transferred_count += 1
                    
                    instance.delete() # Delete the condition itself
                    message = (
                        f"Condition/Purpose '{instance.name}' deleted. "
                        f"{ratings_transferred_count} associated ratings were transferred to '{target_condition.name}'."
                    )
                    return Response({'message': message}, status=status.HTTP_200_OK)

                except Condition.DoesNotExist:
                    return Response(
                        {'error': f'Target condition/purpose with id {transfer_to_condition_id} not found.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                except Exception as e:
                    logging.error(f"Error during condition rating transfer for {instance.id}: {str(e)}")
                    return Response(
                        {'error': f'An unexpected error occurred during rating transfer: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                # Default: Delete all ratings associated with this condition
                ratings_deleted_count = ratings_associated.count()
                ratings_associated.delete() # This deletes the Rating objects themselves
                instance.delete() # Delete the condition itself
                message = (
                    f"Condition/Purpose '{instance.name}' deleted. "
                    f"{ratings_deleted_count} associated ratings were also deleted."
                )
                return Response({'message': message}, status=status.HTTP_200_OK)

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object() # The brand to be deleted

        if not request.user.is_staff:
            return Response(
                {'error': 'You do not have permission to delete brands.'},
                status=status.HTTP_403_FORBIDDEN
            )

        replace_with_brand_id = request.query_params.get('replace_ratings_brand_with_id')
        target_brand_name_to_replace_with = None
        ratings_updated_count = 0

        if replace_with_brand_id:
            try:
                target_brand = Brand.objects.get(id=replace_with_brand_id)
                if target_brand == instance:
                    return Response(
                        {'error': 'Cannot replace brand with itself in ratings.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                target_brand_name_to_replace_with = target_brand.name
            except Brand.DoesNotExist:
                return Response(
                    {'error': f'Target brand with id {replace_with_brand_id} for replacement not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Find ratings that contain the brand name in their 'brands' CharField.
        # This is a simple substring match. Be mindful of partial matches if brand names can be substrings of others.
        # E.g., deleting "Alpha" could affect "Alpha Plus". Exact word match is harder with a simple CharField.
        # For now, we proceed with case-sensitive substring match as a starting point.
        ratings_with_brand = Rating.objects.filter(brands__icontains=instance.name)

        with transaction.atomic():
            for rating in ratings_with_brand:
                old_brands_list = [b.strip() for b in rating.brands.split(',') if b.strip()]
                new_brands_list = []
                brand_found_in_rating = False

                for b_name in old_brands_list:
                    if b_name.lower() == instance.name.lower(): # Case-insensitive comparison for removal/replacement
                        brand_found_in_rating = True
                        if target_brand_name_to_replace_with:
                            # Add the target brand name, ensuring it's not already there to avoid duplicates like "New, New"
                            if target_brand_name_to_replace_with not in new_brands_list:
                                new_brands_list.append(target_brand_name_to_replace_with)
                    else:
                        if b_name not in new_brands_list: # Avoid duplicates from original list
                             new_brands_list.append(b_name)
                
                if brand_found_in_rating:
                    rating.brands = ', '.join(new_brands_list) # Re-join with comma and space
                    rating.save()
                    ratings_updated_count += 1
            
            # After processing ratings, delete the brand instance
            instance.delete()

        message = f"Brand '{instance.name}' deleted. "
        if target_brand_name_to_replace_with:
            message += f"{ratings_updated_count} ratings had '{instance.name}' replaced with '{target_brand_name_to_replace_with}'."
        else:
            message += f"{ratings_updated_count} ratings had '{instance.name}' removed from their brand list."
        
        return Response({'message': message}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_supplements_csv(request):
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        df = pd.read_csv(csv_file)
        if df.empty:
            return Response({'error': 'The uploaded CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        required_columns = ['name', 'category'] # dosage_unit is optional
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return Response({
                'error': f'CSV must contain at least the following columns: {", ".join(missing_columns)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        supplements_created_count = 0
        supplements_updated_count = 0
        row_errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                supplement_name = row['name']
                supplement_category = row['category']
                # Use .get for optional columns, defaulting to None if not present or empty
                supplement_dosage_unit = row.get('dosage_unit') if pd.notna(row.get('dosage_unit')) else None

                if not supplement_name or pd.isna(supplement_name):
                    row_errors.append(f"Row {index+2}: Missing or invalid supplement name.")
                    continue
                if not supplement_category or pd.isna(supplement_category):
                    row_errors.append(f"Row {index+2} (Name: {supplement_name}): Missing or invalid category.")
                    continue

                try:
                    obj, created = Supplement.objects.update_or_create(
                        name=supplement_name,
                        defaults={
                            'category': supplement_category,
                            'dosage_unit': supplement_dosage_unit
                        }
                    )
                    if created:
                        supplements_created_count += 1
                    else:
                        supplements_updated_count += 1
                except IntegrityError as e:
                    # This might happen if there's a unique constraint violation not on 'name' 
                    # (though unlikely with the current Supplement model structure for this operation)
                    logging.error(f"Integrity error processing row {index+2} (Name: {supplement_name}): {str(e)}")
                    row_errors.append(f"Row {index+2} (Name: {supplement_name}): Could not process due to a database integrity issue. {str(e)}")
                except Exception as e:
                    logging.error(f"Error processing row {index+2} (Name: {supplement_name}): {str(e)}")
                    row_errors.append(f"Row {index+2} (Name: {supplement_name}): Error - {str(e)}")

        processed_successfully_count = supplements_created_count + supplements_updated_count
        response_message = (
            f"{processed_successfully_count} supplements processed. "
            f"{supplements_created_count} created, {supplements_updated_count} updated."
        )
        
        response_data = {'message': response_message}
        current_status = status.HTTP_200_OK

        if row_errors:
            response_data['row_errors'] = row_errors
            if processed_successfully_count > 0:
                current_status = status.HTTP_207_MULTI_STATUS # Partial success
            else:
                current_status = status.HTTP_400_BAD_REQUEST # All rows failed or no valid data
        
        return Response(response_data, status=current_status)
    
    except pd.errors.EmptyDataError: # Should be caught by df.empty check, but good to have
        return Response({'error': 'The uploaded CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logging.error(f"Critical error in upload_supplements_csv: {str(e)}")
        return Response({'error': f'An unexpected critical error occurred. Please check server logs.'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_conditions_csv(request):
    if not request.user.is_staff: # Ensure consistency
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        df = pd.read_csv(csv_file)
        if df.empty:
            return Response({'error': 'The uploaded CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'name' not in df.columns:
            return Response({'error': "CSV must contain a 'name' column for conditions/purposes."}, status=status.HTTP_400_BAD_REQUEST)
        
        conditions_created_count = 0
        conditions_updated_count = 0
        row_errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                condition_name = row['name']

                if not condition_name or pd.isna(condition_name):
                    row_errors.append(f"Row {index+2}: Missing or invalid condition name.")
                    continue
                
                condition_name = str(condition_name).strip()
                if not condition_name:
                    row_errors.append(f"Row {index+2}: Condition name cannot be empty after stripping whitespace.")
                    continue

                try:
                    obj, created = Condition.objects.update_or_create(
                        name=condition_name,
                        defaults={} # No other fields to update in Condition model for now
                    )
                    if created:
                        conditions_created_count += 1
                    else:
                        conditions_updated_count += 1
                except IntegrityError as e:
                    logging.error(f"Integrity error processing condition row {index+2} (Name: {condition_name}): {str(e)}")
                    row_errors.append(f"Row {index+2} (Name: {condition_name}): Could not process due to a database integrity issue. {str(e)}")
                except Exception as e:
                    logging.error(f"Error processing condition row {index+2} (Name: {condition_name}): {str(e)}")
                    row_errors.append(f"Row {index+2} (Name: {condition_name}): Error - {str(e)}")

        processed_successfully_count = conditions_created_count + conditions_updated_count
        response_message = (
            f"{processed_successfully_count} conditions/purposes processed. "
            f"{conditions_created_count} created, {conditions_updated_count} updated."
        )
        
        response_data = {'message': response_message}
        current_status_code = status.HTTP_200_OK

        if row_errors:
            response_data['row_errors'] = row_errors
            if processed_successfully_count > 0:
                current_status_code = status.HTTP_207_MULTI_STATUS
            else:
                current_status_code = status.HTTP_400_BAD_REQUEST
        
        return Response(response_data, status=current_status_code)
    
    except pd.errors.EmptyDataError:
        return Response({'error': 'The uploaded CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logging.error(f"Critical error in upload_conditions_csv: {str(e)}")
        # Ensure the status code object is used here
        return Response({'error': 'An unexpected critical error occurred. Please check server logs.'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def test_auth(request):
    return Response({"message": "Admin content"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_details(request):
    user = User.objects.prefetch_related(
        'profile__chronic_conditions',
        'comment_set__rating__supplement', # Prefetch supplement through rating
        'comment_set__parent_comment'    # Prefetch parent comment for replies
    ).get(pk=request.user.pk)
    serializer = BasicUserSerializer(user, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([RegisterRateThrottle])
def register_user(request):
    if request.method == 'POST':
        serializer = RegisterUserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # The transaction ensures that user creation and token creation are atomic.
                # If anything fails here, the transaction is rolled back.
                with transaction.atomic():
                    user = serializer.save()
                    user.is_active = False  # Deactivate account until email verification
                    user.save()
                    token = EmailVerificationToken.objects.create(user=user)

                # Email sending is outside the transaction. If it fails, the user is still created.
                try:
                    mail_subject = 'Activate your account.'
                    
                    if settings.DEBUG:
                        verification_url = f"http://localhost:5173/verify-email/{token.token}"
                    else:
                        verification_url = f"https://supplementratings.com/verify-email/{token.token}"
                        
                    message = render_to_string('email_verification.html', {
                        'user': user,
                        'verification_url': verification_url
                    })
                    send_mail(mail_subject, strip_tags(message), settings.DEFAULT_FROM_EMAIL, [user.email], html_message=message)
                    
                    # Email sent successfully
                    return Response({
                        "message": "Registration successful. Please check your email to verify your account.",
                        "user": serializer.data
                    }, status=status.HTTP_201_CREATED)

                except Exception as e:
                    # Email sending failed. Log the error but inform the user.
                    logger.error(f"Critical: User '{user.username}' created, but verification email failed to send: {e}")
                    return Response({
                        "message": "Registration was successful, but we couldn't send a verification email. Please try logging in and requesting a new verification email from your account page.",
                        "user": serializer.data
                    }, status=status.HTTP_201_CREATED) # Still return 201 so frontend shows success

            except IntegrityError:
                return Response({'error': 'A user with that username or email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error during the user and token creation transaction: {e}")
                return Response({'error': f'An unexpected error occurred during registration: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request, token):
    try:
        verification = EmailVerificationToken.objects.get(token=token)
        
        if not verification.is_valid():
            return Response(
                {'error': 'This verification link has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = verification.user
        if user.is_active:
            # If user is already active, just inform them.
            verification.delete() # Clean up the used token.
            return Response(
                {'message': 'This account has already been verified. You can log in.'},
                status=status.HTTP_200_OK
            )

        user.is_active = True
        user.save()
        verification.delete()
        
        return Response(
            {'message': 'Email verified successfully. You can now log in.'},
            status=status.HTTP_200_OK
        )
    except EmailVerificationToken.DoesNotExist:
        return Response(
            {'error': 'This verification link is invalid or has already been used. Please double-check the link or request a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in verify_email: {str(e)}", exc_info=True)
        return Response(
            {'error': 'A server error occurred during email verification. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAdminUser])
def upload_brands_csv(request):
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if 'file' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
    
    csv_file = request.FILES['file']
    if not csv_file.name.endswith('.csv'):
        return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        df = pd.read_csv(csv_file)
        if df.empty:
            return Response({'error': 'The uploaded CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'name' not in df.columns:
            return Response({'error': "CSV must contain a 'name' column for brands."}, status=status.HTTP_400_BAD_REQUEST)
        
        brands_created_count = 0
        brands_updated_count = 0
        row_errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                brand_name = row['name']

                if not brand_name or pd.isna(brand_name):
                    row_errors.append(f"Row {index+2}: Missing or invalid brand name.")
                    continue
                
                brand_name = str(brand_name).strip()
                if not brand_name:
                    row_errors.append(f"Row {index+2}: Brand name cannot be empty after stripping whitespace.")
                    continue

                try:
                    obj, created = Brand.objects.update_or_create(
                        name=brand_name,
                        defaults={} 
                    )
                    if created:
                        brands_created_count += 1
                    else:
                        brands_updated_count += 1
                except IntegrityError as e:
                    logging.error(f"Integrity error processing brand row {index+2} (Name: {brand_name}): {str(e)}")
                    row_errors.append(f"Row {index+2} (Name: {brand_name}): Could not process due to a database integrity issue. {str(e)}")
                except Exception as e:
                    logging.error(f"Error processing brand row {index+2} (Name: {brand_name}): {str(e)}")
                    row_errors.append(f"Row {index+2} (Name: {brand_name}): Error - {str(e)}")

        processed_successfully_count = brands_created_count + brands_updated_count
        response_message = (
            f"{processed_successfully_count} brands processed. "
            f"{brands_created_count} created, {brands_updated_count} updated."
        )
        
        response_data = {'message': response_message}
        current_status_code = status.HTTP_200_OK

        if row_errors:
            response_data['row_errors'] = row_errors
            if processed_successfully_count > 0:
                current_status_code = status.HTTP_207_MULTI_STATUS
            else:
                current_status_code = status.HTTP_400_BAD_REQUEST
        
        return Response(response_data, status=current_status_code)
    
    except pd.errors.EmptyDataError:
        return Response({'error': 'The uploaded CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logging.error(f"Critical error in upload_brands_csv: {str(e)}")
        return Response({'error': 'An unexpected critical error occurred. Please check server logs.'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileImageUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication] # Ensure this matches your SPA auth
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        if 'image' not in request.FILES:
            return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        profile, created = Profile.objects.get_or_create(user=request.user)
        
        # Manually update the image and save the profile
        profile.image = request.FILES['image']
        profile.save()
        
        # Return the updated profile data, including the new image URL
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication]) # Or your session auth if not using JWT for this
def profile_update_view(request):
    # This view will now primarily be for the Django template page if accessed directly (e.g. by admin)
    # For SPA, the GET request for profile data will likely go to /api/user/me/
    # and POST for image upload to ProfileImageUpdateAPIView
    profile_instance = Profile.objects.get_or_create(user=request.user)[0]

    if request.method == 'POST':
        form = ProfileUpdateForm(request.POST, request.FILES, instance=profile_instance)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile has been updated!')
            return redirect('profile') # Redirect back to the same Django template page
        # else form will be passed to render with errors
    else: # GET
        form = ProfileUpdateForm(instance=profile_instance)

    # Data for the Django template
    profile_serializer = ProfileSerializer(profile_instance, context={'request': request})
    user_serializer = BasicUserSerializer(request.user, context={'request': request})
    
    context = {
        'u_form': form, 
        'profile_data': profile_serializer.data,
        'user_data': user_serializer.data
    }
    return render(request, 'pages/profile.html', context)

class UserChronicConditionsAPIView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, *args, **kwargs):
        from .serializers import ConditionSerializer # Keep local import for now, or revert to top-level if preferred after this works
        profile = request.user.profile
        conditions = profile.chronic_conditions.all()
        serializer = ConditionSerializer(conditions, many=True, context={'request': request})
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        from .serializers import ConditionSerializer # Keep local import for now
        profile = request.user.profile
        condition_ids = request.data.get('condition_ids', [])

        if not isinstance(condition_ids, list):
            return Response({'error': 'condition_ids must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            valid_conditions = Condition.objects.filter(id__in=condition_ids)
            if len(valid_conditions) != len(set(condition_ids)):
                all_db_condition_ids = set(Condition.objects.values_list('id', flat=True))
                invalid_ids = [cid for cid in condition_ids if cid not in all_db_condition_ids]
                if invalid_ids:
                    return Response({'error': f'Invalid condition IDs provided: {invalid_ids}'}, status=status.HTTP_400_BAD_REQUEST)

            profile.chronic_conditions.set(valid_conditions)
            updated_conditions = profile.chronic_conditions.all()
            serializer = ConditionSerializer(updated_conditions, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            # Ensure logger is defined if using it here, or fall back to print
            # logger.error(f"Error updating chronic conditions for user {request.user.username}: {str(e)}")
            print(f"Error updating chronic conditions for user {request.user.username}: {str(e)}")
            return Response({'error': 'An unexpected error occurred while updating conditions.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PublicProfileRetrieveView(APIView):
    permission_classes = [AllowAny] # Publicly accessible

    def get(self, request, username, *args, **kwargs):
        try:
            # Pre-fetch related data for efficiency
            user_profile_owner = User.objects.prefetch_related(
                'profile', # For BasicUserSerializer (profile_image_url)
                'ratings__supplement', 
                'ratings__conditions', 
                'ratings__benefits',
                'ratings__side_effects',
                # Prefetch comments made by this user, and for each comment, its rating, and that rating's supplement
                'comment_set__rating__supplement', # comment_set is the default reverse accessor
                'comment_set__user', # User who made the comment (the profile owner)
                'comment_set__parent_comment' # For replies, if needed by CommentSerializer
            ).get(username__iexact=username, is_active=True) # Use iexact for case-insensitive username lookup
            
            serializer = PublicProfileSerializer(user_profile_owner, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving public profile for {username}: {str(e)}", exc_info=True)
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email__iexact=email, is_active=True)
                
                # Generate token and URL
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Construct the reset URL for the frontend
                if settings.DEBUG:
                    reset_url = f"http://localhost:5173/reset-password-confirm/{uid}/{token}/"
                else:
                    reset_url = f"https://supplementratings.com/reset-password-confirm/{uid}/{token}/"
                
                # Email content
                subject = "Password Reset Requested"
                html_message = render_to_string('password_reset_email.html', {
                    'user': user,
                    'reset_url': reset_url,
                })
                plain_message = strip_tags(html_message)

                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    html_message=html_message
                )

                return Response({"message": "If an account with that email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)

            except User.DoesNotExist:
                # Still return a success message to avoid user enumeration
                return Response({"message": "If an account with that email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Password reset email sending failed for {email}: {e}")
                # Generic error for the client
                return Response({"error": "An error occurred while trying to send the password reset email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uidb64 = serializer.validated_data['uidb64']
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']

            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None

            if user is not None and default_token_generator.check_token(user, token):
                user.set_password(password)
                user.save()
                return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "The reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

