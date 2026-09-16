from decimal import Decimal

from django.utils import timezone

from rest_framework import serializers

from catalog.blank_templates import is_valid_template
from catalog.models import District, Laboratory, Service
from clients.models import Client
from clients.serializers import ClientSerializer

from .models import Admission, AdmissionItem, LabOrder, Payment


class AdmissionItemSerializer(serializers.ModelSerializer):
    admission_id = serializers.PrimaryKeyRelatedField(
        source='admission', queryset=Admission.objects.all(), required=False
    )
    service_id = serializers.PrimaryKeyRelatedField(
        source='service', queryset=Service.objects.all(), allow_null=True, required=False
    )
    laboratory_id = serializers.PrimaryKeyRelatedField(
        source='laboratory', queryset=Laboratory.objects.all(), allow_null=True, required=False
    )
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = AdmissionItem
        fields = [
            'id', 'admission_id', 'service_id', 'service_name', 'sample_type', 'price',
            'quantity', 'laboratory_id', 'district_id', 'created_at',
        ]
        # Narx, miqdor va xizmat faqat qabul yaratilganda serverda belgilanadi;
        # keyin faqat laboratoriyani o'zgartirish mumkin.
        read_only_fields = [
            'admission_id', 'service_id', 'service_name', 'sample_type', 'price',
            'quantity', 'district_id', 'created_at',
        ]

    def get_fields(self):
        fields = super().get_fields()
        for name in self.Meta.read_only_fields:
            fields[name].read_only = True
        return fields


class LabOrderSerializer(serializers.ModelSerializer):
    admission_id = serializers.PrimaryKeyRelatedField(
        source='admission', queryset=Admission.objects.all(), required=False
    )
    admission_item_id = serializers.PrimaryKeyRelatedField(
        source='admission_item', queryset=AdmissionItem.objects.all(), allow_null=True, required=False
    )
    client_id = serializers.PrimaryKeyRelatedField(
        source='client', queryset=Client.objects.all(), required=False
    )
    laboratory_id = serializers.PrimaryKeyRelatedField(source='laboratory', queryset=Laboratory.objects.all())
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = LabOrder
        fields = [
            'id', 'admission_id', 'admission_item_id', 'client_id', 'laboratory_id', 'district_id',
            'service_name', 'sample_type', 'status', 'result_text', 'result_at', 'approved_by',
            'approved_at', 'operator_name', 'created_at', 'updated_at',
            'conclusion_template', 'conclusion_data', 'conclusion_updated_at',
        ]
        read_only_fields = ['conclusion_updated_at']


MAX_CONCLUSION_FIELDS = 3000
MAX_CONCLUSION_VALUE = 5000


class LabOrderDetailSerializer(LabOrderSerializer):
    """Adds nested client/admission summaries for the laboratory work-queue screen."""

    clients = serializers.SerializerMethodField()
    admissions = serializers.SerializerMethodField()
    item = serializers.SerializerMethodField()
    default_conclusion_template = serializers.SerializerMethodField()

    class Meta(LabOrderSerializer.Meta):
        fields = LabOrderSerializer.Meta.fields + ['clients', 'admissions', 'item', 'default_conclusion_template']

    def get_item(self, obj):
        """Shu buyurtmaning o'z analizi narxi (qabul vaqtidagi narx, miqdor bilan)."""
        item = obj.admission_item
        if not item:
            return None
        return {
            'price': str(item.price),
            'quantity': item.quantity,
            'amount': str(item.price * item.quantity),
        }

    def get_default_conclusion_template(self, obj):
        """Xizmat (analiz) uchun admin panelda belgilangan blanka."""
        item = obj.admission_item
        if item and item.service:
            return item.service.conclusion_template
        return ''

    def validate_conclusion_template(self, value):
        value = (value or '').strip()
        if not is_valid_template(value):
            raise serializers.ValidationError("Bunday xulosa shabloni mavjud emas.")
        return value

    def validate_conclusion_data(self, value):
        if value in (None, ''):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Blanka ma'lumotlari obyekt ko'rinishida bo'lishi kerak.")
        if len(value) > MAX_CONCLUSION_FIELDS:
            raise serializers.ValidationError("Blanka maydonlari soni juda ko'p.")
        clean = {}
        for key, val in value.items():
            if not isinstance(key, str) or len(key) > 60:
                raise serializers.ValidationError("Noto'g'ri maydon nomi.")
            if val is None:
                continue
            if not isinstance(val, str):
                raise serializers.ValidationError(f"'{key}' maydoni matn bo'lishi kerak.")
            if len(val) > MAX_CONCLUSION_VALUE:
                raise serializers.ValidationError(f"'{key}' maydoni juda uzun.")
            if val.strip():
                clean[key] = val
        return clean

    def update(self, instance, validated_data):
        if 'conclusion_data' in validated_data or 'conclusion_template' in validated_data:
            instance.conclusion_updated_at = timezone.now()
        return super().update(instance, validated_data)

    def get_clients(self, obj):
        c = obj.client
        return {
            'first_name': c.first_name,
            'last_name': c.last_name,
            'phone': c.phone,
            'pinfl': c.pinfl,
            'address': c.address,
            'birth_year': c.birth_year,
        }

    def get_admissions(self, obj):
        a = obj.admission
        # Qabulning umumiy summasi (boshqa laboratoriyalar analizlari bilan birga)
        # laboratoriyaga berilmaydi — u shu analiz narxi deb noto'g'ri ko'rinardi.
        return {
            'order_number': a.order_number,
            'payment_status': a.payment_status,
        }


