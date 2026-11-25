import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('national_admin', 'National Administrator'),
        ('state_officer', 'State Officer'),
        ('district_officer', 'District Officer'),
        ('department_officer', 'Department Officer'),
        ('landowner', 'Landowner'),
    ]

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='landowner')
    phone_number = models.CharField(max_length=15, blank=True)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    aadhaar_number = models.CharField(max_length=16, blank=True, help_text="Masked/Encrypted 12-digit UID for Landowners")
    
    # Jurisdiction references
    state = models.ForeignKey('land.State', on_delete=models.SET_NULL, null=True, blank=True, related_name='officers')
    district = models.ForeignKey('land.District', on_delete=models.SET_NULL, null=True, blank=True, related_name='officers')
    
    auth_token = models.CharField(max_length=64, blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.auth_token:
            self.auth_token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('approval', 'Approval Alert'),
        ('compensation', 'Compensation Update'),
        ('grievance', 'Grievance Update'),
        ('project', 'Project Delay / Alert'),
        ('system', 'System Notice'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='system')
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.user.username}"


class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action = models.CharField(max_length=150)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        user_str = self.user.username if self.user else "System"
        return f"{user_str} - {self.action} ({self.timestamp:%Y-%m-%d %H:%M})"
