from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import AcquisitionProject, ProjectLandParcel
from .serializers import AcquisitionProjectSerializer, ProjectLandParcelSerializer
from land.models import LandParcel
from accounts.models import Notification, ActivityLog

class AcquisitionProjectViewSet(viewsets.ModelViewSet):
    queryset = AcquisitionProject.objects.all().select_related('state', 'district', 'assigned_officer').prefetch_related('project_parcels__land_parcel')
    serializer_class = AcquisitionProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.role == 'landowner':
            # Landowners see projects associated with their land parcels
            parcel_ids = LandParcel.objects.filter(
                Q(landowner_user=user) | Q(owner_aadhaar=user.aadhaar_number)
            ).values_list('id', flat=True)
            project_ids = ProjectLandParcel.objects.filter(land_parcel_id__in=parcel_ids).values_list('project_id', flat=True)
            qs = qs.filter(id__in=project_ids)
        elif user.role == 'district_officer' and user.district:
            qs = qs.filter(district=user.district)
        elif user.role == 'state_officer' and user.state:
            qs = qs.filter(state=user.state)

        category = self.request.query_params.get('category')
        proj_status = self.request.query_params.get('status')
        state_id = self.request.query_params.get('state')
        search = self.request.query_params.get('search')
        delayed_only = self.request.query_params.get('delayed')

        if category:
            qs = qs.filter(category=category)
        if proj_status:
            qs = qs.filter(status=proj_status)
        if state_id:
            qs = qs.filter(state_id=state_id)
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(project_code__icontains=search) |
                Q(executing_agency__icontains=search)
            )
        if delayed_only == 'true':
            qs = qs.filter(expected_completion_date__lt=timezone.now().date()).exclude(status='Completed')

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        proj = serializer.save()
        ActivityLog.objects.create(
            user=user,
            action="Created Acquisition Project",
            details=f"Project '{proj.name}' ({proj.project_code}) created by {user.username}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        user = self.request.user
        proj = serializer.save()
        ActivityLog.objects.create(
            user=user,
            action="Updated Acquisition Project",
            details=f"Project '{proj.name}' updated",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=True, methods=['get', 'post'], url_path='parcels')
    def manage_parcels(self, request, pk=None):
        project = self.get_object()

        if request.method == 'GET':
            links = project.project_parcels.select_related('land_parcel', 'land_parcel__district', 'land_parcel__state')
            serializer = ProjectLandParcelSerializer(links, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            # Associate a land parcel with this project
            parcel_id = request.data.get('land_parcel_id')
            acq_status = request.data.get('status', 'Identified')
            comp_amount = request.data.get('compensation_amount', 0.00)

            try:
                parcel = LandParcel.objects.get(id=parcel_id)
            except LandParcel.DoesNotExist:
                return Response({'error': 'Land parcel not found.'}, status=status.HTTP_404_NOT_FOUND)

            link, created = ProjectLandParcel.objects.update_or_create(
                project=project,
                land_parcel=parcel,
                defaults={
                    'status': acq_status,
                    'compensation_amount': comp_amount
                }
            )

            # Update parcel acquisition status
            parcel.acquisition_status = 'In_Acquisition' if acq_status != 'Acquired' else 'Acquired'
            parcel.save()

            ActivityLog.objects.create(
                user=request.user,
                action="Linked Parcel to Project",
                details=f"Parcel #{parcel.survey_number} linked to project {project.project_code} ({acq_status})",
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response(ProjectLandParcelSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='parcels/(?P<parcel_id>[^/.]+)')
    def remove_parcel(self, request, pk=None, parcel_id=None):
        project = self.get_object()
        try:
            link = ProjectLandParcel.objects.get(project=project, land_parcel_id=parcel_id)
            parcel = link.land_parcel
            link.delete()
            # If not associated with any other project, revert to Available
            if not ProjectLandParcel.objects.filter(land_parcel=parcel).exists():
                parcel.acquisition_status = 'Available'
                parcel.save()
            return Response({'message': 'Parcel removed from project.'}, status=status.HTTP_200_OK)
        except ProjectLandParcel.DoesNotExist:
            return Response({'error': 'Association not found.'}, status=status.HTTP_404_NOT_FOUND)
