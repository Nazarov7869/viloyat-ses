from datetime import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    DistrictScopedMixin,
    HasAnyRole,
    IsProvinceStaffLaborantOrDistrict,
    is_district_staff,
    is_province,
    user_district_id,
    user_laboratory_id,
    user_role,
)
from clients.models import Client

from .models import Admission, AdmissionItem, LabOrder, Payment
from .serializers import (
    AddPaymentSerializer,
    AdmissionCreateSerializer,
    AdmissionItemSerializer,
    AdmissionSerializer,
    LabOrderDetailSerializer,
)


class AdmissionViewSet(DistrictScopedMixin, viewsets.ModelViewSet):
    serializer_class = AdmissionSerializer
    filterset_fields = ['payment_status', 'process_status']
    queryset = (
        Admission.objects.select_related('client', 'district')
        .prefetch_related('items', 'lab_orders')
        .all()
    )

    def create(self, request, *args, **kwargs):
        """
        Atomically creates the client, admission, admission items, an optional
        first payment, and any lab orders that follow from the selected services —
        replacing the original 5-step client-driven insert sequence (which could
        leave an orphaned client/admission behind if a later step failed).
        """
        user = request.user
        if not is_district_staff(user):
            raise PermissionDenied("Foydalanuvchiga tuman biriktirilmagan, qabul yarata olmaydi.")
        district_id = user_district_id(user)

        payload = AdmissionCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        client_data = data['client']
        items_data = data['items']

        for item in items_data:
            service_district_id = item['service_id'].district_id
            if service_district_id is not None and str(service_district_id) != str(district_id):
                raise PermissionDenied(
                    f"\"{item['service_id'].name}\" xizmati sizning tumaningizda mavjud emas."
                )

        subtotal = sum(item['service_id'].price * item['quantity'] for item in items_data)
        discount = data['discount_amount']
        total = max(subtotal - discount, 0)
        paid = data['paid_amount']
        payment_status = 'tolanmagan' if paid <= 0 else ('tolangan' if paid >= total else 'qisman')

        with transaction.atomic():
            client = Client.objects.create(
                first_name=client_data['first_name'].strip(),
                last_name=client_data['last_name'].strip(),
                birth_date=client_data.get('birth_date'),
                birth_year=(
                    str(client_data['birth_date'].year)
                    if client_data.get('birth_date')
                    else str(datetime.now().year)
                ),
                phone=client_data.get('phone') or None,
                gender=client_data.get('gender') or 'erkak',
                region=client_data.get('region') or 'Jizzax viloyati',
                address=client_data['address'].strip(),
                workplace=(client_data.get('workplace') or '').strip() or '—',
                visit_type=client_data.get('visit_type'),
                service_type=items_data[0]['service_id'].name,
                district_id=district_id,
                status='yangi',
            )

            admission = Admission.objects.create(
                client=client,
                district_id=district_id,
                operator_id=user.id,
                operator_name=user.email,
                total_amount=total,
                discount_amount=discount,
                paid_amount=paid,
                payment_method=data['payment_method'],
                payment_status=payment_status,
                process_status='yollandi',
            )

            created_items = []
            for item in items_data:
                service = item['service_id']
                created_items.append(
                    AdmissionItem.objects.create(
                        admission=admission,
                        service=service,
                        service_name=service.name,
                        sample_type=service.sample_type,
                        price=service.price,
                        quantity=item['quantity'],
                        laboratory=service.laboratory,
                        district_id=district_id,
                    )
                )

            if paid > 0:
                Payment.objects.create(
                    admission=admission,
                    district_id=district_id,
                    amount=paid,
                    method=data['payment_method'],
                    operator_id=user.id,
                    operator_name=user.email,
                )
                client.payment_status = 'tolangan' if payment_status == 'tolangan' else 'kutilmoqda'
                client.payment_amount = paid
                client.payment_date = timezone.now()
                client.save(update_fields=['payment_status', 'payment_amount', 'payment_date'])

            for admission_item in created_items:
                if admission_item.laboratory_id:
                    LabOrder.objects.create(
                        admission=admission,
                        admission_item=admission_item,
                        client=client,
                        laboratory=admission_item.laboratory,
                        district_id=district_id,
                        service_name=admission_item.service_name,
                        sample_type=admission_item.sample_type,
                        status='yangi',
                        operator_name=user.email,
                    )

        admission.refresh_from_db()
        return Response(AdmissionSerializer(admission).data, status=201)

    @action(detail=True, methods=['post'], url_path='add-payment')
    def add_payment(self, request, pk=None):
        """Atomically records a payment and syncs admission/client totals in one transaction."""
        admission = self.get_object()
        payload = AddPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        amount = payload.validated_data['amount']
        method = payload.validated_data['method']
        user = request.user

        with transaction.atomic():
            Payment.objects.create(
                admission=admission,
                district=admission.district,
                amount=amount,
                method=method,
                operator_id=user.id,
                operator_name=user.email,
            )
            new_paid = admission.paid_amount + amount
            status_ = 'tolangan' if new_paid >= admission.total_amount else 'qisman'
            admission.paid_amount = new_paid
            admission.payment_status = status_
            admission.payment_method = method
            admission.save(update_fields=['paid_amount', 'payment_status', 'payment_method', 'updated_at'])

            client = admission.client
            client.payment_status = 'tolangan' if status_ == 'tolangan' else 'kutilmoqda'
            client.payment_amount = new_paid
            client.payment_date = timezone.now()
            client.save(update_fields=['payment_status', 'payment_amount', 'payment_date'])

        admission.refresh_from_db()
        return Response(AdmissionSerializer(admission).data)


