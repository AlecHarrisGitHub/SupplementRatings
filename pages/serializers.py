from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Supplement, Rating, Comment, Condition, Brand, UserUpvote, Profile
import logging
from django.conf import settings
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.db.models import Count

logger = logging.getLogger(__name__)

class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ['id', 'name']

class RegisterUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': True}
        }

    def validate_email(self, value):
        """
        Check if the email is already registered.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def create(self, validated_data):
        try:
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )
            user.first_name = validated_data.get('first_name', '')
            user.last_name = validated_data.get('last_name', '')
            user.is_active = False  # Set user to inactive until email verification
            user.save()
            return user
        except Exception as e:
            logger.error(f"Error in RegisterUserSerializer create method: {str(e)}", exc_info=True)
            raise

class CommentSerializer(serializers.ModelSerializer):
    user = 'BasicUserSerializer'
    replies = serializers.SerializerMethodField()
    is_edited = serializers.BooleanField(read_only=True)
    has_upvoted = serializers.SerializerMethodField()
    supplement_id = serializers.SerializerMethodField()
    supplement_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'rating', 'parent_comment', 'content', 
                 'created_at', 'replies', 'is_edited', 'upvotes', 'has_upvoted', 'image',
                 'supplement_id', 'supplement_name']
        read_only_fields = ['user', 'is_edited', 'upvotes', 'has_upvoted']

    def get_replies(self, obj):
        replies_queryset = Comment.objects.filter(parent_comment=obj)
        return CommentSerializer(replies_queryset, many=True, context=self.context).data

    def update(self, instance, validated_data):
        instance.is_edited = True
        instance.content = validated_data.get('content', instance.content)
        instance.save()
        return instance

    def get_has_upvoted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserUpvote.objects.filter(user=request.user, comment=obj).exists()
        return False

    def get_supplement_id(self, obj):
        if obj.rating:
            return obj.rating.supplement_id
        if obj.parent_comment and obj.parent_comment.rating:
            return obj.parent_comment.rating.supplement_id
        return None

    def get_supplement_name(self, obj):
        if obj.rating and obj.rating.supplement:
            return obj.rating.supplement.name
        if obj.parent_comment and obj.parent_comment.rating and obj.parent_comment.rating.supplement:
            return obj.parent_comment.rating.supplement.name
        return None

class BasicUserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
    chronic_conditions = serializers.SerializerMethodField()
    comments = CommentSerializer(source='comment_set', many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'profile_image_url', 'chronic_conditions', 'is_staff', 'comments']

    def get_profile_image_url(self, obj):
        request = self.context.get('request')
        # obj is User instance, so access profile via obj.profile
        if hasattr(obj, 'profile') and obj.profile.image and hasattr(obj.profile.image, 'url'):
            if request:
                return request.build_absolute_uri(obj.profile.image.url)
            return obj.profile.image.url
        
        # Fallback to default image URL
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        default_image_path = f"{media_url}profile_pics/default.jpg"
        if request:
            return request.build_absolute_uri(default_image_path)
        return default_image_path

    def get_chronic_conditions(self, obj):
        if hasattr(obj, 'profile') and hasattr(obj.profile, 'chronic_conditions'):
            conditions = obj.profile.chronic_conditions.all()
            return ConditionSerializer(conditions, many=True, context=self.context).data
        return []


class ProfileSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    chronic_conditions = ConditionSerializer(many=True, read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'image', 'image_url', 'chronic_conditions']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False}
        }

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        default_image_path = f"{media_url}profile_pics/default.jpg"
        if request:
            return request.build_absolute_uri(default_image_path)
        return f"/media/profile_pics/default.jpg"


class RatingSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    condition_names = serializers.SerializerMethodField()
    benefit_names = serializers.SerializerMethodField()
    side_effect_names = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    has_upvoted = serializers.SerializerMethodField()
    conditions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Condition.objects.all()
    )
    benefits = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Condition.objects.all(), required=False
    )
    side_effects = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Condition.objects.all(), required=False
    )
    supplement = serializers.PrimaryKeyRelatedField(queryset=Supplement.objects.all())
    supplement_display = serializers.StringRelatedField(source='supplement', read_only=True)
    image_url = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Rating
        fields = [
            'id', 'user', 'supplement', 'supplement_display', 'conditions', 
            'condition_names', 'benefits', 'benefit_names', 'side_effects', 'side_effect_names',
            'score', 'comment', 'dosage', 'dosage_frequency', 
            'frequency_unit', 'brands', 'created_at', 'comments', 'is_edited', 
            'upvotes', 'has_upvoted', 
            'image',
            'image_url',
            'comments_count'
        ]
        read_only_fields = ['user', 'upvotes', 'has_upvoted']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False}
        }

    def get_condition_names(self, obj):
        return [condition.name for condition in obj.conditions.all()]

    def get_benefit_names(self, obj):
        return [condition.name for condition in obj.benefits.all()]

    def get_side_effect_names(self, obj):
        return [condition.name for condition in obj.side_effects.all()]

    def get_image_url(self, obj):
        logger.warning(f"get_image_url: IS_PRODUCTION value: {settings.IS_PRODUCTION}")
        logger.debug(f"get_image_url: obj.image.name: {obj.image.name if obj.image else 'No image'}")

        if obj.image and hasattr(obj.image, 'name') and obj.image.name:
            if settings.IS_PRODUCTION:
                try:
                    s3_key = obj.image.name
                    # If AWS_LOCATION is used and it's not already part of obj.image.name, prepend it.
                    if settings.AWS_LOCATION and not s3_key.startswith(settings.AWS_LOCATION + '/'):
                         s3_key = f"{settings.AWS_LOCATION.strip('/')}/{s3_key.lstrip('/')}"
                    
                    logger.info(f"Calculated S3 key for presigning: {s3_key}")

                    s3_client = boto3.client(
                        's3',
                        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                        region_name=settings.AWS_S3_REGION_NAME,
                        config=Config(signature_version='s3v4')
                    )
                    
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                            'Key': s3_key  # Use the correctly prefixed key
                        },
                        ExpiresIn=settings.AWS_QUERYSTRING_EXPIRE
                    )
                    logger.info(f"Generated presigned URL: {presigned_url} for key: {s3_key}")
                    return presigned_url
                except ClientError as e:
                    logger.error(f"ClientError generating presigned URL for S3 key {s3_key}: {e}")
                    return None
                except Exception as e:
                    logger.error(f"Unexpected error generating presigned URL for S3 key {s3_key if 's3_key' in locals() else obj.image.name}: {e}", exc_info=True)
                    return None
            else:
                # Development
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
        return None

    def create(self, validated_data):
        conditions_data = validated_data.pop('conditions', [])
        benefits_data = validated_data.pop('benefits', [])
        side_effects_data = validated_data.pop('side_effects', [])
        # Image is handled by default ModelSerializer create if present in validated_data
        rating = Rating.objects.create(**validated_data)
        rating.conditions.set(conditions_data)
        rating.benefits.set(benefits_data)
        rating.side_effects.set(side_effects_data)
        return rating

    def update(self, instance, validated_data):
        # M2M fields pop first, handle them after instance save if needed or as per DRF standard M2M update
        conditions_data = validated_data.pop('conditions', None)
        benefits_data = validated_data.pop('benefits', None)
        side_effects_data = validated_data.pop('side_effects', None)
        
        # Handle image separately due to potential clear action or new upload
        # Sentinel 'UNCHANGED' means the image field was not sent by frontend or no action needed
        image_payload = validated_data.pop('image', 'UNCHANGED') 

        # Log the content of validated_data before the loop
        logger.warning(f"RatingSerializer update - validated_data before loop for instance {instance.id}: {validated_data}")

        # Iterate over the remaining validated_data for direct field updates
        # This covers score, comment, dosage, dosage_frequency, frequency_unit, brands
        for attr, value in validated_data.items():
            if attr == 'comment':
                logger.warning(f"Attempting to set instance.comment for instance {instance.id}. Current pre-set instance value: '{instance.comment}', New value from validated_data: '{value}'")
            elif attr == 'brands':
                logger.warning(f"Attempting to set instance.brands for instance {instance.id}. Current pre-set instance value: '{instance.brands}', New value from validated_data: '{value}'")
            setattr(instance, attr, value)
        
        # If dosage is being set to an empty string or None, ensure frequency and unit are also cleared
        # The model fields for frequency/unit should have null=True, blank=True
        if validated_data.get('dosage') == '' or validated_data.get('dosage') is None:
            if 'dosage' in validated_data: # ensure it was explicitly sent as empty/None
                instance.dosage_frequency = None
                instance.frequency_unit = None
        
        instance.is_edited = True

        # Handle image update action
        if image_payload != 'UNCHANGED':
            if image_payload is None or image_payload == '': # Explicitly clearing the image
                if instance.image:
                    try:
                        instance.image.delete(save=False) # save=False as instance.save() is called later
                    except Exception as e:
                        logger.error(f"Error deleting existing image for rating {instance.id}: {e}")
                instance.image = None # Set field to None
            else: # New image uploaded (image_payload is a File object)
                if instance.image: # If there's an old image, delete it first
                    try:
                        instance.image.delete(save=False)
                    except Exception as e:
                        logger.error(f"Error deleting old image for rating {instance.id} before update: {e}")
                instance.image = image_payload # Assign new image file
        
        # Save the instance before handling M2M
        instance.save()

        # Update M2M fields if data was provided for them
        if conditions_data is not None:
            instance.conditions.set(conditions_data)
        if benefits_data is not None:
            instance.benefits.set(benefits_data)
        if side_effects_data is not None:
            instance.side_effects.set(side_effects_data)
        
        # Re-save if M2M relations were updated (though .set() handles this for existing instances)
        # For clarity or if a signal receiver depends on final state after M2M:
        # instance.save() 
        return instance

    def get_has_upvoted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserUpvote.objects.filter(user=request.user, rating=obj).exists()
        return False


class SupplementSerializer(serializers.ModelSerializer):
    ratings = serializers.SerializerMethodField()
    avg_rating = serializers.FloatField(read_only=True)
    rating_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Supplement
        fields = ['id', 'name', 'category', 'dosage_unit', 'ratings', 'avg_rating', 'rating_count']

    def get_ratings(self, obj):
        # obj here is a Supplement instance
        # Annotate comments_count onto the ratings queryset
        ratings_queryset = obj.ratings.all().annotate(comments_count=Count('comments'))
        
        request = self.context.get('request')
        # Placeholder for potential future filtering of ratings based on request params
        # For example, if you want to filter ratings by certain conditions when listing them under a supplement:
        # if request:
        #     conditions_param = request.query_params.get('supplement_ratings_conditions', None)
        #     if conditions_param:
        #         condition_names = [name.strip() for name in conditions_param.split(',') if name.strip()]
        #         if condition_names:
        #             ratings_queryset = ratings_queryset.filter(conditions__name__in=condition_names).distinct()

        return RatingSerializer(ratings_queryset, many=True, context=self.context).data


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name']


class PublicRatingSerializer(RatingSerializer):
    # Explicitly define supplement_name to ensure it's correctly populated
    supplement_name = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = [
            'id', 
            'supplement',
            'supplement_name',
            'score', 
            'comment', 
            'created_at', 
            'image_url', 
            'condition_names', 
            'benefit_names', 
            'side_effect_names', 
            'dosage', 
            'dosage_frequency', 
            'frequency_unit', 
            'brands'
        ]

    def get_supplement_name(self, obj):
        if obj.supplement:
            return obj.supplement.name
        return None # Or some default like "Unknown Supplement"


class PublicProfileUserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
    # Explicitly NOT including chronic_conditions here

    class Meta:
        model = User
        fields = ['id', 'username', 'profile_image_url']

    def get_profile_image_url(self, obj):
        request = self.context.get('request')
        if hasattr(obj, 'profile') and obj.profile.image and hasattr(obj.profile.image, 'url'):
            if request:
                return request.build_absolute_uri(obj.profile.image.url)
            return obj.profile.image.url
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        default_image_path = f"{media_url}profile_pics/default.jpg"
        if request:
            return request.build_absolute_uri(default_image_path)
        return default_image_path

class PublicProfileSerializer(serializers.ModelSerializer):
    user = PublicProfileUserSerializer(source='*') 
    ratings = PublicRatingSerializer(many=True, read_only=True)
    comments = CommentSerializer(source='comment_set', many=True, read_only=True)

    class Meta:
        model = User # The public profile is for a User
        fields = ['user', 'ratings', 'comments']
