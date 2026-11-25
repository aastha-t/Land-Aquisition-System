from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Grievance
from .serializers import GrievanceSerializer
from accounts.models import Notification, ActivityLog

class GrievanceViewSet(viewsets.ModelViewSet):
    queryset = Grievance.objects.all().select_related('landowner', 'land_parcel', 'project', 'resolved_by')
    serializer_class = GrievanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.role == 'landowner':
            qs = qs.filter(landowner=user)
        elif user.role == 'district_officer' and user.district:
            qs = qs.filter(
                Q(land_parcel__district=user.district) |
                Q(project__district=user.district) |
                Q(landowner__district=user.district) |
                Q(land_parcel__isnull=True, project__isnull=True)
            )
        elif user.role == 'state_officer' and user.state:
            qs = qs.filter(
                Q(land_parcel__state=user.state) |
                Q(project__state=user.state) |
                Q(landowner__state=user.state) |
                Q(land_parcel__isnull=True, project__isnull=True)
            )

        status_filter = self.request.query_params.get('status')
        category_filter = self.request.query_params.get('category')
        search = self.request.query_params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if category_filter:
            qs = qs.filter(category=category_filter)
        if search:
            qs = qs.filter(
                Q(grievance_code__icontains=search) |
                Q(subject__icontains=search) |
                Q(description__icontains=search) |
                Q(landowner__username__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        grv = serializer.save(landowner=user)
        ActivityLog.objects.create(
            user=user,
            action="Submitted Grievance",
            details=f"Grievance {grv.grievance_code} logged: '{grv.subject}'",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_grievance_status(self, request, pk=None):
        grv = self.get_object()
        user = request.user

        if user.role == 'landowner':
            return Response({'error': 'Landowners cannot modify grievance administrative status.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        remarks = request.data.get('remarks', '')

        valid_statuses = ['Under_Review', 'Action_Taken', 'Resolved', 'Closed']
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Allowed: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)

        grv.status = new_status
        grv.resolution_remarks = remarks
        if new_status in ['Resolved', 'Closed']:
            grv.resolved_by = user
            grv.resolved_at = timezone.now()
        grv.save()

        # Notify landowner
        Notification.objects.create(
            user=grv.landowner,
            title=f"Grievance Update: {grv.grievance_code}",
            message=f"Your grievance '{grv.subject}' is now marked as {new_status}. Officer Remarks: {remarks}",
            notification_type='grievance',
            link="/grievances"
        )

        ActivityLog.objects.create(
            user=user,
            action=f"Updated Grievance {new_status}",
            details=f"Grievance {grv.grievance_code} status set to {new_status} by {user.username}. Remarks: {remarks}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(GrievanceSerializer(grv).data)
