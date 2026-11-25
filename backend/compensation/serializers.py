from rest_framework import serializers
from .models import Compensation

class CompensationSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_code = serializers.CharField(source='project.project_code', read_only=True)
    survey_number = serializers.CharField(source='land_parcel.survey_number', read_only=True)
    village = serializers.CharField(source='land_parcel.village', read_only=True)
    district_name = serializers.CharField(source='land_parcel.district.name', read_only=True)
    state_name = serializers.CharField(source='land_parcel.state.name', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)

    class Meta:
        model = Compensation
        fields = [
            'id', 'compensation_code', 'project', 'project_name', 'project_code',
            'land_parcel', 'survey_number', 'village', 'district_name', 'state_name',
            'landowner', 'landowner_name', 'land_area_acres', 'valuation_rate_per_acre',
            'base_land_value', 'solatium_percentage', 'solatium_amount',
            'asset_compensation', 'rehabilitation_allowance', 'total_compensation',
            'calculation_date', 'approval_status', 'approval_status_display',
            'payment_status', 'payment_status_display', 'disbursement_date',
            'transaction_reference', 'payment_mode', 'bank_account_masked',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'compensation_code', 'base_land_value', 'solatium_amount',
            'total_compensation', 'disbursement_date', 'transaction_reference',
            'created_at', 'updated_at'
        ]
