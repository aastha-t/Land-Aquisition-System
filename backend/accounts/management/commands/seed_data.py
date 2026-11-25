import os
import uuid
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings

from accounts.models import User, Notification, ActivityLog
from land.models import State, District, LandParcel, OwnershipDocument
from projects.models import AcquisitionProject, ProjectLandParcel
from compensation.models import Compensation
from approvals.models import Approval, ApprovalHistory
from grievances.models import Grievance

class Command(BaseCommand):
    help = 'Seeds realistic Indian Land Acquisition & Management System demonstration data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Beginning database seeding..."))

        # 1. Create States
        states_data = [
            {'name': 'Maharashtra', 'code': 'MH'},
            {'name': 'Uttar Pradesh', 'code': 'UP'},
            {'name': 'Karnataka', 'code': 'KA'},
            {'name': 'Gujarat', 'code': 'GJ'},
            {'name': 'Tamil Nadu', 'code': 'TN'},
        ]
        states_dict = {}
        for s_info in states_data:
            state, _ = State.objects.update_or_create(code=s_info['code'], defaults={'name': s_info['name']})
            states_dict[s_info['code']] = state
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(states_dict)} States."))

        # 2. Create 10 Districts
        districts_data = [
            {'state_code': 'MH', 'name': 'Pune', 'code': 'PUN', 'headquarters': 'Pune City'},
            {'state_code': 'MH', 'name': 'Nagpur', 'code': 'NGP', 'headquarters': 'Nagpur Civil Lines'},
            {'state_code': 'UP', 'name': 'Gautam Buddha Nagar', 'code': 'GBN', 'headquarters': 'Noida / Greater Noida'},
            {'state_code': 'UP', 'name': 'Lucknow', 'code': 'LKO', 'headquarters': 'Lucknow Collectorate'},
            {'state_code': 'KA', 'name': 'Bengaluru Urban', 'code': 'BLR', 'headquarters': 'Bengaluru Central'},
            {'state_code': 'KA', 'name': 'Mysuru', 'code': 'MYS', 'headquarters': 'Mysuru DC Office'},
            {'state_code': 'GJ', 'name': 'Ahmedabad', 'code': 'AMD', 'headquarters': 'Ahmedabad Collectorate'},
            {'state_code': 'GJ', 'name': 'Surat', 'code': 'SUR', 'headquarters': 'Surat City'},
            {'state_code': 'TN', 'name': 'Chennai', 'code': 'CHN', 'headquarters': 'Singaravelar Maaligai'},
            {'state_code': 'TN', 'name': 'Kanchipuram', 'code': 'KCH', 'headquarters': 'Kanchipuram HQ'},
        ]
        districts_dict = {}
        for d_info in districts_data:
            dist, _ = District.objects.update_or_create(
                state=states_dict[d_info['state_code']],
                name=d_info['name'],
                defaults={'code': d_info['code'], 'headquarters': d_info['headquarters']}
            )
            districts_dict[d_info['name']] = dist
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(districts_dict)} Districts."))

        # 3. Create Demonstration User Accounts
        demo_accounts = [
            {
                'username': 'admin',
                'password': 'password123',
                'email': 'admin.land@nic.in',
                'first_name': 'Dr. Rajesh',
                'last_name': 'Shekhar',
                'role': 'national_admin',
                'department': 'Ministry of Rural Development & Land Resources',
                'designation': 'Joint Secretary & Director General',
                'phone_number': '+91-11-23381234',
                'is_staff': True,
                'is_superuser': True,
                'state': None,
                'district': None,
            },
            {
                'username': 'state_officer',
                'password': 'password123',
                'email': 'officer.mh@revenue.gov.in',
                'first_name': 'Sunita',
                'last_name': 'Deshmukh, IAS',
                'role': 'state_officer',
                'department': 'Department of Revenue & Land Reforms',
                'designation': 'Principal Secretary (Revenue)',
                'phone_number': '+91-22-22025678',
                'is_staff': True,
                'is_superuser': False,
                'state': states_dict['MH'],
                'district': None,
            },
            {
                'username': 'district_officer',
                'password': 'password123',
                'email': 'collector.pune@maharashtra.gov.in',
                'first_name': 'Vikram',
                'last_name': 'Bhosale, IAS',
                'role': 'district_officer',
                'department': 'District Collectorate Office',
                'designation': 'District Collector & District Magistrate',
                'phone_number': '+91-20-26123456',
                'is_staff': True,
                'is_superuser': False,
                'state': states_dict['MH'],
                'district': districts_dict['Pune'],
            },
            {
                'username': 'dept_officer',
                'password': 'password123',
                'email': 'acq.nhai@nhai.org.in',
                'first_name': 'Amit',
                'last_name': 'Kulkarni',
                'role': 'department_officer',
                'department': 'National Highways Authority of India (NHAI)',
                'designation': 'Special Land Acquisition Officer (SLAO)',
                'phone_number': '+91-20-25534123',
                'is_staff': False,
                'is_superuser': False,
                'state': states_dict['MH'],
                'district': districts_dict['Pune'],
            },
            {
                'username': 'landowner',
                'password': 'password123',
                'email': 'ramesh.patil@kisanmail.in',
                'first_name': 'Ramesh',
                'last_name': 'Patil',
                'role': 'landowner',
                'department': '',
                'designation': 'Farmer / Agricultural Landowner',
                'aadhaar_number': '7892-4512-3489',
                'phone_number': '+91-9822012345',
                'is_staff': False,
                'is_superuser': False,
                'state': states_dict['MH'],
                'district': districts_dict['Pune'],
            },
        ]

        users_dict = {}
        for acc in demo_accounts:
            pw = acc.pop('password')
            u, created = User.objects.update_or_create(username=acc['username'], defaults=acc)
            u.set_password(pw)
            u.save()
            users_dict[acc['username']] = u

        # Create additional 9 landowners for rich sample data
        extra_landowners = [
            {'username': 'suresh_sharma', 'first_name': 'Suresh', 'last_name': 'Sharma', 'aadhaar': '8841-2309-1234', 'dist': 'Gautam Buddha Nagar', 'state': 'UP', 'phone': '+91-9811098765'},
            {'username': 'ananya_hegde', 'first_name': 'Ananya', 'last_name': 'Hegde', 'aadhaar': '5412-9843-7612', 'dist': 'Bengaluru Urban', 'state': 'KA', 'phone': '+91-9448011223'},
            {'username': 'devendra_patel', 'first_name': 'Devendra', 'last_name': 'Patel', 'aadhaar': '3214-5678-9012', 'dist': 'Ahmedabad', 'state': 'GJ', 'phone': '+91-9879054321'},
            {'username': 'meenakshi_s', 'first_name': 'Meenakshi', 'last_name': 'Sundaram', 'aadhaar': '6789-0123-4567', 'dist': 'Chennai', 'state': 'TN', 'phone': '+91-9444098765'},
            {'username': 'rajesh_verma', 'first_name': 'Rajesh', 'last_name': 'Verma', 'aadhaar': '4321-8765-0987', 'dist': 'Lucknow', 'state': 'UP', 'phone': '+91-9415067890'},
            {'username': 'sunita_gaikwad', 'first_name': 'Sunita', 'last_name': 'Gaikwad', 'aadhaar': '9012-3456-7890', 'dist': 'Pune', 'state': 'MH', 'phone': '+91-9823056789'},
            {'username': 'prakash_reddy', 'first_name': 'Prakash', 'last_name': 'Reddy', 'aadhaar': '2345-6789-0123', 'dist': 'Bengaluru Urban', 'state': 'KA', 'phone': '+91-9845012345'},
            {'username': 'bhavesh_joshi', 'first_name': 'Bhavesh', 'last_name': 'Joshi', 'aadhaar': '7654-3210-9876', 'dist': 'Surat', 'state': 'GJ', 'phone': '+91-9825067890'},
            {'username': 'kavitha_rajan', 'first_name': 'Kavitha', 'last_name': 'Rajan', 'aadhaar': '1098-7654-3210', 'dist': 'Kanchipuram', 'state': 'TN', 'phone': '+91-9443045678'},
        ]
        for extra in extra_landowners:
            u, _ = User.objects.update_or_create(
                username=extra['username'],
                defaults={
                    'first_name': extra['first_name'],
                    'last_name': extra['last_name'],
                    'role': 'landowner',
                    'email': f"{extra['username']}@citizenmail.in",
                    'aadhaar_number': extra['aadhaar'],
                    'phone_number': extra['phone'],
                    'state': states_dict[extra['state']],
                    'district': districts_dict[extra['dist']],
                }
            )
            u.set_password('password123')
            u.save()
            users_dict[extra['username']] = u

        self.stdout.write(self.style.SUCCESS(f"Seeded 5 Core Demo Users + 9 Additional Landowners."))

        # 4. Create 5 Strategic Acquisition Projects
        projects_data = [
            {
                'name': 'NH-48 Expressway Multi-Lane Expansion & Bypass',
                'project_code': 'NHAI-MH-2026-01',
                'category': 'Highway',
                'description': 'Four-to-eight laning of Pune-Satara expressway section including elevated viaducts and service corridors.',
                'state': states_dict['MH'],
                'district': districts_dict['Pune'],
                'executing_agency': 'National Highways Authority of India (NHAI)',
                'assigned_officer': users_dict['dept_officer'],
                'status': 'In_Progress',
                'target_land_area_acres': 145.5,
                'estimated_budget': 320000000.00,
                'start_date': date(2025, 3, 1),
                'expected_completion_date': date(2027, 8, 30),
            },
            {
                'name': 'Western Dedicated Freight Corridor (WDFC) Phase II',
                'project_code': 'DFCCIL-GJ-2026-04',
                'category': 'Railway',
                'description': 'High capacity electrified double-track rail corridor for rapid freight movement between Dadri and JNPT Port.',
                'state': states_dict['GJ'],
                'district': districts_dict['Ahmedabad'],
                'executing_agency': 'Dedicated Freight Corridor Corporation of India (DFCCIL)',
                'assigned_officer': users_dict['state_officer'],
                'status': 'Compensation_Assessment',
                'target_land_area_acres': 220.0,
                'estimated_budget': 750000000.00,
                'start_date': date(2024, 6, 15),
                'expected_completion_date': date(2026, 12, 31),
            },
            {
                'name': 'Jewar Noida International Greenfield Airport Stage-II',
                'project_code': 'NIAL-UP-2026-09',
                'category': 'Airport',
                'description': 'Runway 3 and Cargo Terminal land acquisition across multimodal logistics hub in Jewar tehsil.',
                'state': states_dict['UP'],
                'district': districts_dict['Gautam Buddha Nagar'],
                'executing_agency': 'Noida International Airport Limited (NIAL / Yamuna Expressway Auth)',
                'assigned_officer': users_dict['admin'],
                'status': 'In_Progress',
                'target_land_area_acres': 480.0,
                'estimated_budget': 1850000000.00,
                'start_date': date(2024, 1, 10),
                'expected_completion_date': date(2027, 4, 15),
            },
            {
                'name': 'Bengaluru High-Tech Electronics & Semiconductor Park',
                'project_code': 'KIADB-KA-2026-03',
                'category': 'Industrial Development',
                'description': 'Integrated smart industrial ecosystem for semiconductor fabrication units and component manufacturing.',
                'state': states_dict['KA'],
                'district': districts_dict['Bengaluru Urban'],
                'executing_agency': 'Karnataka Industrial Areas Development Board (KIADB)',
                'assigned_officer': users_dict['state_officer'],
                'status': 'Document_Verification',
                'target_land_area_acres': 180.0,
                'estimated_budget': 490000000.00,
                'start_date': date(2025, 1, 5),
                'expected_completion_date': date(2026, 9, 30),
            },
            {
                'name': 'Chennai Port - Maduravoyal Elevated Double-Decker Corridor',
                'project_code': 'CP-TN-2026-07',
                'category': 'Other Infrastructure',
                'description': '20.6 km elevated 4-lane corridor along Cooum river connecting Chennai Port to NH-48.',
                'state': states_dict['TN'],
                'district': districts_dict['Chennai'],
                'executing_agency': 'Tamil Nadu Highways & Minor Ports Department',
                'assigned_officer': users_dict['admin'],
                'status': 'Delayed',
                'target_land_area_acres': 65.0,
                'estimated_budget': 580000000.00,
                'start_date': date(2023, 8, 1),
                'expected_completion_date': date(2025, 11, 30), # Intentionally past date for delay alert
            },
        ]

        projects_dict = {}
        for p_data in projects_data:
            proj, _ = AcquisitionProject.objects.update_or_create(
                project_code=p_data['project_code'],
                defaults=p_data
            )
            projects_dict[p_data['project_code']] = proj
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(projects_dict)} Acquisition Projects."))

        # 5. Create 20 Land Parcels with Realistic Indian Coordinates
        # Coordinates:
        # Pune: 18.5204° N, 73.8567° E
        # Nagpur: 21.1458° N, 79.0882° E
        # Noida/Jewar: 28.1833° N, 77.5667° E
        # Lucknow: 26.8467° N, 80.9462° E
        # Bengaluru: 12.9716° N, 77.5946° E
        # Mysuru: 12.2958° N, 76.6394° E
        # Ahmedabad: 23.0225° N, 72.5714° E
        # Surat: 21.1702° N, 72.8311° E
        # Chennai: 13.0827° N, 80.2707° E
        # Kanchipuram: 12.8342° N, 79.7036° E
        parcels_data = [
            # Pune (MH)
            {'survey': '104/2B', 'dist': 'Pune', 'st': 'MH', 'village': 'Khed Shivapur', 'acres': 4.250, 'type': 'Agricultural', 'rate': 2800000, 'lat': 18.354120, 'lng': 73.854210, 'owner': 'Ramesh Patil', 'u': 'landowner', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},
            {'survey': '108/1A', 'dist': 'Pune', 'st': 'MH', 'village': 'Khed Shivapur', 'acres': 2.800, 'type': 'Agricultural', 'rate': 2800000, 'lat': 18.356240, 'lng': 73.859180, 'owner': 'Sunita Gaikwad', 'u': 'sunita_gaikwad', 'v_stat': 'Verified', 'acq_stat': 'Acquired'},
            {'survey': '214/3C', 'dist': 'Pune', 'st': 'MH', 'village': 'Shindewadi', 'acres': 6.500, 'type': 'Commercial', 'rate': 4500000, 'lat': 18.381200, 'lng': 73.864300, 'owner': 'Ramesh Patil', 'u': 'landowner', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},
            {'survey': '312/1', 'dist': 'Pune', 'st': 'MH', 'village': 'Kapurhol', 'acres': 8.120, 'type': 'Agricultural', 'rate': 2400000, 'lat': 18.284500, 'lng': 73.912400, 'owner': 'Dattatray Shinde', 'u': None, 'v_stat': 'Pending', 'acq_stat': 'In_Acquisition'},

            # Nagpur (MH)
            {'survey': '45/2', 'dist': 'Nagpur', 'st': 'MH', 'village': 'Butibori MIDC', 'acres': 12.400, 'type': 'Industrial', 'rate': 3200000, 'lat': 20.932100, 'lng': 78.994200, 'owner': 'Pramod Mahajan', 'u': None, 'v_stat': 'Verified', 'acq_stat': 'Available'},
            {'survey': '89/3B', 'dist': 'Nagpur', 'st': 'MH', 'village': 'Hingna', 'acres': 5.600, 'type': 'Agricultural', 'rate': 1800000, 'lat': 21.082100, 'lng': 78.971200, 'owner': 'Shobha Raut', 'u': None, 'v_stat': 'Pending', 'acq_stat': 'Available'},

            # Gautam Buddha Nagar (Jewar Airport - UP)
            {'survey': '512/4', 'dist': 'Gautam Buddha Nagar', 'st': 'UP', 'village': 'Ranhera', 'acres': 9.750, 'type': 'Agricultural', 'rate': 4200000, 'lat': 28.172400, 'lng': 77.581200, 'owner': 'Suresh Sharma', 'u': 'suresh_sharma', 'v_stat': 'Verified', 'acq_stat': 'Acquired'},
            {'survey': '518/2A', 'dist': 'Gautam Buddha Nagar', 'st': 'UP', 'village': 'Rohi', 'acres': 14.200, 'type': 'Agricultural', 'rate': 4200000, 'lat': 28.184500, 'lng': 77.592300, 'owner': 'Suresh Sharma', 'u': 'suresh_sharma', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},
            {'survey': '601/1', 'dist': 'Gautam Buddha Nagar', 'st': 'UP', 'village': 'Dayanatpur', 'acres': 7.300, 'type': 'Agricultural', 'rate': 4100000, 'lat': 28.191200, 'lng': 77.568400, 'owner': 'Kiran Devi', 'u': None, 'v_stat': 'Pending', 'acq_stat': 'In_Acquisition'},

            # Lucknow (UP)
            {'survey': '124/8', 'dist': 'Lucknow', 'st': 'UP', 'village': 'Mohanlalganj', 'acres': 3.500, 'type': 'Residential', 'rate': 3500000, 'lat': 26.681200, 'lng': 80.994300, 'owner': 'Rajesh Verma', 'u': 'rajesh_verma', 'v_stat': 'Verified', 'acq_stat': 'Available'},
            {'survey': '180/2', 'dist': 'Lucknow', 'st': 'UP', 'village': 'Gosainganj', 'acres': 6.200, 'type': 'Agricultural', 'rate': 2100000, 'lat': 26.745100, 'lng': 81.121200, 'owner': 'Rajesh Verma', 'u': 'rajesh_verma', 'v_stat': 'Verified', 'acq_stat': 'Disputed'},

            # Bengaluru Urban (KA)
            {'survey': '78/1', 'dist': 'Bengaluru Urban', 'st': 'KA', 'village': 'Devenahalli', 'acres': 5.800, 'type': 'Industrial', 'rate': 7500000, 'lat': 13.245100, 'lng': 77.712300, 'owner': 'Ananya Hegde', 'u': 'ananya_hegde', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},
            {'survey': '82/4C', 'dist': 'Bengaluru Urban', 'st': 'KA', 'village': 'Bagalur', 'acres': 4.100, 'type': 'Agricultural', 'rate': 6800000, 'lat': 13.134200, 'lng': 77.671200, 'owner': 'Prakash Reddy', 'u': 'prakash_reddy', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},
            {'survey': '94/2', 'dist': 'Bengaluru Urban', 'st': 'KA', 'village': 'Bidadi', 'acres': 8.900, 'type': 'Commercial', 'rate': 5200000, 'lat': 12.791200, 'lng': 77.384500, 'owner': 'Ananya Hegde', 'u': 'ananya_hegde', 'v_stat': 'Pending', 'acq_stat': 'Available'},

            # Mysuru (KA)
            {'survey': '34/1A', 'dist': 'Mysuru', 'st': 'KA', 'village': 'Nanjangud', 'acres': 11.500, 'type': 'Agricultural', 'rate': 1900000, 'lat': 12.124500, 'lng': 76.681200, 'owner': 'Gopal Krishna', 'u': None, 'v_stat': 'Verified', 'acq_stat': 'Available'},

            # Ahmedabad (GJ)
            {'survey': '402/1', 'dist': 'Ahmedabad', 'st': 'GJ', 'village': 'Sanand GIDC', 'acres': 15.000, 'type': 'Industrial', 'rate': 4500000, 'lat': 22.984100, 'lng': 72.381200, 'owner': 'Devendra Patel', 'u': 'devendra_patel', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},
            {'survey': '415/3', 'dist': 'Ahmedabad', 'st': 'GJ', 'village': 'Bawla', 'acres': 9.200, 'type': 'Agricultural', 'rate': 2900000, 'lat': 22.831200, 'lng': 72.364500, 'owner': 'Devendra Patel', 'u': 'devendra_patel', 'v_stat': 'Verified', 'acq_stat': 'Acquired'},

            # Surat (GJ)
            {'survey': '210/2', 'dist': 'Surat', 'st': 'GJ', 'village': 'Hazira Port Area', 'acres': 6.800, 'type': 'Commercial', 'rate': 5800000, 'lat': 21.112400, 'lng': 72.641200, 'owner': 'Bhavesh Joshi', 'u': 'bhavesh_joshi', 'v_stat': 'Pending', 'acq_stat': 'Available'},

            # Chennai (TN)
            {'survey': '55/1', 'dist': 'Chennai', 'st': 'TN', 'village': 'Maduravoyal', 'acres': 1.850, 'type': 'Commercial', 'rate': 12500000, 'lat': 13.064500, 'lng': 80.161200, 'owner': 'Meenakshi Sundaram', 'u': 'meenakshi_s', 'v_stat': 'Verified', 'acq_stat': 'In_Acquisition'},

            # Kanchipuram (TN)
            {'survey': '182/4', 'dist': 'Kanchipuram', 'st': 'TN', 'village': 'Sriperumbudur', 'acres': 7.400, 'type': 'Industrial', 'rate': 5400000, 'lat': 12.971200, 'lng': 79.941200, 'owner': 'Kavitha Rajan', 'u': 'kavitha_rajan', 'v_stat': 'Verified', 'acq_stat': 'Available'},
        ]

        parcels_dict = {}
        for p in parcels_data:
            user_inst = users_dict.get(p['u']) if p['u'] else None
            owner_aadhaar = user_inst.aadhaar_number if user_inst else '9999-8888-7777'
            owner_phone = user_inst.phone_number if user_inst else '+91-9876543210'

            parcel, _ = LandParcel.objects.update_or_create(
                survey_number=p['survey'],
                district=districts_dict[p['dist']],
                village=p['village'],
                defaults={
                    'state': states_dict[p['st']],
                    'sub_division_taluk': f"{p['dist']} Taluk",
                    'area_acres': p['acres'],
                    'area_sq_meters': round(p['acres'] * 4046.86, 2),
                    'land_type': p['type'],
                    'market_value_per_acre': p['rate'],
                    'latitude': p['lat'],
                    'longitude': p['lng'],
                    'owner_name': p['owner'],
                    'owner_contact': owner_phone,
                    'owner_aadhaar': owner_aadhaar,
                    'landowner_user': user_inst,
                    'verification_status': p['v_stat'],
                    'verification_remarks': 'Verified by Sub-Divisional Magistrate / Tehsildar land revenue records.' if p['v_stat'] == 'Verified' else 'Awaiting verification of Form 7/12 extract.',
                    'verified_by': users_dict['district_officer'] if p['v_stat'] == 'Verified' else None,
                    'verified_at': timezone.now() if p['v_stat'] == 'Verified' else None,
                    'acquisition_status': p['acq_stat'],
                }
            )
            parcels_dict[f"{p['survey']}-{p['dist']}"] = parcel

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(parcels_dict)} Land Parcels with Indian coordinates."))

        # 6. Associate Land Parcels with Projects
        project_parcels_map = [
            # NH-48 Pune Highway Project
            ('NHAI-MH-2026-01', '104/2B-Pune', 'Approved_For_Acquisition', 23800000.00),
            ('NHAI-MH-2026-01', '108/1A-Pune', 'Acquired', 15680000.00),
            ('NHAI-MH-2026-01', '214/3C-Pune', 'Compensation_Determined', 58500000.00),
            ('NHAI-MH-2026-01', '312/1-Pune', 'Identified', 0.00),

            # Jewar Airport Project (UP)
            ('NIAL-UP-2026-09', '512/4-Gautam Buddha Nagar', 'Acquired', 81900000.00),
            ('NIAL-UP-2026-09', '518/2A-Gautam Buddha Nagar', 'Compensation_Determined', 119280000.00),
            ('NIAL-UP-2026-09', '601/1-Gautam Buddha Nagar', 'Identified', 0.00),

            # Dedicated Freight Corridor (GJ)
            ('DFCCIL-GJ-2026-04', '402/1-Ahmedabad', 'Approved_For_Acquisition', 135000000.00),
            ('DFCCIL-GJ-2026-04', '415/3-Ahmedabad', 'Acquired', 53360000.00),

            # Bengaluru High-Tech Park (KA)
            ('KIADB-KA-2026-03', '78/1-Bengaluru Urban', 'Surveyed', 87000000.00),
            ('KIADB-KA-2026-03', '82/4C-Bengaluru Urban', 'Identified', 0.00),

            # Chennai Port Elevated Corridor (TN)
            ('CP-TN-2026-07', '55/1-Chennai', 'Surveyed', 46250000.00),
        ]

        for p_code, p_key, status_link, comp_amt in project_parcels_map:
            if p_code in projects_dict and p_key in parcels_dict:
                ProjectLandParcel.objects.update_or_create(
                    project=projects_dict[p_code],
                    land_parcel=parcels_dict[p_key],
                    defaults={'status': status_link, 'compensation_amount': comp_amt}
                )

        self.stdout.write(self.style.SUCCESS("Associated Land Parcels with Projects."))

        # 7. Seed Ownership Documents
        doc_samples = [
            ('104/2B-Pune', 'ownership_certificate', 'Form 7/12 Land Title Extract', 'Approved', 'Verified against Pune District Land Records Portal.'),
            ('104/2B-Pune', 'land_survey_document', 'Cadastral Map Survey Sheet #104', 'Approved', 'Survey boundaries matched with GIS coordinates.'),
            ('108/1A-Pune', 'ownership_certificate', 'Registered Sale Deed & Ferfar', 'Approved', 'Clear title confirmed.'),
            ('512/4-Gautam Buddha Nagar', 'ownership_certificate', 'Khatauni Extract 1431 Fasli', 'Approved', 'Verified with Jewar Tehsil records.'),
            ('518/2A-Gautam Buddha Nagar', 'identity_document', 'Aadhaar & PAN Verification Card', 'Approved', 'Identity verified against biometric UID.'),
            ('402/1-Ahmedabad', 'supporting_document', 'No Objection Certificate (GIDC)', 'Approved', 'Industrial zoning NOC attached.'),
            ('78/1-Bengaluru Urban', 'ownership_certificate', 'RTC Form 16 Pahani Record', 'Pending', 'Under field verification by SLAO.'),
            ('55/1-Chennai', 'land_survey_document', 'Town Survey Land Register (TSLR)', 'Pending', 'Coastal regulation zone clearance pending.'),
        ]

        os.makedirs(os.path.join(settings.MEDIA_ROOT, 'documents', 'sample'), exist_ok=True)
        sample_file_path = os.path.join(settings.MEDIA_ROOT, 'documents', 'sample', 'sample_deed.pdf')
        if not os.path.exists(sample_file_path):
            with open(sample_file_path, 'wb') as f:
                f.write(b"%PDF-1.4 sample title certificate digital verification file.")

        for p_key, doc_type, title, v_status, remarks in doc_samples:
            if p_key in parcels_dict:
                parcel = parcels_dict[p_key]
                doc, _ = OwnershipDocument.objects.update_or_create(
                    land_parcel=parcel,
                    title=title,
                    defaults={
                        'document_type': doc_type,
                        'document_file': 'documents/sample/sample_deed.pdf',
                        'uploaded_by': parcel.landowner_user or users_dict['admin'],
                        'verification_status': v_status,
                        'remarks': remarks,
                        'verified_by': users_dict['district_officer'] if v_status == 'Approved' else None,
                        'verified_at': timezone.now() if v_status == 'Approved' else None,
                    }
                )

        self.stdout.write(self.style.SUCCESS("Seeded Ownership Documents."))

        # 8. Seed Realistic Compensation Awards (RFCTLARR 2013 100% Solatium)
        compensations_data = [
            {
                'code': 'CMP-2026-001',
                'proj': 'NHAI-MH-2026-01',
                'parcel': '108/1A-Pune',
                'acres': 2.800,
                'rate': 2800000.00,
                'asset': 150000.00, # Fruit orchard and borewell
                'rehab': 500000.00, # Livelihood rehabilitation
                'pay_stat': 'Disbursed',
                'app_stat': 'Approved',
                'disb_date': date(2025, 11, 14),
                'utr': 'PFMS-20251114-MH89421',
                'remarks': '100% compensation award disbursed directly to beneficiary Aadhaar-linked bank account.',
            },
            {
                'code': 'CMP-2026-002',
                'proj': 'NHAI-MH-2026-01',
                'parcel': '104/2B-Pune',
                'acres': 4.250,
                'rate': 2800000.00,
                'asset': 350000.00,
                'rehab': 800000.00,
                'pay_stat': 'Approved',
                'app_stat': 'Approved',
                'disb_date': None,
                'utr': '',
                'remarks': 'Award announced under Section 30. Awaiting scheduled PFMS DBT batch transfer.',
            },
            {
                'code': 'CMP-2026-003',
                'proj': 'NIAL-UP-2026-09',
                'parcel': '512/4-Gautam Buddha Nagar',
                'acres': 9.750,
                'rate': 4200000.00,
                'asset': 1200000.00,
                'rehab': 1500000.00,
                'pay_stat': 'Disbursed',
                'app_stat': 'Approved',
                'disb_date': date(2025, 10, 20),
                'utr': 'PFMS-20251020-UP34981',
                'remarks': 'Full payment released. Physical possession taken by NIAL.',
            },
            {
                'code': 'CMP-2026-004',
                'proj': 'NIAL-UP-2026-09',
                'parcel': '518/2A-Gautam Buddha Nagar',
                'acres': 14.200,
                'rate': 4200000.00,
                'asset': 850000.00,
                'rehab': 2000000.00,
                'pay_stat': 'Unprocessed',
                'app_stat': 'Under_Review',
                'disb_date': None,
                'utr': '',
                'remarks': 'Joint inspection completed. Awaiting final award declaration by Collector.',
            },
            {
                'code': 'CMP-2026-005',
                'proj': 'DFCCIL-GJ-2026-04',
                'parcel': '415/3-Ahmedabad',
                'acres': 9.200,
                'rate': 2900000.00,
                'asset': 600000.00,
                'rehab': 1000000.00,
                'pay_stat': 'Disbursed',
                'app_stat': 'Approved',
                'disb_date': date(2025, 9, 5),
                'utr': 'PFMS-20250905-GJ77123',
                'remarks': 'Direct benefit payment credited to Bank of Baroda account.',
            },
            {
                'code': 'CMP-2026-006',
                'proj': 'CP-TN-2026-07',
                'parcel': '55/1-Chennai',
                'acres': 1.850,
                'rate': 12500000.00,
                'asset': 2500000.00,
                'rehab': 1500000.00,
                'pay_stat': 'On_Hold',
                'app_stat': 'Draft',
                'disb_date': None,
                'utr': '',
                'remarks': 'Valuation challenged regarding commercial structure footprint on frontage.',
            },
        ]

        for c_info in compensations_data:
            if c_info['proj'] in projects_dict and c_info['parcel'] in parcels_dict:
                p_obj = projects_dict[c_info['proj']]
                parcel_obj = parcels_dict[c_info['parcel']]
                comp, _ = Compensation.objects.update_or_create(
                    compensation_code=c_info['code'],
                    defaults={
                        'project': p_obj,
                        'land_parcel': parcel_obj,
                        'landowner': parcel_obj.landowner_user,
                        'landowner_name': parcel_obj.owner_name,
                        'land_area_acres': c_info['acres'],
                        'valuation_rate_per_acre': c_info['rate'],
                        'base_land_value': round(c_info['acres'] * c_info['rate'], 2),
                        'solatium_percentage': 100.00,
                        'solatium_amount': round(c_info['acres'] * c_info['rate'], 2),
                        'asset_compensation': c_info['asset'],
                        'rehabilitation_allowance': c_info['rehab'],
                        'total_compensation': round((c_info['acres'] * c_info['rate'] * 2) + c_info['asset'] + c_info['rehab'], 2),
                        'payment_status': c_info['pay_stat'],
                        'approval_status': c_info['app_stat'],
                        'disbursement_date': c_info['disb_date'],
                        'transaction_reference': c_info['utr'],
                        'remarks': c_info['remarks'],
                    }
                )

        self.stdout.write(self.style.SUCCESS("Seeded Compensation Awards."))

        # 9. Seed Multi-Stage Approval Workflow Records
        approvals_data = [
            {
                'code': 'APP-2026-001',
                'title': 'Sanction of Land Acquisition Award for Jewar Airport Sector 2',
                'entity_type': 'Compensation',
                'entity_id': 3,
                'entity_name': 'Compensation CMP-2026-003 (Suresh Sharma)',
                'current_stage': 'approved',
                'status': 'Approved',
                'priority': 'Urgent',
                'requested_by': users_dict['dept_officer'],
                'details': 'Final award sanction under Section 30 of RFCTLARR Act 2013 for 9.75 acres.',
                'history': [
                    (users_dict['dept_officer'], 'department_officer', 'Submitted', 'Initial land award proposal prepared after joint cadastral survey.'),
                    (users_dict['district_officer'], 'district_officer', 'Approved_And_Forwarded', 'Verified circle rates and title deeds. Recommended to Principal Secretary.'),
                    (users_dict['state_officer'], 'state_officer', 'Approved_And_Forwarded', 'Budget clearance allocated from State Infrastructure Fund.'),
                    (users_dict['admin'], 'national_admin', 'Final_Approved', 'Final national approval accorded. DBT disbursement authorized.'),
                ]
            },
            {
                'code': 'APP-2026-002',
                'title': 'Acquisition Clearance for Western DFC Ahmedabad Section',
                'entity_type': 'Project',
                'entity_id': 2,
                'entity_name': 'Project DFCCIL-GJ-2026-04',
                'current_stage': 'national_admin',
                'status': 'Pending',
                'priority': 'High',
                'requested_by': users_dict['state_officer'],
                'details': 'Special environmental and corridor clearance submitted for National Authority sanction.',
                'history': [
                    (users_dict['dept_officer'], 'department_officer', 'Submitted', 'SLAO submitted Section 4 notification for rail alignment.'),
                    (users_dict['district_officer'], 'district_officer', 'Approved_And_Forwarded', 'District revenue hearing concluded without pending disputes.'),
                    (users_dict['state_officer'], 'state_officer', 'Approved_And_Forwarded', 'Forwarded to National Land Acquisition Authority for final gazette sanction.'),
                ]
            },
            {
                'code': 'APP-2026-003',
                'title': 'Compensation Award Sanction for NH-48 Khed Shivapur Expansion',
                'entity_type': 'Compensation',
                'entity_id': 2,
                'entity_name': 'Compensation CMP-2026-002 (Ramesh Patil)',
                'current_stage': 'state_officer',
                'status': 'Pending',
                'priority': 'Normal',
                'requested_by': users_dict['dept_officer'],
                'details': 'Approval of ₹2.81 Cr statutory award for Survey #104/2B.',
                'history': [
                    (users_dict['dept_officer'], 'department_officer', 'Submitted', 'Submitted valuation calculation with 100% solatium and standing crop damages.'),
                    (users_dict['district_officer'], 'district_officer', 'Approved_And_Forwarded', 'Sanctioned at district level. Transmitted to State Revenue Department.'),
                ]
            },
            {
                'code': 'APP-2026-004',
                'title': 'Commercial Parcel Verification & Alignment Revision',
                'entity_type': 'LandParcel',
                'entity_id': 1,
                'entity_name': 'Survey #55/1 - Maduravoyal (Chennai)',
                'current_stage': 'district_officer',
                'status': 'Pending',
                'priority': 'High',
                'requested_by': users_dict['dept_officer'],
                'details': 'Alignment modification request due to structural impact on frontage building.',
                'history': [
                    (users_dict['dept_officer'], 'department_officer', 'Submitted', 'Structural inspection report forwarded to District Magistrate.'),
                ]
            },
        ]

        for a_data in approvals_data:
            app, _ = Approval.objects.update_or_create(
                approval_code=a_data['code'],
                defaults={
                    'title': a_data['title'],
                    'entity_type': a_data['entity_type'],
                    'entity_id': a_data['entity_id'],
                    'entity_name': a_data['entity_name'],
                    'current_stage': a_data['current_stage'],
                    'status': a_data['status'],
                    'priority': a_data['priority'],
                    'requested_by': a_data['requested_by'],
                    'details_summary': a_data['details'],
                }
            )
            # Seed history
            ApprovalHistory.objects.filter(approval=app).delete()
            for user_act, stg, act, rem in a_data['history']:
                ApprovalHistory.objects.create(
                    approval=app,
                    action_by=user_act,
                    stage=stg,
                    action=act,
                    remarks=rem,
                    timestamp=timezone.now() - timedelta(days=2)
                )

        self.stdout.write(self.style.SUCCESS("Seeded Multi-Stage Approvals & Audit History."))

        # 10. Seed Grievances
        grievances_data = [
            {
                'code': 'GRV-2026-001',
                'user': users_dict['landowner'],
                'parcel': parcels_dict['104/2B-Pune'],
                'proj': projects_dict['NHAI-MH-2026-01'],
                'subject': 'Delay in Scheduled DBT Payment for Survey #104/2B',
                'category': 'Compensation Delay',
                'desc': 'Award announced 3 months ago during public hearing but credit has not reflected in my SBI Kisan account.',
                'status': 'Action_Taken',
                'remarks': 'PFMS batch transfer scheduled for upcoming fiscal cycle following state treasury clearance.',
                'resolved_by': users_dict['district_officer'],
            },
            {
                'code': 'GRV-2026-002',
                'user': users_dict['suresh_sharma'],
                'parcel': parcels_dict['518/2A-Gautam Buddha Nagar'],
                'proj': projects_dict['NIAL-UP-2026-09'],
                'subject': 'Request for Re-measurement of Standing Tube-well and Mango Trees',
                'category': 'Valuation Dispute',
                'desc': 'The joint survey missed two high-yield borewells and 18 mature fruit trees during the preliminary enumeration.',
                'status': 'Under_Review',
                'remarks': 'Horticulture officer deputed to conduct physical re-verification on 28th instant.',
                'resolved_by': None,
            },
            {
                'code': 'GRV-2026-003',
                'user': users_dict['meenakshi_s'],
                'parcel': parcels_dict['55/1-Chennai'],
                'proj': projects_dict['CP-TN-2026-07'],
                'subject': 'Elevated Corridor Noise & Vibration Mitigation',
                'category': 'Project Delay',
                'desc': 'Proposed ramp alignment is within 8 meters of residential boundary wall. Requesting acoustic barrier.',
                'status': 'Resolved',
                'remarks': 'NHAI technical team agreed to install sound barrier panels along chainage 14+200.',
                'resolved_by': users_dict['admin'],
            },
        ]

        for g in grievances_data:
            Grievance.objects.update_or_create(
                grievance_code=g['code'],
                defaults={
                    'landowner': g['user'],
                    'land_parcel': g['parcel'],
                    'project': g['proj'],
                    'subject': g['subject'],
                    'category': g['category'],
                    'description': g['desc'],
                    'status': g['status'],
                    'resolution_remarks': g['remarks'],
                    'resolved_by': g['resolved_by'],
                    'resolved_at': timezone.now() if g['status'] == 'Resolved' else None,
                }
            )

        self.stdout.write(self.style.SUCCESS("Seeded Citizen Grievances."))

        # 11. Seed Notifications
        notifications_data = [
            (users_dict['admin'], 'New Approval Sanction Pending', 'Approval APP-2026-002 for Western DFC is awaiting National Administrator sanction.', 'approval', '/approvals'),
            (users_dict['state_officer'], 'Escalated Sanction Request', 'Compensation Award CMP-2026-002 submitted by Pune District Collector.', 'approval', '/approvals'),
            (users_dict['district_officer'], 'Land Record Verification Due', 'Survey #312/1 in Kapurhol requires title verification before Section 6 declaration.', 'system', '/document-verification'),
            (users_dict['landowner'], 'Compensation Disbursed (PFMS)', 'DBT transfer of ₹1,56,80,000 for Survey #108/1A credited to your registered bank account. Ref: PFMS-20251114-MH89421', 'compensation', '/compensation'),
            (users_dict['landowner'], 'Grievance Update: GRV-2026-001', 'District Collector added remarks to your compensation delay inquiry.', 'grievance', '/grievances'),
        ]
        for u, title, msg, n_type, link in notifications_data:
            Notification.objects.create(
                user=u,
                title=title,
                message=msg,
                notification_type=n_type,
                link=link
            )

        # 12. Seed Activity Logs
        logs_data = [
            (users_dict['admin'], 'System Initialization', 'Initialized national land acquisition master databases.'),
            (users_dict['admin'], 'Final Approval Accorded', 'Granted national clearance for Jewar Airport Stage-II acquisition package.'),
            (users_dict['state_officer'], 'Budget Allocation', 'Approved ₹75 Cr state revenue clearance for Western DFC corridor.'),
            (users_dict['district_officer'], 'Award Sanctioned', 'Sanctioned compensation award for Survey #108/1A in Pune district.'),
            (users_dict['dept_officer'], 'Parcel Survey Registered', 'Entered cadastral coordinates for NH-48 expansion corridor.'),
            (users_dict['landowner'], 'Grievance Submitted', 'Filed grievance GRV-2026-001 regarding compensation disbursement.'),
        ]
        for u, action, det in logs_data:
            ActivityLog.objects.create(user=u, action=action, details=det)

        self.stdout.write(self.style.SUCCESS("All demonstration data successfully seeded!"))
