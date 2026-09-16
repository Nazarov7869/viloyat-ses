from datetime import datetime

from django.db import models, transaction

from catalog.models import District, Laboratory, Service
from clients.models import Client
from config.base_models import TimeStampedUUIDModel


class OrderSequence(models.Model):
    year = models.IntegerField(unique=True)
    last_value = models.IntegerField(default=0)


class ReceiptSequence(models.Model):
    day_key = models.CharField(max_length=8, unique=True)
    last_value = models.IntegerField(default=0)


def generate_order_number():
    year = datetime.now().year
    with transaction.atomic():
        seq, _ = OrderSequence.objects.select_for_update().get_or_create(
            year=year, defaults={'last_value': 0}
        )
        seq.last_value += 1
        seq.save(update_fields=['last_value'])
        return f"SES-JIZ-{year}-{seq.last_value:06d}"


def generate_receipt_number():
    day_key = datetime.now().strftime('%Y%m%d')
    with transaction.atomic():
        seq, _ = ReceiptSequence.objects.select_for_update().get_or_create(
            day_key=day_key, defaults={'last_value': 0}
        )
        seq.last_value += 1
        seq.save(update_fields=['last_value'])
        return f"CHEK-{day_key}-{seq.last_value:05d}"


class Admission(TimeStampedUUIDModel):
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='admissions')
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL, related_name='admissions'
    )
    operator_id = models.UUIDField(null=True, blank=True)
    operator_name = models.CharField(max_length=200, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=30, default='naqd')
    payment_status = models.CharField(max_length=30, default='tolanmagan')
    process_status = models.CharField(max_length=30, default='qabul_qilindi')
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number


class AdmissionItem(TimeStampedUUIDModel):
    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name='items')
    service = models.ForeignKey(
        Service, null=True, blank=True, on_delete=models.SET_NULL, related_name='admission_items'
    )
    service_name = models.CharField(max_length=300)
    sample_type = models.CharField(max_length=200, null=True, blank=True)
    price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    quantity = models.IntegerField(default=1)
    laboratory = models.ForeignKey(
        Laboratory, null=True, blank=True, on_delete=models.SET_NULL, related_name='admission_items'
    )
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL, related_name='admission_items'
    )

    def __str__(self):
        return self.service_name


class Payment(TimeStampedUUIDModel):
    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name='payments')
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments'
    )
    receipt_number = models.CharField(max_length=50, unique=True, editable=False)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    method = models.CharField(max_length=30, default='naqd')
    operator_id = models.UUIDField(null=True, blank=True)
    operator_name = models.CharField(max_length=200, null=True, blank=True)
    paid_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            self.receipt_number = generate_receipt_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.receipt_number


class LabOrder(TimeStampedUUIDModel):
    admission = models.ForeignKey(Admission, on_delete=models.CASCADE, related_name='lab_orders')
    admission_item = models.ForeignKey(
        AdmissionItem, null=True, blank=True, on_delete=models.CASCADE, related_name='lab_orders'
    )
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='lab_orders')
    laboratory = models.ForeignKey(Laboratory, on_delete=models.PROTECT, related_name='lab_orders')
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL, related_name='lab_orders'
    )
    service_name = models.CharField(max_length=300)
    sample_type = models.CharField(max_length=200, null=True, blank=True)
    status = models.CharField(max_length=30, default='yangi')
    result_text = models.TextField(null=True, blank=True)
    result_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.CharField(max_length=200, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    operator_name = models.CharField(max_length=200, null=True, blank=True)
    # Xulosa blankasi: tanlangan shablon kaliti va blankaga yozilgan qiymatlar
    # ({maydon_nomi: matn}). Shablonlar frontend/public/blanks/manifest.json da.
    conclusion_template = models.CharField(max_length=60, blank=True, default='')
    conclusion_data = models.JSONField(default=dict, blank=True)
    conclusion_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.service_name} — {self.status}"
