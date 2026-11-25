from django.db import models
from django.conf import settings

class State(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class District(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='districts')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)
    headquarters = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['state__name', 'name']
        unique_together = ['state', 'name']

    def __str__(self):
        return f"{self.name}, {self.state.code}"


class LandParcel(models.Model):
    LAND_TYPES = [
        ('Agricultural', 'Agricultural Land'),
        ('Commercial', 'Commercial Land'),
        ('Residential', 'Residential Land'),
        ('Industrial', 'Industrial Zone'),
        ('Barren', 'Barren / Uncultivated'),
        ('Forest', 'Forest Border Land'),
    ]

    VERIFICATION_STATUS = [
        ('Pending', 'Pending Verification'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    ]

    ACQUISITION_STATUS = [
        ('Available', 'Available / Registered'),
        ('In_Acquisition', 'Under Acquisition'),
        ('Acquired', 'Fully Acquired'),
        ('Disputed', 'Disputed / In Litigation'),
    ]

    survey_number = models.CharField(max_length=50)
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name='parcels')
    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name='parcels')
    sub_division_taluk = models.CharField(max_length=100, blank=True, help_text="Taluk / Tehsil")
    village = models.CharField(max_length=100)
    
    # Area measurements
    area_acres = models.DecimalField(max_digits=10, decimal_places=3, help_text="Land area in acres")
    area_sq_meters = models.DecimalField(max_digits=12, decimal_places=2, help_text="Land area in sq. meters")
    land_type = models.CharField(max_length=30, choices=LAND_TYPES, default='Agricultural')
    market_value_per_acre = models.DecimalField(max_digits=12, decimal_places=2, default=1500000.00, help_text="Configured circle rate / standard market value in INR")

    # Geographical coordinates (realistic Indian coordinates)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    # Ownership Details
    owner_name = models.CharField(max_length=150)
    owner_contact = models.CharField(max_length=20, blank=True)
    owner_aadhaar = models.CharField(max_length=20, blank=True, help_text="Aadhaar / National ID")
    landowner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_parcels'
    )

    # Status tracking
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='Pending')
    verification_remarks = models.TextField(blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_parcels'
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    acquisition_status = models.CharField(max_length=25, choices=ACQUISITION_STATUS, default='Available')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['survey_number', 'district', 'village']

    def __str__(self):
        return f"Survey #{self.survey_number} - {self.village}, {self.district.name} ({self.owner_name})"


class OwnershipDocument(models.Model):
    DOCUMENT_TYPES = [
        ('ownership_certificate', 'Ownership Certificate / 7/12 Extract / Patta'),
        ('land_survey_document', 'Cadastral Survey Map / Land Map'),
        ('identity_document', 'Owner Identity Proof (Aadhaar / Voter ID)'),
        ('supporting_document', 'Supporting Acquisition / NoC Document'),
    ]

    VERIFICATION_STATUS = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    land_parcel = models.ForeignKey(LandParcel, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=40, choices=DOCUMENT_TYPES)
    title = models.CharField(max_length=200)
    document_file = models.FileField(upload_to='documents/%Y/%m/')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='Pending')
    remarks = models.TextField(blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()}) - {self.land_parcel.survey_number}"
