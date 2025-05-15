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
from decouple import config
from rest_framework import filters
from rest_framework.pagination import LimitOffsetPagination

# logging.warning("DEBUG: REST_FRAMEWORK_THROTTLE_RATES = %s", getattr(settings, 'REST_FRAMEWORK_THROTTLE_RATES', None))

class SupplementViewSet(viewsets.ModelViewSet):
    serializer_class = SupplementSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'category']
    ordering_fields = ['name', 'id', 'category', 'avg_rating', 'rating_count'] # avg_rating, rating_count for consumer sort

    def get_queryset(self):
        queryset = Supplement.objects.all()

        # Annotate for potential sorting/filtering, does not filter by itself.
        queryset = queryset.annotate(
            avg_rating=Avg('ratings__score'),
            rating_count=Count('ratings', distinct=True)
        )

        # Handle direct category filter
        category_param = self.request.query_params.get('category', None)
        if category_param:
            queryset = queryset.filter(category__iexact=category_param)

        # The SearchFilter will handle `?search=`, and OrderingFilter will handle `?ordering=`.
        # Specific consumer-facing filters based on rating attributes:
        conditions_search = self.request.query_params.get('conditions', None)
        brands_search = self.request.query_params.get('brands', None) # Frontend sends comma-separated string of brand names
        dosage_search = self.request.query_params.get('dosage', None)
        frequency_search = self.request.query_params.get('frequency', None)

        rating_related_query = Q()
        has_rating_filters = False

        if conditions_search:
            condition_names = conditions_search.split(',')
            rating_related_query &= Q(ratings__conditions__name__in=[name.strip() for name in condition_names])
            has_rating_filters = True
        
        if brands_search:
            brand_names = [name.strip() for name in brands_search.split(',') if name.strip()]
            if brand_names:
                brand_q_objects = Q()
                for b_name in brand_names:
                    brand_q_objects |= Q(ratings__brands__icontains=b_name)
                rating_related_query &= brand_q_objects
                has_rating_filters = True

        if dosage_search:
            rating_related_query &= Q(ratings__dosage=dosage_search)
            has_rating_filters = True
        
        if frequency_search:
            frequency_parts = frequency_search.split('_')
            if len(frequency_parts) == 2:
                rating_related_query &= Q(ratings__dosage_frequency=frequency_parts[0])
                rating_related_query &= Q(ratings__frequency_unit=frequency_parts[1])
                has_rating_filters = True

        if has_rating_filters:
            queryset = queryset.filter(rating_related_query).distinct()
        
        # If ordering is not specified in the request, DRF uses model's default ordering or PK.
        # To set a default for the consumer view:
        
        # Check if an explicit ordering or search is being applied by the filters
        # OrderingFilter.ordering_param is 'ordering' by default
        # SearchFilter.search_param is 'search' by default
        is_ordering_requested = self.request.query_params.get(filters.OrderingFilter.ordering_param, None) is not None
        is_search_requested = self.request.query_params.get(filters.SearchFilter.search_param, None) is not None

        if not is_ordering_requested and not is_search_requested and not has_rating_filters:
             # Apply default sort for the main supplement list for consumers (e.g., highest rating)
             # This will not apply if '?ordering=...' (e.g., from admin) or '?search=...' is used.
             queryset = queryset.order_by(F('avg_rating').desc(nulls_last=True), '-rating_count')

        return queryset.distinct() # Ensure distinct results

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

    def get_queryset(self):
        queryset = Rating.objects.all()
        supplement_id = self.request.query_params.get('supplement', None)
        if supplement_id:
            queryset = queryset.filter(supplement_id=supplement_id)
        return queryset.prefetch_related('conditions', 'comments')

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and not request.user.is_staff:
            return Response({'error': 'You can only edit your own ratings, unless you are an admin.'}, status=403)
        
        instance.is_edited = True
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        existing_rating = Rating.objects.filter(
            user=self.request.user,
            supplement_id=serializer.validated_data['supplement'].id
        ).first()

        if existing_rating:
            raise serializers.ValidationError({
                'detail': 'You have already rated this supplement.'
            })

        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upvote(self, request, pk=None):
        # print("REQUEST HEADERS:", request.headers)
        # print("AUTH:", request.auth)
        # print("AUTHENTICATORS:", request._authenticator)
        # print("USER IS AUTHENTICATED:", request.user.is_authenticated)
        # print("USER:", request.user.username if request.user.is_authenticated else "ANONYMOUS")
        try:
            rating = self.get_object()
            # print("RATING FETCHED SUCCESSFULLY")
            user = request.user

            if rating.user == user:
                # print("SELF-UPVOTE ATTEMPT")
                return Response({'status': 'error', 'message': 'Cannot upvote your own rating.'}, status=status.HTTP_403_FORBIDDEN)

            if rating.upvotes.filter(id=user.id).exists():
                # print("REMOVING EXISTING UPVOTE")
                rating.upvotes.remove(user)
                rating.save()
                # print("UPVOTE REMOVED SUCCESSFULLY")
                return Response({'status': 'upvote removed', 'upvotes_count': rating.upvotes.count()}, status=status.HTTP_200_OK)
            else:
                # print("CREATING UPVOTE")
                rating.upvotes.add(user)
                rating.save()
                # print("UPVOTE SUCCESSFUL")
                return Response({'status': 'upvote added', 'upvotes_count': rating.upvotes.count()}, status=status.HTTP_200_OK)
        except Exception as e:
            # print("ERROR IN UPVOTE:", str(e))
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def check_object_permissions(self, request, obj):
        # print("CHECKING OBJECT PERMISSIONS")
        # print("REQUEST METHOD:", request.method)
        # print("PERMISSIONS:", self.permission_classes)
        super().check_object_permissions(request, obj)
        if request.method not in permissions.SAFE_METHODS:
            if obj.user != request.user and not request.user.is_staff:
                self.permission_denied(
                    request, message=getattr(permissions.IsOwnerOrAdmin, 'message', None)
                )

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]
    pagination_class = LimitOffsetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'text', 'rating__supplement__name']
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
    # print("DEBUG: register_user CALLED")
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        email_subject = 'Activate Your Account'
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        # Correctly determine if running in development or production
        is_development = settings.DEBUG  # Assuming DEBUG is True for development
        
        # Construct the verification link based on environment
        if is_development:
            # Use localhost for development
            verification_link = f"http://localhost:5173/verify-email/{uid}/{token}"
        else:
            # Use production domain
            verification_link = f"https://supplementratings.com/verify-email/{uid}/{token}"

        # HTML email content
        html_message = render_to_string('email_verification.html', {
            'user': user,
            'verification_link': verification_link
        })
        plain_message = strip_tags(html_message)
        
        # print("Email settings:")
        # print(f"Backend: {settings.EMAIL_BACKEND}")
        # print(f"Host: {settings.EMAIL_HOST}")
        # print(f"Port: {settings.EMAIL_PORT}")
        # print(f"TLS: {settings.EMAIL_USE_TLS}")
        # print(f"User: {settings.EMAIL_HOST_USER}")
        # print(f"Password length: {len(settings.EMAIL_HOST_PASSWORD)}")

        try:
            send_mail(
                email_subject,
                plain_message,
                settings.EMAIL_HOST_USER,
                [user.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as mail_error:
            # print(f"Detailed email error: {str(mail_error)}")
            user.delete()  # Rollback user creation if email fails
            return Response({'error': 'Failed to send verification email.', 'details': str(mail_error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'User created. Please check your email to verify your account.'}, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

