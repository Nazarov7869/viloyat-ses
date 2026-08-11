from rest_framework import serializers

from catalog.models import District

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = Client
        fields = [
            'id', 'first_name', 'last_name', 'birth_year', 'birth_date', 'pinfl', 'phone',
            'gender', 'region', 'address', 'workplace', 'visit_type', 'client_code',
            'service_type', 'status', 'payment_status', 'payment_amount', 'payment_date',
            'notes', 'district_id', 'registered_at', 'created_at',
        ]
        read_only_fields = ['registered_at', 'created_at']
