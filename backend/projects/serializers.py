from rest_framework import serializers
from django.db.models import Sum
from .models import AcquisitionProject, ProjectLandParcel
from land.serializers import LandParcelSerializer

class ProjectLandParcelSerializer(serializers.ModelSerializer):
    parcel_details = LandParcelSerializer(source='land_parcel', read_only=True)
    survey_number = serializers.CharField(source='land_parcel.survey_number', read_only=True)
    owner_name = serializers.CharField(source='land_parcel.owner_name', read_only=True)
    village = serializers.CharField(source='land_parcel.village', read_only=True)
    area_acres = serializers.DecimalField(source='land_parcel.area_acres', max_digits=10, decimal_places=3, read_only=True)

    class Meta:
        model = ProjectLandParcel
        fields = [
            'id', 'project', 'land_parcel', 'parcel_details',
            'survey_number', 'owner_name', 'village', 'area_acres',
            'status', 'compensation_amount', 'added_at'
        ]


class AcquisitionProjectSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    assigned_officer_name = serializers.CharField(source='assigned_officer.get_full_name', read_only=True)
    assigned_officer_username = serializers.CharField(source='assigned_officer.username', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_delayed = serializers.BooleanField(read_only=True)
    
    total_parcels_count = serializers.SerializerMethodField()
    acquired_parcels_count = serializers.SerializerMethodField()
    associated_acres = serializers.SerializerMethodField()
    acquired_acres = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = AcquisitionProject
        fields = [
            'id', 'name', 'project_code', 'category', 'category_display',
            'description', 'state', 'state_name', 'district', 'district_name',
            'executing_agency', 'assigned_officer', 'assigned_officer_name',
            'assigned_officer_username', 'status', 'status_display',
            'target_land_area_acres', 'estimated_budget', 'start_date',
            'expected_completion_date', 'actual_completion_date', 'is_delayed',
            'total_parcels_count', 'acquired_parcels_count', 'associated_acres',
            'acquired_acres', 'progress_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['is_delayed', 'created_at', 'updated_at']

    def get_total_parcels_count(self, obj):
        return obj.project_parcels.count()

    def get_acquired_parcels_count(self, obj):
        return obj.project_parcels.filter(status='Acquired').count()

    def get_associated_acres(self, obj):
        total = obj.project_parcels.aggregate(total=Sum('land_parcel__area_acres'))['total']
        return float(total or 0.0)

    def get_acquired_acres(self, obj):
        total = obj.project_parcels.filter(status='Acquired').aggregate(total=Sum('land_parcel__area_acres'))['total']
        return float(total or 0.0)

    def get_progress_percentage(self, obj):
        if obj.status == 'Completed':
            return 100
        stage_map = {
            'Planning': 15,
            'Land_Identification': 30,
            'Document_Verification': 45,
            'Compensation_Assessment': 60,
            'In_Progress': 80,
            'Delayed': 50,
            'Completed': 100
        }
        total_parcels = obj.project_parcels.count()
        if total_parcels > 0:
            acquired = obj.project_parcels.filter(status='Acquired').count()
            parcel_pct = (acquired / total_parcels) * 100
            # Blend stage progress and parcel progress
            return round((stage_map.get(obj.status, 20) * 0.4) + (parcel_pct * 0.6), 1)
        return stage_map.get(obj.status, 15)
