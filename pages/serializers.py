from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Supplement, Rating, Comment, Condition


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'rating', 'content', 'created_at']


class RatingSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    condition_name = serializers.CharField(source='condition.name', read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'supplement', 'condition', 'condition_name', 
                 'score', 'comment', 'created_at', 'comments']


class SupplementSerializer(serializers.ModelSerializer):
    ratings = RatingSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(read_only=True)
    
    class Meta:
        model = Supplement
        fields = ['id', 'name', 'category', 'ratings', 'avg_rating']


class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ['id', 'name']
