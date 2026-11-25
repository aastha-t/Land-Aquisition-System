from rest_framework import serializers
from .models import State, District, LandParcel, OwnershipDocument

class DistrictSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'state', 'state_name', 'name', 'code', 'headquarters']


class StateSerializer(serializers.ModelSerializer):
    districts = DistrictSerializer(many=True, read_only=True)

    class Meta:
        model = State
        fields = ['id', 'name', 'code', 'districts']


class OwnershipDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    parcel_survey = serializers.CharField(source='land_parcel.survey_number', read_only=True)
    parcel_village = serializers.CharField(source='land_parcel.village', read_only=True)

    class Meta:
        model = OwnershipDocument
        fields = [
            'id', 'land_parcel', 'parcel_survey', 'parcel_village',
            'document_type', 'document_type_display', 'title',
            'document_file', 'uploaded_by', 'uploaded_by_name',
            'verification_status', 'remarks', 'verified_by',
            'verified_by_name', 'verified_at', 'created_at'
        ]
        read_only_fields = ['uploaded_by', 'verified_by', 'verified_at', 'created_at']


class LandParcelSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True)
    documents = OwnershipDocumentSerializer(many=True, read_only=True)
    landowner_username = serializers.CharField(source='landowner_user.username', read_only=True)
    area_sq_meters = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = LandParcel
        fields = [
            'id', 'survey_number', 'state', 'state_name', 'district', 'district_name',
            'sub_division_taluk', 'village', 'area_acres', 'area_sq_meters',
            'land_type', 'market_value_per_acre', 'latitude', 'longitude',
            'owner_name', 'owner_contact', 'owner_aadhaar', 'landowner_user',
            'landowner_username', 'verification_status', 'verification_remarks',
            'verified_by', 'verified_by_name', 'verified_at',
            'acquisition_status', 'documents', 'created_at', 'updated_at'
        ]
        read_only_fields = ['verified_by', 'verified_at', 'created_at', 'updated_at']

    def validate(self, data):
        # Auto-compute sq_meters if not given or sync them
        area_acres = data.get('area_acres')
        area_sq_meters = data.get('area_sq_meters')
        if area_acres and not area_sq_meters:
            data['area_sq_meters'] = round(float(area_acres) * 4046.86, 2)
        elif area_sq_meters and not area_acres:
            data['area_acres'] = round(float(area_sq_meters) / 4046.86, 3)
        return data
