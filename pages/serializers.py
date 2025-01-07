from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Supplement, Rating, Comment, Condition


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_edited = serializers.BooleanField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'rating', 'parent_comment', 'content', 'created_at', 'replies', 'is_edited']
        read_only_fields = ['user', 'is_edited']

    def get_replies(self, obj):
        replies = Comment.objects.filter(parent_comment=obj)
        return CommentSerializer(replies, many=True).data

    def update(self, instance, validated_data):
        instance.is_edited = True
        instance.content = validated_data.get('content', instance.content)
        instance.save()
        return instance


class RatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    condition_names = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'supplement', 'conditions', 'condition_names', 'score', 'comment', 'created_at', 'comments', 'is_edited']
        read_only_fields = ['user']

    def get_condition_names(self, obj):
        return [condition.name for condition in obj.conditions.all()]

    def create(self, validated_data):
        conditions = validated_data.pop('conditions', [])
        rating = Rating.objects.create(**validated_data)
        rating.conditions.set(conditions)
        return rating


class SupplementSerializer(serializers.ModelSerializer):
    ratings = RatingSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(read_only=True)
    rating_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Supplement
        fields = ['id', 'name', 'category', 'ratings', 'avg_rating', 'rating_count']


class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ['id', 'name']
