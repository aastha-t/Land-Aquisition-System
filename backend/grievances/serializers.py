from rest_framework import serializers
from .models import Grievance

class GrievanceSerializer(serializers.ModelSerializer):
    landowner_name = serializers.CharField(source='landowner.get_full_name', read_only=True)
    landowner_username = serializers.CharField(source='landowner.username', read_only=True)
    landowner_phone = serializers.CharField(source='landowner.phone_number', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    survey_number = serializers.CharField(source='land_parcel.survey_number', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)

    class Meta:
        model = Grievance
        fields = [
            'id', 'grievance_code', 'landowner', 'landowner_name',
            'landowner_username', 'landowner_phone', 'land_parcel',
            'survey_number', 'project', 'project_name', 'subject',
            'category', 'category_display', 'description', 'status',
            'status_display', 'resolution_remarks', 'resolved_by',
            'resolved_by_name', 'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['grievance_code', 'landowner', 'resolved_by', 'resolved_at', 'created_at', 'updated_at']
