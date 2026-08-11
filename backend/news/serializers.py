from rest_framework import serializers

from .models import News


class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = [
            'id', 'title', 'excerpt', 'content', 'category', 'severity', 'source',
            'published_at', 'is_ai_generated', 'is_published', 'created_at', 'updated_at',
        ]
        read_only_fields = ['published_at', 'created_at', 'updated_at']
