from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompensationViewSet

router = DefaultRouter()
router.register(r'', CompensationViewSet, basename='compensation')

urlpatterns = [
    path('', include(router.urls)),
]
