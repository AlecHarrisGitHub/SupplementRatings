from rest_framework import viewsets, permissions
from .models import Supplement, Condition, Rating, Comment
from .serializers import SupplementSerializer, ConditionSerializer, RatingSerializer, CommentSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class SupplementViewSet(viewsets.ModelViewSet):
    queryset = Supplement.objects.all()
    serializer_class = SupplementSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ConditionViewSet(viewsets.ModelViewSet):
    queryset = Condition.objects.all()
    serializer_class = ConditionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
