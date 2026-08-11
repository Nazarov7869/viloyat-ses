from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DistrictStatsView, DistrictViewSet, LaboratoryViewSet, ServiceViewSet

router = DefaultRouter()
router.register('districts', DistrictViewSet, basename='district')
router.register('laboratories', LaboratoryViewSet, basename='laboratory')
router.register('services', ServiceViewSet, basename='service')

urlpatterns = [
    path('districts/stats/', DistrictStatsView.as_view(), name='district-stats'),
] + router.urls
