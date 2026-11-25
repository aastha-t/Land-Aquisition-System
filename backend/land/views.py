from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import State, District, LandParcel, OwnershipDocument
from .serializers import StateSerializer, DistrictSerializer, LandParcelSerializer, OwnershipDocumentSerializer
from accounts.models import Notification, ActivityLog

class StateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = State.objects.all().prefetch_related('districts')
    serializer_class = StateSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


class DistrictViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = District.objects.all().select_related('state')
    serializer_class = DistrictSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        state_id = self.request.query_params.get('state')
        if state_id:
            qs = qs.filter(state_id=state_id)
        return qs


class LandParcelViewSet(viewsets.ModelViewSet):
    queryset = LandParcel.objects.all().select_related('state', 'district', 'landowner_user', 'verified_by').prefetch_related('documents')
    serializer_class = LandParcelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        # Landowners only see their own land parcels
        if user.role == 'landowner':
            qs = qs.filter(Q(landowner_user=user) | Q(owner_aadhaar=user.aadhaar_number) | Q(owner_name__icontains=user.get_full_name() or user.username))
        elif user.role == 'district_officer' and user.district:
            qs = qs.filter(district=user.district)
        elif user.role == 'state_officer' and user.state:
            qs = qs.filter(state=user.state)

        # Filters
        state_id = self.request.query_params.get('state')
        district_id = self.request.query_params.get('district')
        acq_status = self.request.query_params.get('acquisition_status')
        ver_status = self.request.query_params.get('verification_status')
        land_type = self.request.query_params.get('land_type')
        search = self.request.query_params.get('search')

        if state_id:
            qs = qs.filter(state_id=state_id)
        if district_id:
            qs = qs.filter(district_id=district_id)
        if acq_status:
            qs = qs.filter(acquisition_status=acq_status)
        if ver_status:
            qs = qs.filter(verification_status=ver_status)
        if land_type:
            qs = qs.filter(land_type=land_type)
        if search:
            qs = qs.filter(
                Q(survey_number__icontains=search) |
                Q(owner_name__icontains=search) |
                Q(village__icontains=search) |
                Q(owner_aadhaar__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        parcel = serializer.save()
        ActivityLog.objects.create(
            user=user,
            action="Registered Land Parcel",
            details=f"Survey #{parcel.survey_number} registered in {parcel.village}, {parcel.district.name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        user = self.request.user
        parcel = serializer.save()
        ActivityLog.objects.create(
            user=user,
            action="Updated Land Parcel",
            details=f"Survey #{parcel.survey_number} updated in {parcel.village}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=True, methods=['post'], url_path='verify')
    def verify_parcel(self, request, pk=None):
        parcel = self.get_object()
        user = request.user

        # Only district officers, state officers, or national admin can verify
        if user.role not in ['district_officer', 'state_officer', 'national_admin']:
            return Response({'error': 'You do not have permission to verify land parcels.'}, status=status.HTTP_403_FORBIDDEN)

        status_decision = request.data.get('status') # 'Verified' or 'Rejected'
        remarks = request.data.get('remarks', '')

        if status_decision not in ['Verified', 'Rejected']:
            return Response({'error': 'Status must be Verified or Rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        parcel.verification_status = status_decision
        parcel.verification_remarks = remarks
        parcel.verified_by = user
        parcel.verified_at = timezone.now()
        parcel.save()

        # Notify landowner if linked
        if parcel.landowner_user:
            Notification.objects.create(
                user=parcel.landowner_user,
                title=f"Land Record {status_decision}",
                message=f"Survey #{parcel.survey_number} has been {status_decision.lower()} by {user.get_role_display()} {user.username}. Remarks: {remarks}",
                notification_type='system',
                link=f"/land-records/{parcel.id}"
            )

        ActivityLog.objects.create(
            user=user,
            action=f"Land Verification {status_decision}",
            details=f"Survey #{parcel.survey_number} set to {status_decision}. Remarks: {remarks}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(LandParcelSerializer(parcel).data)

    @action(detail=False, methods=['get'], url_path='gis-map')
    def gis_map(self, request):
        """Optimized lightweight endpoint for Leaflet map markers"""
        qs = self.get_queryset().values(
            'id', 'survey_number', 'village', 'area_acres', 'land_type',
            'latitude', 'longitude', 'owner_name', 'acquisition_status',
            'verification_status', 'district__name', 'state__name', 'market_value_per_acre'
        )
        return Response(list(qs))


class OwnershipDocumentViewSet(viewsets.ModelViewSet):
    queryset = OwnershipDocument.objects.all().select_related('land_parcel', 'uploaded_by', 'verified_by')
    serializer_class = OwnershipDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == 'landowner':
            qs = qs.filter(Q(uploaded_by=user) | Q(land_parcel__landowner_user=user))
        parcel_id = self.request.query_params.get('land_parcel')
        if parcel_id:
            qs = qs.filter(land_parcel_id=parcel_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(verification_status=status_filter)
        return qs

    def perform_create(self, serializer):
        doc = serializer.save(uploaded_by=self.request.user)
        ActivityLog.objects.create(
            user=self.request.user,
            action="Uploaded Document",
            details=f"Document '{doc.title}' uploaded for Survey #{doc.land_parcel.survey_number}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=True, methods=['post'], url_path='verify')
    def verify_document(self, request, pk=None):
        doc = self.get_object()
        user = request.user

        if user.role not in ['district_officer', 'state_officer', 'national_admin']:
            return Response({'error': 'You do not have permission to verify documents.'}, status=status.HTTP_403_FORBIDDEN)

        status_decision = request.data.get('status') # 'Approved' or 'Rejected'
        remarks = request.data.get('remarks', '')

        if status_decision not in ['Approved', 'Rejected']:
            return Response({'error': 'Status must be Approved or Rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        doc.verification_status = status_decision
        doc.remarks = remarks
        doc.verified_by = user
        doc.verified_at = timezone.now()
        doc.save()

        # Notify uploader
        if doc.uploaded_by:
            Notification.objects.create(
                user=doc.uploaded_by,
                title=f"Document {status_decision}: {doc.title}",
                message=f"Document for Survey #{doc.land_parcel.survey_number} was {status_decision.lower()}. Remarks: {remarks}",
                notification_type='system',
                link=f"/document-verification"
            )

        ActivityLog.objects.create(
            user=user,
            action=f"Document {status_decision}",
            details=f"Document '{doc.title}' for Survey #{doc.land_parcel.survey_number} marked {status_decision}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(OwnershipDocumentSerializer(doc).data)
