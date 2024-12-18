from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from pages.views import (
    SupplementViewSet, 
    RatingViewSet, 
    CommentViewSet, 
    ConditionViewSet,
    upload_supplements_csv,
    upload_conditions_csv,
    get_user_details
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'supplements', SupplementViewSet, basename='supplement')
router.register(r'ratings', RatingViewSet, basename='rating')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'conditions', ConditionViewSet, basename='condition')

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.data['is_staff'] = request.user.is_staff
        return response

# Define API URLs
api_urlpatterns = [
    path('upload-supplements-csv/', upload_supplements_csv, name='upload-supplements-csv'),
    path('upload-conditions-csv/', upload_conditions_csv, name='upload-conditions-csv'),
    path('token/obtain/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/me/', get_user_details, name='user-details'),
    path('', include(router.urls)),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_urlpatterns)),  # All API routes under /api/
    path('api-auth/', include('rest_framework.urls')),
]

