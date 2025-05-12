# pages/throttles.py
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class AuthRateThrottle(UserRateThrottle):
    scope = 'auth'          # per-user throttle (e.g. login attempts)

class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'      # per-IP throttle for /api/register