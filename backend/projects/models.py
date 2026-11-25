from django.db import models
from django.conf import settings
from django.utils import timezone

def get_today():
    return timezone.now().date()

class AcquisitionProject(models.Model):
    CATEGORY_CHOICES = [
        ('Highway', 'National / State Highway Expansion'),
        ('Railway', 'Dedicated Freight & High Speed Railway'),
        ('Airport', 'Greenfield & Brownfield Airport'),
        ('Industrial Development', 'Industrial Corridor & SEZ'),
        ('Other Infrastructure', 'Other Strategic Infrastructure (Port, Dam, Power)'),
    ]

    STATUS_CHOICES = [
        ('Planning', 'Planning & Survey'),
        ('Land_Identification', 'Land Identification (Sec 4)'),
        ('Document_Verification', 'Document & Title Verification'),
        ('Compensation_Assessment', 'Compensation Assessment (Sec 23)'),
        ('In_Progress', 'Acquisition & Handover In Progress'),
        ('Completed', 'Project Completed & Possessed'),
        ('Delayed', 'Delayed / Pending Clearance'),
    ]

    name = models.CharField(max_length=250)
    project_code = models.CharField(max_length=50, unique=True, help_text="e.g. NHAI-DL-2026-01")
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default='Highway')
    description = models.TextField(blank=True)
    
    state = models.ForeignKey('land.State', on_delete=models.PROTECT, related_name='projects')
    district = models.ForeignKey('land.District', on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')
    executing_agency = models.CharField(max_length=150, help_text="e.g. NHAI, DMRC, CIDCO, AAI, Ministry of Railways")
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_projects'
    )

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Planning')
    target_land_area_acres = models.DecimalField(max_digits=12, decimal_places=2, default=100.0)
    estimated_budget = models.DecimalField(max_digits=16, decimal_places=2, default=50000000.00, help_text="Estimated budget in INR")
    
    start_date = models.DateField(default=get_today)
    expected_completion_date = models.DateField()
    actual_completion_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project_code} - {self.name} ({self.get_category_display()})"

    @property
    def is_delayed(self):
        if self.status != 'Completed' and self.expected_completion_date:
            return timezone.now().date() > self.expected_completion_date
        return False


class ProjectLandParcel(models.Model):
    PARCEL_ACQ_STATUS = [
        ('Identified', 'Identified (Sec 4 Gazette)'),
        ('Surveyed', 'Joint Survey Completed'),
        ('Approved_For_Acquisition', 'Acquisition Sanctioned'),
        ('Compensation_Determined', 'Award Announced (Sec 30)'),
        ('Acquired', 'Physical Possession Taken'),
    ]

    project = models.ForeignKey(AcquisitionProject, on_delete=models.CASCADE, related_name='project_parcels')
    land_parcel = models.ForeignKey('land.LandParcel', on_delete=models.CASCADE, related_name='project_links')
    status = models.CharField(max_length=30, choices=PARCEL_ACQ_STATUS, default='Identified')
    compensation_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['project', 'land_parcel']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.project.project_code} <-> Parcel #{self.land_parcel.survey_number}"
