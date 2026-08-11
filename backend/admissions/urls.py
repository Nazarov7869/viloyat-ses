from rest_framework.routers import DefaultRouter

from .views import AdmissionItemViewSet, AdmissionViewSet, LabOrderViewSet

router = DefaultRouter()
router.register('admissions', AdmissionViewSet, basename='admission')
router.register('admission-items', AdmissionItemViewSet, basename='admission-item')
router.register('lab-orders', LabOrderViewSet, basename='lab-order')

urlpatterns = router.urls
