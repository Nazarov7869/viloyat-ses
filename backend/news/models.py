from django.db import models

from config.base_models import TimeStampedUUIDModel

SEVERITY_CHOICES = [('new', 'Yangi'), ('urgent', 'Shoshilinch'), ('completed', 'Yakunlangan')]


class News(TimeStampedUUIDModel):
    title = models.CharField(max_length=300)
    excerpt = models.CharField(max_length=500)
    content = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=100, default='Epidemiologiya')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='new')
    source = models.CharField(max_length=200, null=True, blank=True)
    published_at = models.DateTimeField(auto_now_add=True)
    is_ai_generated = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['-published_at']
        verbose_name_plural = 'news'

    def __str__(self):
        return self.title
