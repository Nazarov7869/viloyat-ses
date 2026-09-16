from django import forms
from django.contrib import admin

from .blank_templates import template_choices

from .models import District, DistrictServerConfig, Laboratory, Service


class DistrictServerConfigInline(admin.StackedInline):
    model = DistrictServerConfig
    can_delete = True
    extra = 0
    fields = (
        'is_enabled', 'base_url', 'stats_path', 'auth_type',
        'api_key_header', 'api_key', 'username', 'password',
        'last_synced_at', 'last_error',
    )
    readonly_fields = ('last_synced_at', 'last_error')


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'sort_order', 'is_active', 'has_remote_sync')
    list_editable = ('sort_order', 'is_active')
    search_fields = ('name', 'code')
    inlines = [DistrictServerConfigInline]

    def has_remote_sync(self, obj):
        config = getattr(obj, 'server_config', None)
        return bool(config and config.is_enabled and config.base_url)
    has_remote_sync.short_description = "Tashqi server ulangan"
    has_remote_sync.boolean = True


@admin.register(Laboratory)
class LaboratoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'sort_order', 'is_active')
    list_editable = ('sort_order', 'is_active')
    search_fields = ('name', 'code')


class ServiceAdminForm(forms.ModelForm):
    conclusion_template = forms.ChoiceField(
        label="Xulosa shabloni", required=False, choices=template_choices,
    )

    class Meta:
        model = Service
        fields = '__all__'


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    form = ServiceAdminForm
    list_display = ('name', 'laboratory', 'district', 'price', 'sample_type', 'is_active', 'sort_order')
    list_editable = ('price', 'is_active', 'sort_order')
    list_filter = ('laboratory', 'district', 'is_active')
    search_fields = ('name',)
