from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from projects.models import AcquisitionProject, ProjectLandParcel
from land.models import LandParcel, State, District, OwnershipDocument
from compensation.models import Compensation
from approvals.models import Approval
from accounts.models import ActivityLog
from .reports import build_pdf_document

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Base querysets filtered by user role if district/state officer
        projects_qs = AcquisitionProject.objects.all()
        parcels_qs = LandParcel.objects.all()
        comp_qs = Compensation.objects.all()
        approvals_qs = Approval.objects.filter(status='Pending')

        if user.role == 'district_officer' and user.district:
            projects_qs = projects_qs.filter(district=user.district)
            parcels_qs = parcels_qs.filter(district=user.district)
            comp_qs = comp_qs.filter(land_parcel__district=user.district)
        elif user.role == 'state_officer' and user.state:
            projects_qs = projects_qs.filter(state=user.state)
            parcels_qs = parcels_qs.filter(state=user.state)
            comp_qs = comp_qs.filter(land_parcel__state=user.state)
        elif user.role == 'landowner':
            parcels_qs = parcels_qs.filter(
                Q(landowner_user=user) | Q(owner_aadhaar=user.aadhaar_number)
            )
            comp_qs = comp_qs.filter(landowner=user)
            approvals_qs = approvals_qs.filter(requested_by=user)

        # 1. High Level Statistics
        total_projects = projects_qs.count()
        total_parcels = parcels_qs.count()
        total_land_area = parcels_qs.aggregate(total=Sum('area_acres'))['total'] or 0.0
        acquired_land_area = parcels_qs.filter(acquisition_status='Acquired').aggregate(total=Sum('area_acres'))['total'] or 0.0
        pending_approvals = approvals_qs.count()

        total_compensation = comp_qs.aggregate(total=Sum('total_compensation'))['total'] or 0.0
        paid_compensation = comp_qs.filter(payment_status='Disbursed').aggregate(total=Sum('total_compensation'))['total'] or 0.0
        pending_compensation = total_compensation - paid_compensation

        delayed_projects = projects_qs.filter(
            expected_completion_date__lt=timezone.now().date()
        ).exclude(status='Completed').count()

        # 2. Project Progress List (top 6)
        project_progress = []
        for p in projects_qs[:6]:
            total_p = p.project_parcels.count()
            acq_p = p.project_parcels.filter(status='Acquired').count()
            pct = round((acq_p / total_p * 100), 1) if total_p > 0 else (100 if p.status == 'Completed' else 25)
            project_progress.append({
                'id': p.id,
                'name': p.name,
                'code': p.project_code,
                'category': p.category,
                'status': p.status,
                'progress': pct,
                'is_delayed': p.is_delayed
            })

        # 3. State-wise Statistics
        state_stats = []
        states = State.objects.all()
        for s in states:
            s_parcels = parcels_qs.filter(state=s)
            s_acres = s_parcels.aggregate(total=Sum('area_acres'))['total'] or 0.0
            s_comp = comp_qs.filter(land_parcel__state=s).aggregate(total=Sum('total_compensation'))['total'] or 0.0
            if s_parcels.count() > 0 or projects_qs.filter(state=s).count() > 0:
                state_stats.append({
                    'state': s.name,
                    'code': s.code,
                    'parcels': s_parcels.count(),
                    'acres': float(s_acres),
                    'compensation': float(s_comp),
                    'projects': projects_qs.filter(state=s).count()
                })

        # 4. Acquisition Status Distribution
        acq_distribution = [
            {'status': 'Available', 'count': parcels_qs.filter(acquisition_status='Available').count()},
            {'status': 'Under Acquisition', 'count': parcels_qs.filter(acquisition_status='In_Acquisition').count()},
            {'status': 'Acquired', 'count': parcels_qs.filter(acquisition_status='Acquired').count()},
            {'status': 'Disputed', 'count': parcels_qs.filter(acquisition_status='Disputed').count()},
        ]

        # 5. Compensation Analytics
        comp_analytics = [
            {'status': 'Disbursed (Paid)', 'amount': float(paid_compensation)},
            {'status': 'Sanctioned & Approved', 'amount': float(comp_qs.filter(payment_status='Approved').aggregate(t=Sum('total_compensation'))['t'] or 0.0)},
            {'status': 'Unprocessed Draft', 'amount': float(comp_qs.filter(payment_status='Unprocessed').aggregate(t=Sum('total_compensation'))['t'] or 0.0)},
            {'status': 'On Hold', 'amount': float(comp_qs.filter(payment_status='On_Hold').aggregate(t=Sum('total_compensation'))['t'] or 0.0)},
        ]

        # 6. Recent Activities
        logs_qs = ActivityLog.objects.all()
        if user.role == 'landowner':
            logs_qs = logs_qs.filter(user=user)
        recent_activities = [
            {
                'id': log.id,
                'user': log.user.username if log.user else 'System',
                'action': log.action,
                'details': log.details,
                'timestamp': log.timestamp.strftime('%d %b %H:%M')
            }
            for log in logs_qs[:8]
        ]

        return Response({
            'total_projects': total_projects,
            'total_parcels': total_parcels,
            'total_land_area_acres': float(total_land_area),
            'acquired_land_area_acres': float(acquired_land_area),
            'pending_approvals': pending_approvals,
            'total_compensation': float(total_compensation),
            'paid_compensation': float(paid_compensation),
            'pending_compensation': float(pending_compensation),
            'delayed_projects': delayed_projects,
            'project_progress': project_progress,
            'state_stats': state_stats,
            'acq_distribution': acq_distribution,
            'comp_analytics': comp_analytics,
            'recent_activities': recent_activities
        })


class DecisionSupportAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        
        # 1. District statistics
        districts_data = []
        for d in District.objects.select_related('state').all():
            parcels = LandParcel.objects.filter(district=d)
            if parcels.exists():
                total_area = parcels.aggregate(total=Sum('area_acres'))['total'] or 0.0
                acquired_area = parcels.filter(acquisition_status='Acquired').aggregate(total=Sum('area_acres'))['total'] or 0.0
                pending_ver = parcels.filter(verification_status='Pending').count()
                districts_data.append({
                    'district': d.name,
                    'state': d.state.name,
                    'parcels': parcels.count(),
                    'total_acres': float(total_area),
                    'acquired_acres': float(acquired_area),
                    'pending_verification': pending_ver
                })

        # 2. Automated Alerts based on predefined business rules
        alerts = []
        
        # Rule 1: Delayed Projects
        delayed_projs = AcquisitionProject.objects.filter(
            expected_completion_date__lt=today
        ).exclude(status='Completed')
        for p in delayed_projs:
            days_over = (today - p.expected_completion_date).days
            alerts.append({
                'id': f"alt-proj-{p.id}",
                'type': 'danger',
                'category': 'Project Delay',
                'title': f"Project Overdue: {p.name}",
                'message': f"Project '{p.project_code}' is {days_over} days past scheduled deadline ({p.expected_completion_date}). Current status: {p.get_status_display()}.",
                'action_label': 'Review Project',
                'link': f"/projects/{p.id}"
            })

        # Rule 2: Parcels awaiting verification
        pending_parcels_count = LandParcel.objects.filter(verification_status='Pending').count()
        if pending_parcels_count > 0:
            alerts.append({
                'id': 'alt-parcels-pending',
                'type': 'warning',
                'category': 'Verification Backlog',
                'title': f"{pending_parcels_count} Land Records Pending Verification",
                'message': f"There are {pending_parcels_count} registered land parcels awaiting district title clearance and cadastral verification.",
                'action_label': 'Verify Records',
                'link': '/document-verification'
            })

        # Rule 3: Pending Compensation Sanction
        unprocessed_comp = Compensation.objects.filter(payment_status='Unprocessed')
        if unprocessed_comp.exists():
            unproc_sum = unprocessed_comp.aggregate(t=Sum('total_compensation'))['t'] or 0.0
            alerts.append({
                'id': 'alt-comp-unprocessed',
                'type': 'warning',
                'category': 'Disbursement Pending',
                'title': f"₹{unproc_sum:,.2f} Compensation Awards Pending Sanction",
                'message': f"{unprocessed_comp.count()} compensation awards have not yet been disbursed to affected landowners.",
                'action_label': 'View Awards',
                'link': '/compensation'
            })

        # Rule 4: Critical Approvals Pending
        urgent_approvals = Approval.objects.filter(status='Pending', priority__in=['High', 'Urgent'])
        if urgent_approvals.exists():
            alerts.append({
                'id': 'alt-approvals-urgent',
                'type': 'danger',
                'category': 'Administrative Bottleneck',
                'title': f"{urgent_approvals.count()} High-Priority Approvals Pending",
                'message': f"Immediate officer sanction required on urgent acquisition and compensation files.",
                'action_label': 'Process Approvals',
                'link': '/approvals'
            })

        # 3. Actionable Recommendations (Rule Engine)
        recommendations = []
        if delayed_projs.count() > 0:
            recommendations.append({
                'priority': 'High',
                'title': 'Expedite District Award Sanctions for Overdue Projects',
                'recommendation': 'Conduct emergency coordination meeting with District Collectors of affected project corridors to fast-track possession certificates.'
            })
        if pending_parcels_count > 5:
            recommendations.append({
                'priority': 'Medium',
                'title': 'Deploy Joint Survey & Title Verification Camps',
                'recommendation': 'Deploy mobile revenue inspection teams in high-density parcels to eliminate ownership verification backlog within 14 days.'
            })
        unpaid_awards = Compensation.objects.filter(payment_status='Approved')
        if unpaid_awards.exists():
            recommendations.append({
                'priority': 'High',
                'title': 'Execute PFMS / DBT Direct Benefit Disbursals',
                'recommendation': f'{unpaid_awards.count()} awards are administratively sanctioned. Initiate simulated DBT batch execution to minimize citizen grievances.'
            })
        if not recommendations:
            recommendations.append({
                'priority': 'Low',
                'title': 'Normal Operations',
                'recommendation': 'All acquisition pipelines, verification workflows, and DBT compensation transfers are progressing within acceptable benchmarks.'
            })

        return Response({
            'districts_data': districts_data,
            'alerts': alerts,
            'recommendations': recommendations
        })


class DownloadPDFReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get('type', 'projects')
        
        if report_type == 'projects':
            projects = AcquisitionProject.objects.select_related('state', 'district').all()
            headers = ["Code", "Project Name", "Category", "State / Dist", "Status", "Target Acres", "Deadline"]
            data = [
                [
                    p.project_code,
                    p.name,
                    p.category,
                    f"{p.district.name if p.district else 'State'}, {p.state.code}",
                    p.get_status_display(),
                    f"{p.target_land_area_acres:.1f}",
                    p.expected_completion_date.strftime('%d-%m-%Y')
                ]
                for p in projects
            ]
            pdf_buffer = build_pdf_document(
                "NATIONAL ACQUISITION PROJECTS SUMMARY REPORT",
                "Summary of all active, in-progress, and completed infrastructure projects",
                headers, data,
                col_widths=[65, 125, 80, 80, 85, 50, 55]
            )
            filename = f"Acquisition_Projects_Report_{timezone.now().strftime('%Y%m%d')}.pdf"

        elif report_type == 'land_records':
            parcels = LandParcel.objects.select_related('state', 'district').all()[:60]
            headers = ["Survey #", "Owner Name", "Village & District", "Type", "Acres", "Circle Rate/Acre", "Status"]
            data = [
                [
                    p.survey_number,
                    p.owner_name,
                    f"{p.village}, {p.district.name}",
                    p.land_type,
                    f"{p.area_acres:.2f}",
                    f"Rs. {p.market_value_per_acre:,.0f}",
                    p.get_acquisition_status_display()
                ]
                for p in parcels
            ]
            pdf_buffer = build_pdf_document(
                "LAND RECORDS INVENTORY & ACQUISITION STATUS",
                "Official Cadastral and Registered Land Parcel Records",
                headers, data,
                col_widths=[65, 95, 110, 65, 45, 80, 80]
            )
            filename = f"Land_Records_Report_{timezone.now().strftime('%Y%m%d')}.pdf"

        elif report_type == 'compensation':
            comps = Compensation.objects.select_related('project', 'land_parcel', 'land_parcel__district').all()
            headers = ["Award Code", "Project", "Survey #", "Landowner", "Base Val", "Solatium (100%)", "Total Award", "Payment Status"]
            data = [
                [
                    c.compensation_code,
                    c.project.project_code,
                    c.land_parcel.survey_number,
                    c.landowner_name,
                    f"Rs.{c.base_land_value:,.0f}",
                    f"Rs.{c.solatium_amount:,.0f}",
                    f"Rs.{c.total_compensation:,.0f}",
                    c.get_payment_status_display()
                ]
                for c in comps
            ]
            pdf_buffer = build_pdf_document(
                "COMPENSATION AWARDS & DISBURSEMENT AUDIT REPORT",
                "Statutory RFCTLARR Act 2013 Compensation Determinations",
                headers, data,
                col_widths=[70, 65, 50, 80, 65, 70, 75, 65]
            )
            filename = f"Compensation_Awards_{timezone.now().strftime('%Y%m%d')}.pdf"

        elif report_type == 'approvals':
            approvals = Approval.objects.select_related('requested_by').all()
            headers = ["Approval ID", "Title", "Entity", "Stage", "Status", "Priority", "Initiator", "Date"]
            data = [
                [
                    a.approval_code,
                    a.title,
                    a.entity_type,
                    a.get_current_stage_display(),
                    a.status,
                    a.priority,
                    a.requested_by.username,
                    a.created_at.strftime('%d-%m-%Y')
                ]
                for a in approvals
            ]
            pdf_buffer = build_pdf_document(
                "ADMINISTRATIVE APPROVALS & SANCTIONS AUDIT LOG",
                "Inter-departmental approval workflow tracking",
                headers, data,
                col_widths=[65, 120, 60, 95, 50, 45, 55, 50]
            )
            filename = f"Approvals_Log_{timezone.now().strftime('%Y%m%d')}.pdf"

        else: # district_stats
            districts = District.objects.select_related('state').all()
            headers = ["District", "State", "Parcels", "Total Acres", "Acquired Acres", "Total Compensation Disbursed"]
            data = []
            for d in districts:
                parcels = LandParcel.objects.filter(district=d)
                acres = parcels.aggregate(t=Sum('area_acres'))['t'] or 0.0
                acq_acres = parcels.filter(acquisition_status='Acquired').aggregate(t=Sum('area_acres'))['t'] or 0.0
                paid_comp = Compensation.objects.filter(land_parcel__district=d, payment_status='Disbursed').aggregate(t=Sum('total_compensation'))['t'] or 0.0
                data.append([
                    d.name,
                    d.state.name,
                    str(parcels.count()),
                    f"{acres:.1f}",
                    f"{acq_acres:.1f}",
                    f"Rs. {paid_comp:,.0f}"
                ])
            pdf_buffer = build_pdf_document(
                "DISTRICT-WISE LAND ACQUISITION AUDIT REPORT",
                "Regional statistical overview of acquisitions and financial disbursement",
                headers, data,
                col_widths=[85, 85, 45, 65, 65, 120]
            )
            filename = f"District_Statistics_{timezone.now().strftime('%Y%m%d')}.pdf"

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
