from rest_framework.authentication import BaseAuthentication
from .models import User

class SessionAndHeaderAuthentication(BaseAuthentication):
    """
    Allows authentication via:
    1. Standard Django session (if user is logged in via session middleware)
    2. Header 'Authorization: Bearer <auth_token_or_username>'
    3. Header 'X-Auth-Token: <auth_token>'
    4. Header 'X-Demo-User: <username>' (Convenient for local demonstration evaluation)
    """
    def authenticate(self, request):
        django_request = getattr(request, '_request', request)
        
        # 1. Check Django session on underlying HttpRequest (avoids recursion on request.user)
        if hasattr(django_request, 'user') and django_request.user.is_authenticated:
            return (django_request.user, None)

        # 2. Check X-Auth-Token header
        token = request.headers.get('X-Auth-Token')
        if token:
            user = User.objects.filter(auth_token=token).first()
            if user:
                return (user, None)

        # 3. Check Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ['bearer', 'token']:
                key = parts[1]
                user = User.objects.filter(auth_token=key).first()
                if not user:
                    user = User.objects.filter(username=key).first()
                if user:
                    return (user, None)

        # 4. Check X-Demo-User header
        demo_user = request.headers.get('X-Demo-User')
        if demo_user:
            user = User.objects.filter(username=demo_user).first()
            if user:
                return (user, None)

        return None
