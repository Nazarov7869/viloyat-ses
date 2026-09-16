from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from admissions.models import Admission, AdmissionItem, LabOrder
from catalog.models import District, Laboratory, Service


class PriceFlowTests(TestCase):
    """Qabul -> to'lov -> laboratoriya oqimida narxlar to'g'ri saqlanishi va ko'rsatilishi."""

    def setUp(self):
        self.district = District.objects.create(name='Jizzax shahar', code='JIZ')
        self.uxyk = Laboratory.objects.create(name="O'ta xavfli yuqumli kasalliklar laboratoriyasi", code='UXYK')
        self.virus = Laboratory.objects.create(name='Virusologiya laboratoriyasi', code='VIRUS')
        self.s1 = Service.objects.create(name='Brusellezga serologik tekshiruv', price=55000, laboratory=self.uxyk)
        self.s2 = Service.objects.create(name='Bruselli IgG IFA', price=59000, laboratory=self.uxyk)
        self.s3 = Service.objects.create(name='Gepatit B PZR', price=120000, laboratory=self.virus)

        self.qabul = User.objects.create_user('qabul@ses.local', 'x')
        UserRole.objects.create(user=self.qabul, role='qabul', district=self.district)
        self.laborant = User.objects.create_user('uxyk@ses.local', 'x')
        UserRole.objects.create(user=self.laborant, role='laborant', laboratory=self.uxyk)

        self.api = APIClient()
        self.api.force_authenticate(self.qabul)
        self.lab_api = APIClient()
        self.lab_api.force_authenticate(self.laborant)

    def payload(self, items, discount=0, paid=0, **extra):
        return {
            'client': {'first_name': 'Ali', 'last_name': 'Valiyev', 'address': 'Jizzax', 'workplace': '-'},
            'items': items, 'discount_amount': discount, 'paid_amount': paid, 'payment_method': 'naqd', **extra,
        }

    def create(self, items, **kw):
        return self.api.post('/api/admissions/', self.payload(items, **kw), format='json')

    # --- laboratoriya profilida narx ---
    def test_lab_order_shows_own_service_price(self):
        res = self.create([
            {'service_id': str(self.s1.id), 'quantity': 1},
            {'service_id': str(self.s2.id), 'quantity': 1},
            {'service_id': str(self.s3.id), 'quantity': 1},
        ], paid=234000)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Decimal(res.json()['total_amount']), Decimal('234000'))

        orders = {o['service_name']: o for o in self.lab_api.get('/api/lab-orders/').json()}
        self.assertEqual(set(orders), {self.s1.name, self.s2.name})
        self.assertEqual(Decimal(orders[self.s1.name]['item']['amount']), Decimal('55000'))
        self.assertEqual(Decimal(orders[self.s2.name]['item']['amount']), Decimal('59000'))
        # Laboratoriyaga boshqa laboratoriya analizlari summasi ko'rsatilmaydi
        self.assertNotIn('total_amount', orders[self.s1.name]['admissions'])

    def test_quantity_is_reflected_in_lab_amount(self):
        self.create([{'service_id': str(self.s1.id), 'quantity': 2}], paid=110000)
        order = self.lab_api.get('/api/lab-orders/').json()[0]
        self.assertEqual(order['item']['quantity'], 2)
        self.assertEqual(Decimal(order['item']['price']), Decimal('55000'))
        self.assertEqual(Decimal(order['item']['amount']), Decimal('110000'))

    def test_price_snapshot_survives_catalog_change(self):
        self.create([{'service_id': str(self.s1.id), 'quantity': 1}], paid=55000)
        self.s1.price = 70000
        self.s1.save()
        order = self.lab_api.get('/api/lab-orders/').json()[0]
        self.assertEqual(Decimal(order['item']['amount']), Decimal('55000'))
        adm = Admission.objects.get()
        self.assertEqual(adm.total_amount, Decimal('55000'))
        self.assertEqual(adm.payment_status, 'tolangan')

    # --- qabulda narx tekshiruvi ---
    def test_stale_price_is_rejected(self):
        """Admin narxni o'zgartirgan, qabul oynasi eski narxni ko'rsatgan bo'lsa — saqlanmaydi."""
        self.s1.price = 60000
        self.s1.save()
        res = self.create([{'service_id': str(self.s1.id), 'quantity': 1, 'expected_price': 55000}], paid=55000)
        self.assertEqual(res.status_code, 409, res.content)
        self.assertIn('narx', res.json()['detail'].lower())
        self.assertEqual(Admission.objects.count(), 0)

    def test_matching_expected_price_is_accepted(self):
        res = self.create([{'service_id': str(self.s1.id), 'quantity': 1, 'expected_price': '55000.00'}], paid=55000)
        self.assertEqual(res.status_code, 201, res.content)

    def test_negative_discount_rejected(self):
        res = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], discount=-10000)
        self.assertEqual(res.status_code, 400)

    def test_discount_above_subtotal_rejected(self):
        res = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], discount=60000)
        self.assertEqual(res.status_code, 400)

    def test_overpayment_rejected(self):
        res = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], paid=60000)
        self.assertEqual(res.status_code, 400)
        res = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], paid=-5)
        self.assertEqual(res.status_code, 400)

    def test_discount_and_partial_payment(self):
        res = self.create([
            {'service_id': str(self.s1.id), 'quantity': 1},
            {'service_id': str(self.s2.id), 'quantity': 1},
        ], discount=14000, paid=50000)
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        self.assertEqual(Decimal(data['total_amount']), Decimal('100000'))
        self.assertEqual(data['payment_status'], 'qisman')

        pay = self.api.post(f"/api/admissions/{data['id']}/add-payment/", {'amount': 60000}, format='json')
        self.assertEqual(pay.status_code, 400)  # qoldiqdan ko'p
        pay = self.api.post(f"/api/admissions/{data['id']}/add-payment/", {'amount': 50000}, format='json')
        self.assertEqual(pay.status_code, 200, pay.content)
        self.assertEqual(pay.json()['payment_status'], 'tolangan')
        pay = self.api.post(f"/api/admissions/{data['id']}/add-payment/", {'amount': 1}, format='json')
        self.assertEqual(pay.status_code, 400)  # to'liq to'langan

    # --- narxni API orqali buzib bo'lmasligi ---
    def test_admission_totals_cannot_be_patched(self):
        data = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], paid=55000).json()
        res = self.api.patch(f"/api/admissions/{data['id']}/", {'total_amount': 1000}, format='json')
        self.assertEqual(res.status_code, 405)
        self.assertEqual(Admission.objects.get().total_amount, Decimal('55000'))

    def test_admission_item_price_cannot_be_patched(self):
        data = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], paid=55000).json()
        item_id = data['admission_items'][0]['id']
        res = self.api.patch(f'/api/admission-items/{item_id}/', {'price': 1, 'quantity': 9}, format='json')
        self.assertEqual(res.status_code, 200)  # faqat o'qish maydonlari e'tiborga olinmaydi
        item = AdmissionItem.objects.get()
        self.assertEqual((item.price, item.quantity), (Decimal('55000'), 1))

    def test_moving_item_to_other_lab_moves_lab_order(self):
        data = self.create([{'service_id': str(self.s1.id), 'quantity': 1}], paid=55000).json()
        item_id = data['admission_items'][0]['id']
        res = self.api.patch(f'/api/admission-items/{item_id}/', {'laboratory_id': str(self.virus.id)}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(LabOrder.objects.get().laboratory_id, self.virus.id)
        self.assertEqual(self.lab_api.get('/api/lab-orders/').json(), [])
