from rest_framework import serializers

from .models import District, Laboratory, Service


class DistrictSerializer(serializers.ModelSerializer):
    has_remote_sync = serializers.SerializerMethodField()

    class Meta:
        model = District
        fields = ['id', 'name', 'code', 'sort_order', 'is_active', 'has_remote_sync', 'created_at', 'updated_at']

    def get_has_remote_sync(self, obj):
        config = getattr(obj, 'server_config', None)
        return bool(config and config.is_enabled and config.base_url)


class LaboratorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Laboratory
        fields = ['id', 'name', 'code', 'description', 'sort_order', 'is_active', 'created_at', 'updated_at']


class ServiceSerializer(serializers.ModelSerializer):
    laboratory_id = serializers.PrimaryKeyRelatedField(
        source='laboratory', queryset=Laboratory.objects.all(), allow_null=True, required=False
    )
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), allow_null=True, required=False
    )
    district_name = serializers.CharField(source='district.name', read_only=True, default=None)

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'service_type', 'sample_type', 'price', 'conclusion_template',
            'laboratory_id', 'district_id', 'district_name', 'is_active', 'sort_order',
            'created_at', 'updated_at',
        ]
