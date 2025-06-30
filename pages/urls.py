# pages/urls.py

from django.urls import path
from .views import (
    profile_update_view, 
    ProfileImageUpdateAPIView, 
    get_user_details,
    UserChronicConditionsAPIView,
    PublicProfileRetrieveView
)

urlpatterns = [
    # URL for the Django template-based profile page
    path('profile/', profile_update_view, name='profile_page'), 
    
    # API endpoint to get current authenticated user's details
    path('api/user/me/', get_user_details, name='current_user_details'),

    # API endpoint for managing user's chronic conditions
    path('api/user/chronic-conditions/', UserChronicConditionsAPIView.as_view(), name='user_chronic_conditions_api'),

    # API endpoint for fetching a user's public profile
    path('api/profiles/<str:username>/', PublicProfileRetrieveView.as_view(), name='public_profile_retrieve'),
]