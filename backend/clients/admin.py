from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'district', 'payment_status', 'status', 'registered_at')
    list_filter = ('district', 'payment_status', 'status')
    search_fields = ('last_name', 'first_name', 'phone', 'pinfl')
