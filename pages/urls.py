from django.urls import path, include
from rest_framework import routers
from .views import SupplementViewSet, ConditionViewSet, RatingViewSet, CommentViewSet

router = routers.DefaultRouter()
router.register(r'supplements', SupplementViewSet)
router.register(r'conditions', ConditionViewSet)
router.register(r'ratings', RatingViewSet)
router.register(r'comments', CommentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
