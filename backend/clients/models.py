from django.db import models

from catalog.models import District
from config.base_models import TimeStampedUUIDModel

GENDER_CHOICES = [('erkak', 'Erkak'), ('ayol', 'Ayol')]


class Client(TimeStampedUUIDModel):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    birth_year = models.CharField(max_length=4)
    birth_date = models.DateField(null=True, blank=True)
    pinfl = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=30, null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    region = models.CharField(max_length=200, default='Jizzax viloyati')
    address = models.CharField(max_length=500)
    workplace = models.CharField(max_length=300)
    visit_type = models.CharField(max_length=200, null=True, blank=True)
    client_code = models.CharField(max_length=50, null=True, blank=True)
    service_type = models.CharField(max_length=300, default='Laboratoriya tekshiruvi')
    status = models.CharField(max_length=30, default='yangi')
    payment_status = models.CharField(max_length=30, default='kutilmoqda')
    payment_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.PROTECT, related_name='clients'
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-registered_at']

    def __str__(self):
        return f"{self.last_name} {self.first_name}"
