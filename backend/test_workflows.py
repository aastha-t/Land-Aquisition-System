import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from land.models import State, District, LandParcel, OwnershipDocument
from projects.models import AcquisitionProject, ProjectLandParcel
from compensation.models import Compensation
from approvals.models import Approval
from grievances.models import Grievance

User = get_user_model()

def run_tests():
    print("==================================================")
    print("STARTING COMPREHENSIVE LAND ACQUISITION SYSTEM TESTS")
    print("==================================================")

    client = APIClient()

    # 1. Test Demo Logins
    demo_roles = ['admin', 'state_officer', 'district_officer', 'dept_officer', 'landowner']
    for role in demo_roles:
        res = client.post('/api/accounts/login/', {'username': role, 'password': 'password123'}, format='json')
        assert res.status_code == 200, f"Login failed for {role}: {res.data}"
        assert 'token' in res.data, f"Token missing for {role}"
        print(f"[PASS] Login verified for role '{role}' ({res.data['user']['role_display']})")

    # 2. Test Dashboard Stats
    client.login(username='admin', password='password123')
    res = client.get('/api/analytics/dashboard/')
    assert res.status_code == 200, f"Dashboard stats failed: {res.data}"
    d = res.data
    assert d['total_projects'] >= 5, "Projects count mismatch"
    assert d['total_parcels'] >= 20, "Parcels count mismatch"
    assert d['total_land_area_acres'] > 0, "Land area mismatch"
    assert d['total_compensation'] > 0, "Compensation mismatch"
    assert len(d['project_progress']) > 0, "Project progress list empty"
    assert len(d['state_stats']) > 0, "State stats list empty"
    print(f"[PASS] Dashboard API verified: {d['total_projects']} projects, {d['total_parcels']} parcels, {d['total_land_area_acres']} acres, ₹{d['total_compensation']:,.2f} compensation.")

    # 3. Test Decision Support Analytics & Alerts
    res = client.get('/api/analytics/decision-support/')
    assert res.status_code == 200, f"Decision support failed: {res.data}"
    ds = res.data
    assert len(ds['alerts']) > 0, "Expected automated alerts to be generated"
    assert len(ds['recommendations']) > 0, "Expected recommendations to be generated"
    print(f"[PASS] Decision Support verified: {len(ds['alerts'])} alerts and {len(ds['recommendations'])} heuristic recommendations generated.")

    # 4. Test GIS Map Markers
    res = client.get('/api/land/parcels/gis-map/')
    assert res.status_code == 200, f"GIS Map markers failed: {res.data}"
    markers = res.data
    assert len(markers) >= 20, "GIS markers count mismatch"
    assert 'latitude' in markers[0] and 'longitude' in markers[0], "Coordinates missing from marker"
    print(f"[PASS] Interactive GIS Map API verified: {len(markers)} markers loaded with coordinates and acquisition statuses.")

    # 5. Test Land Parcel Registration
    import uuid
    uid = uuid.uuid4().hex[:5].upper()
    state = State.objects.first()
    district = District.objects.filter(state=state).first()
    new_parcel_data = {
        'survey_number': f'TEST-{uid}/1',
        'state': state.id,
        'district': district.id,
        'village': 'Test Village',
        'sub_division_taluk': 'Test Taluk',
        'area_acres': '3.500',
        'land_type': 'Agricultural',
        'market_value_per_acre': '3000000.00',
        'latitude': '18.600000',
        'longitude': '73.900000',
        'owner_name': 'Test Landowner Kumar',
        'owner_contact': '+91-9876543210',
        'owner_aadhaar': '1111-2222-3333',
    }
    res = client.post('/api/land/parcels/', new_parcel_data, format='json')
    assert res.status_code == 201, f"Parcel creation failed: {res.data}"
    new_parcel_id = res.data['id']
    print(f"[PASS] Land Parcel Registration verified: Created parcel #{res.data['survey_number']} with ID {new_parcel_id}")

    # 6. Test Title Verification
    res = client.post(f'/api/land/parcels/{new_parcel_id}/verify/', {
        'status': 'Verified',
        'remarks': 'Test revenue title clearance verified successfully.'
    }, format='json')
    assert res.status_code == 200, f"Title verification failed: {res.data}"
    assert res.data['verification_status'] == 'Verified', "Verification status didn't update"
    print(f"[PASS] Parcel Title Verification verified: Status is '{res.data['verification_status']}'")

    # 7. Test Acquisition Project Creation & Parcel Linkage
    new_project_data = {
        'name': 'Test National Expressway Bypass Corridor',
        'project_code': f'TEST-EXP-{uid}',
        'category': 'Highway',
        'description': 'Test project for validation',
        'state': state.id,
        'district': district.id,
        'executing_agency': 'NHAI Test Wing',
        'target_land_area_acres': '50.0',
        'estimated_budget': '100000000.00',
        'expected_completion_date': '2027-12-31',
    }
    res = client.post('/api/projects/', new_project_data, format='json')
    assert res.status_code == 201, f"Project creation failed: {res.data}"
    new_proj_id = res.data['id']
    print(f"[PASS] Project Creation verified: '{res.data['name']}' ({res.data['project_code']})")

    # Link parcel to project
    res = client.post(f'/api/projects/{new_proj_id}/parcels/', {
        'land_parcel_id': new_parcel_id,
        'status': 'Approved_For_Acquisition',
        'compensation_amount': '21000000.00'
    }, format='json')
    assert res.status_code == 201, f"Parcel linkage failed: {res.data}"
    print(f"[PASS] Project-Parcel Linkage verified: Parcel #{new_parcel_data['survey_number']} linked to {new_project_data['project_code']}")

    # 8. Test Statutory Compensation Calculation & Simulated DBT Disbursement
    comp_data = {
        'project': new_proj_id,
        'land_parcel': new_parcel_id,
        'landowner_name': 'Test Landowner Kumar',
        'land_area_acres': '3.500',
        'valuation_rate_per_acre': '3000000.00',
        'solatium_percentage': '100.00',
        'asset_compensation': '200000.00',
        'rehabilitation_allowance': '500000.00',
        'remarks': 'Test award determination under RFCTLARR Section 30'
    }
    res = client.post('/api/compensation/', comp_data, format='json')
    assert res.status_code == 201, f"Compensation creation failed: {res.data}"
    comp_id = res.data['id']
    expected_total = (3.5 * 3000000 * 2) + 200000 + 500000 # 21,700,000
    assert float(res.data['total_compensation']) == expected_total, f"Formula mismatch: got {res.data['total_compensation']}, expected {expected_total}"
    print(f"[PASS] Statutory Compensation Calculation verified: Total award = ₹{float(res.data['total_compensation']):,.2f} (Base + 100% Solatium + Assets + R&R)")

    # Test Simulated DBT Disbursement
    res = client.post(f'/api/compensation/{comp_id}/disburse/', {
        'remarks': 'Simulated DBT batch execution completed.'
    }, format='json')
    assert res.status_code == 200, f"DBT Disbursement failed: {res.data}"
    assert res.data['payment_status'] == 'Disbursed', "Payment status not updated to Disbursed"
    assert res.data['transaction_reference'].startswith('PFMS-'), "PFMS reference format error"
    print(f"[PASS] Simulated PFMS DBT Disbursement verified: UTR Reference = {res.data['transaction_reference']}, Status = {res.data['payment_status']}")

    # 9. Test Multi-Stage Approval Workflow
    client.login(username='dept_officer', password='password123')
    app_data = {
        'title': 'Test Section 6 Declaration Approval',
        'entity_type': 'Project',
        'entity_id': new_proj_id,
        'entity_name': 'Project TEST-EXP-2026-99',
        'details_summary': 'Gazette publication clearance request',
        'priority': 'High'
    }
    res = client.post('/api/approvals/', app_data, format='json')
    assert res.status_code == 201, f"Approval submission failed: {res.data}"
    app_id = res.data['id']
    assert res.data['current_stage'] == 'district_officer', f"Expected district_officer initial stage, got {res.data['current_stage']}"
    print(f"[PASS] Approval Initiated by Department Officer: Code = {res.data['approval_code']}, Next Stage = {res.data['current_stage']}")

    # Progress: District Officer Approves
    client.login(username='district_officer', password='password123')
    res = client.post(f'/api/approvals/{app_id}/process/', {'decision': 'approve', 'remarks': 'Collectorate sanction granted.'}, format='json')
    assert res.status_code == 200, f"District approval failed: {res.data}"
    assert res.data['current_stage'] == 'state_officer', f"Expected state_officer, got {res.data['current_stage']}"
    print(f"[PASS] District Collector Sanctioned & Forwarded to: {res.data['current_stage']}")

    # Progress: State Officer Approves
    client.login(username='state_officer', password='password123')
    res = client.post(f'/api/approvals/{app_id}/process/', {'decision': 'approve', 'remarks': 'State Revenue clearance allocated.'}, format='json')
    assert res.status_code == 200, f"State approval failed: {res.data}"
    assert res.data['current_stage'] == 'national_admin', f"Expected national_admin, got {res.data['current_stage']}"
    print(f"[PASS] State Revenue Cleared & Forwarded to: {res.data['current_stage']}")

    # Progress: National Admin Grants Final Approval
    client.login(username='admin', password='password123')
    res = client.post(f'/api/approvals/{app_id}/process/', {'decision': 'approve', 'remarks': 'Final national sanction granted.'}, format='json')
    assert res.status_code == 200, f"National approval failed: {res.data}"
    assert res.data['status'] == 'Approved' and res.data['current_stage'] == 'approved', f"Expected final Approved status, got {res.data}"
    print(f"[PASS] National Administrator Final Sanction Granted: Status = {res.data['status']}")

    # 10. Test Grievance Submission and Redressal
    client.login(username='landowner', password='password123')
    grv_data = {
        'land_parcel': new_parcel_id,
        'project': new_proj_id,
        'subject': 'Test Inconvenience & Inquiry on Road Boundary',
        'category': 'Compensation Delay',
        'description': 'Testing citizen grievance lodging flow',
    }
    res = client.post('/api/grievances/', grv_data, format='json')
    assert res.status_code == 201, f"Grievance submission failed: {res.data}"
    grv_id = res.data['id']
    print(f"[PASS] Citizen Grievance Lodged: Ticket ID = {res.data['grievance_code']}")

    # Officer Updates Status
    client.login(username='district_officer', password='password123')
    res = client.post(f'/api/grievances/{grv_id}/update-status/', {
        'status': 'Resolved',
        'remarks': 'Field inspection verified and dispute resolved.'
    }, format='json')
    assert res.status_code == 200, f"Grievance update failed: {res.data}"
    assert res.data['status'] == 'Resolved', "Status mismatch"
    print(f"[PASS] Grievance Redressed by Officer: Status = {res.data['status']}")

    # 11. Test PDF Reports Generation
    client.login(username='admin', password='password123')
    report_types = ['projects', 'land_records', 'compensation', 'approvals', 'district_stats']
    for r_type in report_types:
        res = client.get(f'/api/analytics/reports/pdf/?type={r_type}')
        assert res.status_code == 200, f"PDF generation failed for {r_type}: {res.status_code}"
        assert res['Content-Type'] == 'application/pdf', f"Expected PDF content type, got {res['Content-Type']}"
        assert len(res.content) > 1000, f"PDF size too small for {r_type} ({len(res.content)} bytes)"
        print(f"[PASS] PDF Report Generated: '{r_type}' ({len(res.content):,} bytes, Content-Type: application/pdf)")

    print("==================================================")
    print("ALL 11 CORE MODULE WORKFLOW TESTS PASSED 100%!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
