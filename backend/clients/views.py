from rest_framework import viewsets

from accounts.permissions import DistrictScopedMixin

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(DistrictScopedMixin, viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filterset_fields = ['payment_status', 'status', 'district']