class PaymentSerializer(serializers.ModelSerializer):
    admission_id = serializers.PrimaryKeyRelatedField(
        source='admission', queryset=Admission.objects.all(), required=False
    )
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'admission_id', 'district_id', 'receipt_number', 'amount', 'method',
            'operator_id', 'operator_name', 'paid_at', 'created_at',
        ]
        read_only_fields = ['receipt_number', 'paid_at', 'created_at']


class AdmissionSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(source='client', queryset=Client.objects.all())
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), allow_null=True, required=False
    )
    clients = ClientSerializer(source='client', read_only=True)
    admission_items = AdmissionItemSerializer(source='items', many=True, read_only=True)
    lab_orders = LabOrderSerializer(many=True, read_only=True)

    class Meta:
        model = Admission
        fields = [
            'id', 'order_number', 'client_id', 'district_id', 'operator_id', 'operator_name',
            'total_amount', 'discount_amount', 'paid_amount', 'payment_method', 'payment_status',
            'process_status', 'notes', 'created_at', 'updated_at',
            'clients', 'admission_items', 'lab_orders',
        ]
        read_only_fields = ['order_number', 'created_at', 'updated_at']


# ---- Composite write payloads (used by the atomic create / add-payment actions) ----

class NewClientInputSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    birth_date = serializers.DateField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    gender = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)
    region = serializers.CharField(max_length=200, required=False, allow_blank=True)
    address = serializers.CharField(max_length=500)
    workplace = serializers.CharField(max_length=300)
    visit_type = serializers.CharField(max_length=200, required=False, allow_blank=True, allow_null=True)


class NewAdmissionItemInputSerializer(serializers.Serializer):
    service_id = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1, max_value=100, default=1)
    # Qabul oynasida ko'rsatilgan narx. Berilgan bo'lsa va katalogdagi narxdan farq
    # qilsa (admin narxni o'zgartirgan), qabul saqlanmaydi — kassir yangilashi kerak.
    expected_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0'),
    )


class AdmissionCreateSerializer(serializers.Serializer):
    client = NewClientInputSerializer()
    items = NewAdmissionItemInputSerializer(many=True, allow_empty=False)
    discount_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, default=0, min_value=Decimal('0'),
    )
    paid_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, default=0, min_value=Decimal('0'),
    )
    payment_method = serializers.CharField(max_length=30, default='naqd')

    def validate(self, attrs):
        subtotal = sum(i['service_id'].price * i['quantity'] for i in attrs['items'])
        discount = attrs.get('discount_amount') or Decimal('0')
        if discount > subtotal:
            raise serializers.ValidationError(
                {'discount_amount': "Chegirma analizlar summasidan katta bo'lishi mumkin emas."}
            )
        total = subtotal - discount
        if (attrs.get('paid_amount') or Decimal('0')) > total:
            raise serializers.ValidationError(
                {'paid_amount': f"To'langan summa jami summadan ({total:,.0f} so'm) ko'p bo'lishi mumkin emas."}
            )
        attrs['subtotal'] = subtotal
        attrs['total'] = total
        return attrs


class AddPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    method = serializers.CharField(max_length=30, default='naqd')
