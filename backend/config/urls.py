from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import UserAdminViewSet
from admissions.views import NotificationsView
from news.views import PublicStatsView

admin_router = DefaultRouter()
admin_router.register('users', UserAdminViewSet, basename='admin-user')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/admin/', include(admin_router.urls)),
    path('api/public-stats/', PublicStatsView.as_view(), name='public-stats'),
    path('api/notifications/', NotificationsView.as_view(), name='notifications'),
    path('api/', include('catalog.urls')),
    path('api/', include('clients.urls')),
    path('api/', include('admissions.urls')),
    path('api/', include('news.urls')),
]
