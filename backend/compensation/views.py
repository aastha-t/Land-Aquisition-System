import uuid
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum

from .models import Compensation
from .serializers import CompensationSerializer
from land.models import LandParcel
from projects.models import AcquisitionProject, ProjectLandParcel
from accounts.models import Notification, ActivityLog

class CompensationViewSet(viewsets.ModelViewSet):
    queryset = Compensation.objects.all().select_related('project', 'land_parcel', 'land_parcel__district', 'land_parcel__state', 'landowner')
    serializer_class = CompensationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.role == 'landowner':
            qs = qs.filter(
                Q(landowner=user) |
                Q(land_parcel__landowner_user=user) |
                Q(land_parcel__owner_aadhaar=user.aadhaar_number)
            )
        elif user.role == 'district_officer' and user.district:
            qs = qs.filter(land_parcel__district=user.district)
        elif user.role == 'state_officer' and user.state:
            qs = qs.filter(land_parcel__state=user.state)

        project_id = self.request.query_params.get('project')
        pay_status = self.request.query_params.get('payment_status')
        app_status = self.request.query_params.get('approval_status')
        search = self.request.query_params.get('search')

        if project_id:
            qs = qs.filter(project_id=project_id)
        if pay_status:
            qs = qs.filter(payment_status=pay_status)
        if app_status:
            qs = qs.filter(approval_status=app_status)
        if search:
            qs = qs.filter(
                Q(compensation_code__icontains=search) |
                Q(landowner_name__icontains=search) |
                Q(land_parcel__survey_number__icontains=search) |
                Q(project__name__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        comp = serializer.save()
        # Update associated ProjectLandParcel compensation amount if link exists
        ProjectLandParcel.objects.filter(
            project=comp.project,
            land_parcel=comp.land_parcel
        ).update(
            compensation_amount=comp.total_compensation,
            status='Compensation_Determined'
        )

        ActivityLog.objects.create(
            user=self.request.user,
            action="Calculated Compensation Award",
            details=f"Award {comp.compensation_code} generated for ₹{comp.total_compensation:,.2f} to {comp.landowner_name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    @action(detail=False, methods=['post'], url_path='calculate-preview')
    def calculate_preview(self, request):
        """Preview calculation without saving to DB"""
        area_acres = float(request.data.get('land_area_acres', 0))
        rate = float(request.data.get('valuation_rate_per_acre', 0))
        solatium_pct = float(request.data.get('solatium_percentage', 100))
        asset_comp = float(request.data.get('asset_compensation', 0))
        rehab = float(request.data.get('rehabilitation_allowance', 0))

        base = round(area_acres * rate, 2)
        solatium = round(base * (solatium_pct / 100.0), 2)
        total = round(base + solatium + asset_comp + rehab, 2)

        return Response({
            'land_area_acres': area_acres,
            'valuation_rate_per_acre': rate,
            'base_land_value': base,
            'solatium_percentage': solatium_pct,
            'solatium_amount': solatium,
            'asset_compensation': asset_comp,
            'rehabilitation_allowance': rehab,
            'total_compensation': total
        })

    @action(detail=True, methods=['post'], url_path='disburse')
    def disburse_payment(self, request, pk=None):
        """Simulate direct benefit transfer (DBT) disbursement"""
        comp = self.get_object()
        user = request.user

        if user.role not in ['district_officer', 'state_officer', 'national_admin']:
            return Response({'error': 'You do not have permission to disburse compensation.'}, status=status.HTTP_403_FORBIDDEN)

        if comp.payment_status == 'Disbursed':
            return Response({'error': 'Compensation has already been disbursed.'}, status=status.HTTP_400_BAD_REQUEST)

        utr_ref = f"PFMS-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        comp.payment_status = 'Disbursed'
        comp.approval_status = 'Approved'
        comp.disbursement_date = timezone.now().date()
        comp.transaction_reference = utr_ref
        remarks = request.data.get('remarks', 'Simulated DBT direct bank transfer successfully completed.')
        comp.remarks = remarks
        comp.save()

        # Update ProjectLandParcel status to Acquired
        ProjectLandParcel.objects.filter(
            project=comp.project,
            land_parcel=comp.land_parcel
        ).update(status='Acquired')

        # Update parcel status
        comp.land_parcel.acquisition_status = 'Acquired'
        comp.land_parcel.save()

        # Notify landowner
        if comp.landowner:
            Notification.objects.create(
                user=comp.landowner,
                title="Compensation Disbursed (PFMS/DBT)",
                message=f"Compensation of ₹{comp.total_compensation:,.2f} for Survey #{comp.land_parcel.survey_number} has been transferred to your registered account. Ref: {utr_ref}",
                notification_type='compensation',
                link="/compensation"
            )

        ActivityLog.objects.create(
            user=user,
            action="Disbursed Compensation (Simulated DBT)",
            details=f"Disbursed ₹{comp.total_compensation:,.2f} for {comp.compensation_code} to {comp.landowner_name} (UTR: {utr_ref})",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(CompensationSerializer(comp).data)
