from django.contrib import admin

from .models import News


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'severity', 'is_published', 'published_at')
    list_filter = ('category', 'severity', 'is_published')
    search_fields = ('title', 'excerpt')
