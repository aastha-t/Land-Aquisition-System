from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Approval, ApprovalHistory
from .serializers import ApprovalSerializer
from accounts.models import User, Notification, ActivityLog

class ApprovalViewSet(viewsets.ModelViewSet):
    queryset = Approval.objects.all().select_related('requested_by').prefetch_related('history__action_by')
    serializer_class = ApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]

    STAGE_ORDER = [
        'department_officer',
        'district_officer',
        'state_officer',
        'national_admin'
    ]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.role == 'landowner':
            # Landowners only see requests they submitted or are directly related to
            return qs.filter(requested_by=user)

        # Filters
        entity_type = self.request.query_params.get('entity_type')
        status_filter = self.request.query_params.get('status')
        stage_filter = self.request.query_params.get('stage')
        pending_my_role = self.request.query_params.get('pending_my_role')

        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if stage_filter:
            qs = qs.filter(current_stage=stage_filter)
        if pending_my_role == 'true':
            qs = qs.filter(status='Pending', current_stage=user.role)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        
        # Determine initial target stage based on creator role
        if user.role == 'department_officer':
            initial_stage = 'district_officer'
        elif user.role == 'district_officer':
            initial_stage = 'state_officer'
        elif user.role == 'state_officer':
            initial_stage = 'national_admin'
        else:
            initial_stage = 'district_officer'

        approval = serializer.save(
            requested_by=user,
            current_stage=initial_stage,
            status='Pending'
        )

        ApprovalHistory.objects.create(
            approval=approval,
            action_by=user,
            stage=initial_stage,
            action='Submitted',
            remarks=approval.details_summary or f"Approval request initiated by {user.get_role_display()} {user.username}"
        )

        # Notify officers in the initial stage
        target_officers = User.objects.filter(role=initial_stage)
        for officer in target_officers:
            Notification.objects.create(
                user=officer,
                title=f"New Approval Required: {approval.approval_code}",
                message=f"Request '{approval.title}' has been submitted for your sanction.",
                notification_type='approval',
                link="/approvals"
            )

        ActivityLog.objects.create(
            user=user,
            action="Submitted Approval Request",
            details=f"Created approval {approval.approval_code}: '{approval.title}' forwarded to {initial_stage}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=True, methods=['post'], url_path='process')
    def process_approval(self, request, pk=None):
        approval = self.get_object()
        user = request.user
        decision = request.data.get('decision') # 'approve' or 'reject'
        remarks = request.data.get('remarks', '')

        if approval.status != 'Pending':
            return Response({'error': f'This request is already marked as {approval.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        # Permission check: User must match current stage or be national_admin
        allowed = (user.role == approval.current_stage) or (user.role == 'national_admin')
        if not allowed:
            return Response({
                'error': f'You are a {user.get_role_display()}, but this request is currently at {approval.get_current_stage_display()} stage.'
            }, status=status.HTTP_403_FORBIDDEN)

        if decision == 'reject':
            approval.status = 'Rejected'
            approval.current_stage = 'rejected'
            approval.save()

            ApprovalHistory.objects.create(
                approval=approval,
                action_by=user,
                stage='rejected',
                action='Rejected',
                remarks=remarks or f"Rejected by {user.get_role_display()} {user.username}"
            )

            # Notify requester
            Notification.objects.create(
                user=approval.requested_by,
                title=f"Approval Rejected: {approval.approval_code}",
                message=f"Your request '{approval.title}' was rejected by {user.get_role_display()} {user.username}. Remarks: {remarks}",
                notification_type='approval',
                link="/approvals"
            )

            ActivityLog.objects.create(
                user=user,
                action="Rejected Approval Request",
                details=f"{approval.approval_code} rejected by {user.username}. Remarks: {remarks}",
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response(ApprovalSerializer(approval).data)

        elif decision == 'approve':
            # Progress stage:
            # department_officer -> district_officer -> state_officer -> national_admin -> approved
            next_stage_map = {
                'department_officer': 'district_officer',
                'district_officer': 'state_officer',
                'state_officer': 'national_admin',
                'national_admin': 'approved'
            }

            # If national admin is approving, they can grant final approval immediately
            if user.role == 'national_admin':
                next_stage = 'approved'
            else:
                next_stage = next_stage_map.get(approval.current_stage, 'approved')

            if next_stage == 'approved':
                approval.status = 'Approved'
                approval.current_stage = 'approved'
                approval.save()

                ApprovalHistory.objects.create(
                    approval=approval,
                    action_by=user,
                    stage='approved',
                    action='Final_Approved',
                    remarks=remarks or f"Final clearance granted by {user.get_role_display()} {user.username}"
                )

                # Notify requester
                Notification.objects.create(
                    user=approval.requested_by,
                    title=f"Approval Granted: {approval.approval_code}",
                    message=f"Final sanction granted for '{approval.title}'. Remarks: {remarks}",
                    notification_type='approval',
                    link="/approvals"
                )
            else:
                approval.current_stage = next_stage
                approval.save()

                ApprovalHistory.objects.create(
                    approval=approval,
                    action_by=user,
                    stage=next_stage,
                    action='Approved_And_Forwarded',
                    remarks=remarks or f"Approved and escalated to {next_stage} by {user.get_role_display()} {user.username}"
                )

                # Notify next stage officers
                next_officers = User.objects.filter(role=next_stage)
                for officer in next_officers:
                    Notification.objects.create(
                        user=officer,
                        title=f"Approval Escalated: {approval.approval_code}",
                        message=f"Request '{approval.title}' forwarded for your review and clearance.",
                        notification_type='approval',
                        link="/approvals"
                    )

            ActivityLog.objects.create(
                user=user,
                action="Processed Approval",
                details=f"{approval.approval_code} transitioned to {approval.current_stage} by {user.username}",
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response(ApprovalSerializer(approval).data)
        else:
            return Response({'error': "Decision must be 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)
