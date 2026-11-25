import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Grievance(models.Model):
    CATEGORY_CHOICES = [
        ('Compensation Delay', 'Compensation Disbursement Delay'),
        ('Valuation Dispute', 'Land Valuation & Circle Rate Dispute'),
        ('Ownership Conflict', 'Title & Ownership Verification Conflict'),
        ('Project Delay', 'Project Delay & Livelihood Impact'),
        ('Document Issue', 'Document Rejection / Boundary Dispute'),
        ('Other', 'Other Grievance / Inconvenience'),
    ]

    STATUS_CHOICES = [
        ('Submitted', 'Submitted by Citizen'),
        ('Under_Review', 'Under Administrative Scrutiny'),
        ('Action_Taken', 'Field Inquiry & Action Taken'),
        ('Resolved', 'Grievance Resolved'),
        ('Closed', 'Matter Closed'),
    ]

    grievance_code = models.CharField(max_length=50, unique=True)
    landowner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='grievances')
    land_parcel = models.ForeignKey('land.LandParcel', on_delete=models.SET_NULL, null=True, blank=True, related_name='grievances')
    project = models.ForeignKey('projects.AcquisitionProject', on_delete=models.SET_NULL, null=True, blank=True, related_name='grievances')
    
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Compensation Delay')
    description = models.TextField()

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Submitted')
    resolution_remarks = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_grievances'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.grievance_code:
            self.grievance_code = f"GRV-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.grievance_code} - {self.subject} ({self.landowner.username})"
