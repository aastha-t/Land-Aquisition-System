import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Approval(models.Model):
    ENTITY_TYPES = [
        ('Project', 'Acquisition Project'),
        ('Compensation', 'Compensation Award Sanction'),
        ('LandParcel', 'Land Parcel Acquisition Sanction'),
    ]

    STAGES = [
        ('department_officer', 'Department Officer Review'),
        ('district_officer', 'District Collector / Officer Sanction'),
        ('state_officer', 'State Revenue Department Clearance'),
        ('national_admin', 'National Land Acquisition Authority Approval'),
        ('approved', 'Final Approval Granted'),
        ('rejected', 'Application Rejected / Disapproved'),
    ]

    STATUS_CHOICES = [
        ('Pending', 'Pending Approval'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    approval_code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPES)
    entity_id = models.IntegerField()
    entity_name = models.CharField(max_length=255, blank=True)
    
    current_stage = models.CharField(max_length=30, choices=STAGES, default='district_officer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submitted_approvals')
    details_summary = models.TextField(blank=True)
    priority = models.CharField(max_length=20, default='Normal', choices=[('Normal', 'Normal'), ('High', 'High Priority'), ('Urgent', 'Urgent / Fast-Track')])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.approval_code:
            self.approval_code = f"APP-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.approval_code} [{self.get_current_stage_display()}] - {self.title}"


class ApprovalHistory(models.Model):
    approval = models.ForeignKey(Approval, on_delete=models.CASCADE, related_name='history')
    action_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approval_actions')
    stage = models.CharField(max_length=30)
    action = models.CharField(max_length=40) # 'Submitted', 'Approved_And_Forwarded', 'Final_Approved', 'Rejected'
    remarks = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.approval.approval_code} - {self.action} by {self.action_by.username if self.action_by else 'System'}"
