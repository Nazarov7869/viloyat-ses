from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsProvinceOrMain, ReadOnlyOrProvince

from .models import District, Laboratory, Service
from .remote_sync import all_district_stats
from .serializers import DistrictSerializer, LaboratorySerializer, ServiceSerializer


class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [ReadOnlyOrProvince]
    filterset_fields = ['is_active']


class LaboratoryViewSet(viewsets.ModelViewSet):
    queryset = Laboratory.objects.all()
    serializer_class = LaboratorySerializer
    permission_classes = [ReadOnlyOrProvince]
    filterset_fields = ['is_active', 'code']


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [ReadOnlyOrProvince]
    filterset_fields = ['is_active', 'laboratory', 'district']


class DistrictStatsView(APIView):
    """
    Aggregated per-district numbers for the viloyat/districts dashboards — pulled
    from each district's own server when one is configured (see DistrictServerConfig),
    otherwise computed from locally-stored clients.
    """

    permission_classes = [IsProvinceOrMain]

    def get(self, request):
        districts = District.objects.filter(is_active=True).select_related('server_config').order_by('sort_order')
        return Response(all_district_stats(districts))
