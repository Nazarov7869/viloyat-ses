from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsProvinceOrMain, is_province
from catalog.models import District
from clients.models import Client

from .models import News
from .serializers import NewsSerializer


class NewsViewSet(viewsets.ModelViewSet):
    serializer_class = NewsSerializer
    filterset_fields = ['is_published', 'category', 'severity']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsProvinceOrMain()]

    def get_queryset(self):
        qs = News.objects.all()
        user = self.request.user
        if user and user.is_authenticated and is_province(user):
            return qs
        return qs.filter(is_published=True)


class PublicStatsView(APIView):
    """Mirrors the original public.get_public_stats() Postgres function."""

    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_clients = Client.objects.count()
        month_clients = Client.objects.filter(registered_at__gte=month_start).count()
        today_clients = Client.objects.filter(registered_at__gte=day_start).count()
        paid_count = Client.objects.filter(payment_status='tolangan').count()
        completion_rate = round(100.0 * paid_count / total_clients) if total_clients else 0
        districts = District.objects.filter(is_active=True).count()

        return Response({
            'total_clients': total_clients,
            'month_clients': month_clients,
            'today_clients': today_clients,
            'completion_rate': completion_rate,
            'districts': districts,
        })
