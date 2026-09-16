from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from admissions.models import Admission, AdmissionItem, LabOrder
from catalog.models import District, Laboratory, Service
from clients.models import Client


class LabOrderConclusionTests(TestCase):
    def setUp(self):
        self.district = District.objects.create(name='Test tumani', code='TEST')
        self.lab = Laboratory.objects.create(name="O'ta xavfli yuqumli kasalliklar", code='uxyk')
        self.other_lab = Laboratory.objects.create(name='Bakteriologiya', code='BAKX')
        self.service = Service.objects.create(
            name='Bruselloz IFA', price=1000, laboratory=self.lab, conclusion_template='brutselloz_ifa',
        )
        client = Client.objects.create(
            first_name='Ali', last_name='Valiyev', birth_year='1990', address='Jizzax',
            workplace='-', district=self.district,
        )
        admission = Admission.objects.create(client=client, district=self.district)
        item = AdmissionItem.objects.create(
            admission=admission, service=self.service, service_name=self.service.name,
            laboratory=self.lab, district=self.district,
        )
        self.order = LabOrder.objects.create(
            admission=admission, admission_item=item, client=client, laboratory=self.lab,
            district=self.district, service_name=self.service.name,
        )
        self.laborant = User.objects.create_user('uxyk@ses.local', 'x')
        UserRole.objects.create(user=self.laborant, role='laborant', laboratory=self.lab)
        self.api = APIClient()
        self.api.force_authenticate(self.laborant)
        self.url = f'/api/lab-orders/{self.order.id}/'

    def test_list_returns_default_template(self):
        res = self.api.get('/api/lab-orders/', {'laboratory': self.lab.id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()[0]['default_conclusion_template'], 'brutselloz_ifa')
        self.assertEqual(res.json()[0]['conclusion_data'], {})

    def test_laborant_saves_conclusion(self):
        payload = {
            'status': 'natija_tayyor',
            'conclusion_template': 'brutselloz_ifa',
            'conclusion_data': {'f1': '12', 'f2': 'Valiyev Ali', 'f3': '   '},
        }
        res = self.api.patch(self.url, payload, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.conclusion_template, 'brutselloz_ifa')
        self.assertEqual(self.order.conclusion_data, {'f1': '12', 'f2': 'Valiyev Ali'})
        self.assertIsNotNone(self.order.conclusion_updated_at)
        self.assertEqual(self.order.status, 'natija_tayyor')

    def test_unknown_template_rejected(self):
        res = self.api.patch(self.url, {'conclusion_template': 'yoq_shablon'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_bad_data_rejected(self):
        res = self.api.patch(self.url, {'conclusion_data': {'f1': 5}}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.api.patch(self.url, {'conclusion_data': ['x']}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_laborant_cannot_move_order_to_other_lab(self):
        res = self.api.patch(self.url, {'laboratory_id': str(self.other_lab.id)}, format='json')
        self.assertEqual(res.status_code, 403)
        self.order.refresh_from_db()
        self.assertEqual(self.order.laboratory_id, self.lab.id)

    def test_laborant_does_not_see_other_lab_orders(self):
        other = User.objects.create_user('bak@ses.local', 'x')
        UserRole.objects.create(user=other, role='laborant', laboratory=self.other_lab)
        api = APIClient()
        api.force_authenticate(other)
        self.assertEqual(api.get('/api/lab-orders/').json(), [])
        self.assertEqual(api.patch(self.url, {'result_text': 'x'}, format='json').status_code, 404)

    def test_laboratory_lookup_is_case_insensitive(self):
        res = self.api.get('/api/laboratories/', {'code': 'UXYK'})
        self.assertEqual([lab['code'] for lab in res.json()], ['uxyk'])

    def test_service_template_validation(self):
        admin = User.objects.create_user('admin@ses.local', 'x')
        UserRole.objects.create(user=admin, role='main')
        api = APIClient()
        api.force_authenticate(admin)
        url = f'/api/services/{self.service.id}/'
        self.assertEqual(api.patch(url, {'conclusion_template': 'bak_antibiotik'}, format='json').status_code, 200)
        self.assertEqual(api.patch(url, {'conclusion_template': 'nimadir'}, format='json').status_code, 400)


class SeedCommandTests(TestCase):
    def test_seed_does_not_overwrite_admin_changes(self):
        call_command('seed_initial_data', verbosity=0)
        service = Service.objects.first()
        service.conclusion_template = 'bak_antibiotik'
        service.price = 777
        service.save()
        call_command('seed_initial_data', verbosity=0)
        service.refresh_from_db()
        self.assertEqual(service.conclusion_template, 'bak_antibiotik')
        self.assertEqual(service.price, 777)
