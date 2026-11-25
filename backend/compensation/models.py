import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

def get_today():
    return timezone.now().date()

class Compensation(models.Model):
    PAYMENT_STATUS = [
        ('Unprocessed', 'Unprocessed / Draft'),
        ('Approved', 'Sanctioned & Approved'),
        ('Disbursed', 'Disbursed / Paid (Simulated DBT)'),
        ('On_Hold', 'On Hold / Verification Issue'),
    ]

    APPROVAL_STATUS = [
        ('Draft', 'Draft Assessment'),
        ('Under_Review', 'Under Administrative Review'),
        ('Approved', 'Award Finalized'),
        ('Rejected', 'Returned for Reassessment'),
    ]

    compensation_code = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey('projects.AcquisitionProject', on_delete=models.CASCADE, related_name='compensations')
    land_parcel = models.ForeignKey('land.LandParcel', on_delete=models.CASCADE, related_name='compensations')
    landowner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='compensations')
    landowner_name = models.CharField(max_length=150)
    
    # Financial breakdown (RFCTLARR Act 2013 compliant)
    land_area_acres = models.DecimalField(max_digits=10, decimal_places=3)
    valuation_rate_per_acre = models.DecimalField(max_digits=14, decimal_places=2, help_text="Market circle rate in INR")
    base_land_value = models.DecimalField(max_digits=16, decimal_places=2, help_text="Area x Rate")
    
    # 100% Solatium mandated by Section 30(1) RFCTLARR Act 2013
    solatium_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    solatium_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0.00)
    
    # Additional components (structures, trees, borewells, livelihood rehabilitation)
    asset_compensation = models.DecimalField(max_digits=16, decimal_places=2, default=0.00, help_text="Compensation for standing assets/structures")
    rehabilitation_allowance = models.DecimalField(max_digits=16, decimal_places=2, default=0.00, help_text="Resettlement & Rehabilitation allowance")
    
    total_compensation = models.DecimalField(max_digits=16, decimal_places=2)

    # Workflow & Disbursement
    calculation_date = models.DateField(default=get_today)
    approval_status = models.CharField(max_length=25, choices=APPROVAL_STATUS, default='Draft')
    payment_status = models.CharField(max_length=25, choices=PAYMENT_STATUS, default='Unprocessed')
    disbursement_date = models.DateField(null=True, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True, help_text="Simulated DBT / PFMS transaction UTR")
    payment_mode = models.CharField(max_length=50, default='Direct Benefit Transfer (DBT/PFMS)')
    bank_account_masked = models.CharField(max_length=50, blank=True, default='SBIN0001234 - ******5678')
    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.compensation_code:
            self.compensation_code = f"CMP-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}"
        
        # Calculate base and total
        self.base_land_value = round(float(self.land_area_acres) * float(self.valuation_rate_per_acre), 2)
        self.solatium_amount = round(self.base_land_value * (float(self.solatium_percentage) / 100.0), 2)
        self.total_compensation = round(
            self.base_land_value +
            self.solatium_amount +
            float(self.asset_compensation or 0) +
            float(self.rehabilitation_allowance or 0),
            2
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.compensation_code} - ₹{self.total_compensation:,.2f} to {self.landowner_name}"
