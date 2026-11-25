from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StateViewSet, DistrictViewSet, LandParcelViewSet, OwnershipDocumentViewSet

router = DefaultRouter()
router.register(r'states', StateViewSet, basename='state')
router.register(r'districts', DistrictViewSet, basename='district')
router.register(r'parcels', LandParcelViewSet, basename='land-parcel')
router.register(r'documents', OwnershipDocumentViewSet, basename='ownership-document')

urlpatterns = [
    path('', include(router.urls)),
]
