from django.contrib import admin

from .models import Admission, AdmissionItem, LabOrder, Payment


class AdmissionItemInline(admin.TabularInline):
    model = AdmissionItem
    extra = 0


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'client', 'district', 'total_amount', 'payment_status', 'process_status', 'created_at')
    list_filter = ('district', 'payment_status', 'process_status')
    search_fields = ('order_number', 'client__first_name', 'client__last_name')
    inlines = [AdmissionItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'admission', 'amount', 'method', 'paid_at')
    search_fields = ('receipt_number', 'admission__order_number')


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ('service_name', 'client', 'laboratory', 'district', 'status', 'created_at')
    list_filter = ('laboratory', 'status', 'district')
    search_fields = ('service_name', 'client__first_name', 'client__last_name')
