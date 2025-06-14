from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from pages.views import (
    SupplementViewSet, 
    RatingViewSet, 
    CommentViewSet, 
    ConditionViewSet,
    BrandViewSet,
    upload_supplements_csv,
    upload_conditions_csv,
    upload_brands_csv,
    get_user_details,
    register_user,
    verify_email,
    PasswordResetRequestView,
    PasswordResetConfirmView
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static
from pages.throttles import AuthRateThrottle, RegisterRateThrottle

router = DefaultRouter()
router.register(r'supplements', SupplementViewSet, basename='supplement')
router.register(r'ratings', RatingViewSet, basename='rating')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'conditions', ConditionViewSet, basename='condition')
router.register(r'brands', BrandViewSet, basename='brand')

import traceback
from rest_framework.response import Response

class CustomTokenObtainPairView(TokenObtainPairView):
    #throttle_classes = [AuthRateThrottle]
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            from rest_framework_simplejwt.tokens import AccessToken
            token = response.data['access']
            user_id = AccessToken(token)['user_id']
            from django.contrib.auth.models import User
            user = User.objects.get(id=user_id)
            response.data.update({
                'is_staff': user.is_staff,
                'id': user.id,
                'username': user.username
            })
        return response
    
# class DebugTokenObtainPairView(CustomTokenObtainPairView):
#     def post(self, request, *args, **kwargs):
#         try:
#             return super().post(request, *args, **kwargs)
#         except Exception as exc:
#             tb_lines = traceback.format_exc().splitlines()
#             return Response(
#                 {"error": str(exc), "traceback": tb_lines},
#                 status=500,
#             )

# Define API URLs
api_urlpatterns = [
    path('upload-supplements-csv/', upload_supplements_csv, name='upload-supplements-csv'),
    path('upload-conditions-csv/', upload_conditions_csv, name='upload-conditions-csv'),
    path('upload-brands-csv/', upload_brands_csv, name='upload-brands-csv'),
    path('token/obtain/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/me/', get_user_details, name='user-details'),
    path('register/', register_user, name='register-user'),
    path('verify-email/<str:token>/', verify_email, name='verify-email'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('', include(router.urls)),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_urlpatterns)),
    path('', include('pages.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

