from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Supplement, Rating, Comment, Condition, Brand, UserUpvote
import logging
from django.conf import settings
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

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


class BasicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class CommentSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_edited = serializers.BooleanField(read_only=True)
    has_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'rating', 'parent_comment', 'content', 
                 'created_at', 'replies', 'is_edited', 'upvotes', 'has_upvoted', 'image']
        read_only_fields = ['user', 'is_edited', 'upvotes', 'has_upvoted']

    def get_replies(self, obj):
        replies = Comment.objects.filter(parent_comment=obj)
        return CommentSerializer(replies, many=True, context=self.context).data

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


class RatingSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    condition_names = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    has_upvoted = serializers.SerializerMethodField()
    conditions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Condition.objects.all()
    )
    supplement = serializers.PrimaryKeyRelatedField(queryset=Supplement.objects.all())
    supplement_display = serializers.StringRelatedField(source='supplement', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = [
            'id', 'user', 'supplement', 'supplement_display', 'conditions', 
            'condition_names', 'score', 'comment', 'dosage', 'dosage_frequency', 
            'frequency_unit', 'brands', 'created_at', 'comments', 'is_edited', 
            'upvotes', 'has_upvoted', 
            'image',
            'image_url'
        ]
        read_only_fields = ['user', 'upvotes', 'has_upvoted']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False}
        }

    def get_condition_names(self, obj):
        return [condition.name for condition in obj.conditions.all()]

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
        rating = Rating.objects.create(**validated_data)
        rating.conditions.set(conditions_data)
        return rating

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
        ratings_queryset = obj.ratings.all()
        return RatingSerializer(ratings_queryset, many=True, context=self.context).data


class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ['id', 'name']


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name']
