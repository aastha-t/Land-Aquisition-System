from rest_framework import serializers
from .models import User, Notification, ActivityLog

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'role_display', 'phone_number', 'department',
            'designation', 'aadhaar_number', 'state', 'state_name',
            'district', 'district_name', 'auth_token', 'is_staff'
        ]
        read_only_fields = ['auth_token', 'is_staff']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone_number', 'department', 'designation',
            'aadhaar_number', 'state', 'district'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_role = serializers.CharField(source='user.get_role_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'username', 'user_role', 'action', 'details', 'ip_address', 'timestamp']
