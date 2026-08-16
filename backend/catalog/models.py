from django.db import models

from config.base_models import TimeStampedUUIDModel


class District(TimeStampedUUIDModel):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, unique=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class DistrictServerConfig(TimeStampedUUIDModel):
    """
    Connection details for a district's own, separately-deployed SES server.
    Filled in via Django admin once the real address/credentials are known —
    no code changes needed to wire up a new district.
    """

    AUTH_NONE = 'none'
    AUTH_API_KEY = 'api_key'
    AUTH_BEARER = 'bearer'
    AUTH_BASIC = 'basic'
    AUTH_CHOICES = [
        (AUTH_NONE, "Yo'q (ochiq)"),
        (AUTH_API_KEY, "API kalit (maxsus header)"),
        (AUTH_BEARER, "Bearer token"),
        (AUTH_BASIC, "Login/parol (Basic auth)"),
    ]

    district = models.OneToOneField(District, on_delete=models.CASCADE, related_name='server_config')
    base_url = models.URLField(blank=True, help_text="Masalan: https://arnasoy-ses.uz/api")
    stats_path = models.CharField(
        max_length=200, default='/stats/', help_text="base_url'ga qo'shiladigan statistika endpointi"
    )
    auth_type = models.CharField(max_length=20, choices=AUTH_CHOICES, default=AUTH_NONE)
    api_key_header = models.CharField(
        max_length=100, blank=True, default='X-API-Key', help_text="'API kalit' rejimida ishlatiladigan header nomi"
    )
    api_key = models.CharField(max_length=300, blank=True)
    username = models.CharField(max_length=150, blank=True)
    password = models.CharField(max_length=300, blank=True)
    is_enabled = models.BooleanField(default=False)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return f"{self.district.name} — server sozlamasi"


class Laboratory(TimeStampedUUIDModel):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'laboratories'

    def __str__(self):
        return self.name


class Service(TimeStampedUUIDModel):
    CONCLUSION_TEMPLATE_CHOICES = [
        ('', "Umumiy (standart) xulosa blankasi"),
        ('brutselloz_ifa', "Bruselloz IFA (IgM/IgG)"),
        ('trichomonas_candida_ifa', "Trichomonas/Candida IFA (IgM/IgG)"),
        ('echinokokk_ifa', "Exinokokk IFA (IgM/IgG)"),
        ('brutselloz_serological', "Bruselloz seroligik xulosasi (Heddelson/Rayt)"),
    ]

    name = models.CharField(max_length=300)
    service_type = models.CharField(max_length=200, default='Laboratoriya tekshiruvi')
    sample_type = models.CharField(max_length=200, default='Namuna')
    price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    conclusion_template = models.CharField(
        max_length=50, choices=CONCLUSION_TEMPLATE_CHOICES, default='', blank=True,
        help_text="Bo'sh = umumiy xulosa blankasi ishlatiladi.",
    )
    laboratory = models.ForeignKey(
        Laboratory, null=True, blank=True, on_delete=models.SET_NULL, related_name='services'
    )
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL, related_name='services',
        help_text="Bo'sh = barcha tumanlar uchun umumiy xizmat. To'ldirilsa, faqat shu tuman qabulida tanlash mumkin.",
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name
