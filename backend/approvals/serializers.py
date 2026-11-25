from rest_framework import serializers
from .models import Approval, ApprovalHistory

class ApprovalHistorySerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source='action_by.get_full_name', read_only=True)
    action_by_username = serializers.CharField(source='action_by.username', read_only=True)
    action_by_role = serializers.CharField(source='action_by.get_role_display', read_only=True)

    class Meta:
        model = ApprovalHistory
        fields = [
            'id', 'approval', 'action_by', 'action_by_name',
            'action_by_username', 'action_by_role', 'stage',
            'action', 'remarks', 'timestamp'
        ]


class ApprovalSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    requested_by_role = serializers.CharField(source='requested_by.get_role_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    history = ApprovalHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Approval
        fields = [
            'id', 'approval_code', 'title', 'entity_type', 'entity_id',
            'entity_name', 'current_stage', 'current_stage_display',
            'status', 'priority', 'requested_by', 'requested_by_name',
            'requested_by_username', 'requested_by_role', 'details_summary',
            'history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['approval_code', 'current_stage', 'status', 'requested_by', 'created_at', 'updated_at']
