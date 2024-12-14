from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Supplement, Condition, Rating, Comment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class SupplementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplement
        fields = ['id', 'name', 'description']

class ConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Condition
        fields = ['id', 'name']

class RatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    supplement = SupplementSerializer(read_only=True)
    condition = ConditionSerializer(read_only=True)
    supplement_id = serializers.PrimaryKeyRelatedField(queryset=Supplement.objects.all(), source='supplement', write_only=True)
    condition_id = serializers.PrimaryKeyRelatedField(queryset=Condition.objects.all(), source='condition', write_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'user', 'supplement', 'condition', 'rating', 'review', 'created_at', 'supplement_id', 'condition_id']

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'rating', 'parent', 'content', 'created_at', 'replies']

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True).data
        return []