class AdmissionItemViewSet(DistrictScopedMixin, viewsets.ModelViewSet):
    """Read + laboratory-reassignment only — items are otherwise created via AdmissionViewSet.create()."""

    queryset = AdmissionItem.objects.select_related('admission', 'service', 'laboratory', 'district').all()
    serializer_class = AdmissionItemSerializer
    http_method_names = ['get', 'patch', 'head', 'options']


class LabOrderViewSet(viewsets.ModelViewSet):
    """
    Laboratory work-queue. Province roles see every district (a central lab
    receives samples from all districts); a laborant is scoped to their own
    assigned laboratory only; other staff stay scoped to their own district.
    """

    queryset = LabOrder.objects.select_related('client', 'admission', 'laboratory', 'district').all()
    serializer_class = LabOrderDetailSerializer
    permission_classes = [IsProvinceStaffLaborantOrDistrict]
    filterset_fields = ['laboratory', 'status']
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_province(user):
            return qs
        if user_role(user) == 'laborant':
            laboratory_id = user_laboratory_id(user)
            return qs.filter(laboratory_id=laboratory_id) if laboratory_id else qs.none()
        if is_district_staff(user):
            return qs.filter(district_id=user_district_id(user))
        return qs.none()


READY_LAB_STATUSES = ('natija_tayyor', 'natija_tasdiqlandi', 'yakunlandi')


class NotificationsView(APIView):
    """
    Real activity feed for the header bell — recently registered clients, recorded
    payments, and completed lab results. Derived from existing tables (no dedicated
    notifications table), scoped the same way as everything else: province roles and
    laborants see everything, district staff see only their own district.
    """

    permission_classes = [HasAnyRole]

    def get(self, request):
        user = request.user
        province_wide = is_province(user) or user_role(user) == 'laborant'
        if not province_wide and not is_district_staff(user):
            return Response([])
        district_id = None if province_wide else user_district_id(user)

        clients_qs = Client.objects.all()
        payments_qs = Payment.objects.select_related('admission__client')
        lab_qs = LabOrder.objects.select_related('client').filter(status__in=READY_LAB_STATUSES)
        if district_id:
            clients_qs = clients_qs.filter(district_id=district_id)
            payments_qs = payments_qs.filter(district_id=district_id)
            lab_qs = lab_qs.filter(district_id=district_id)

        clients_qs = clients_qs.order_by('-registered_at')[:10]
        payments_qs = payments_qs.order_by('-paid_at')[:10]
        lab_qs = lab_qs.order_by('-updated_at')[:10]

        items = []
        for c in clients_qs:
            items.append({
                'id': f'client-{c.id}',
                'type': 'client',
                'title': f'{c.last_name} {c.first_name}'.strip(),
                'message': "Yangi mijoz ro'yxatdan o'tdi",
                'created_at': c.registered_at,
            })
        for p in payments_qs:
            client = p.admission.client if p.admission else None
            items.append({
                'id': f'payment-{p.id}',
                'type': 'payment',
                'title': f'{client.last_name} {client.first_name}'.strip() if client else "To'lov",
                'message': f"To'lov qabul qilindi: {p.amount} so'm",
                'created_at': p.paid_at,
            })
        for o in lab_qs:
            items.append({
                'id': f'lab-{o.id}',
                'type': 'lab_order',
                'title': f'{o.client.last_name} {o.client.first_name}'.strip() if o.client else o.service_name,
                'message': f'{o.service_name}: natija tayyor',
                'created_at': o.updated_at,
            })

        items.sort(key=lambda x: x['created_at'], reverse=True)
        return Response(items[:15])
