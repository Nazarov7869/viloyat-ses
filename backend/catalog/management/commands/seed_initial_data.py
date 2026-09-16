import os
from pathlib import Path

from django.conf import settings
from django.core import serializers
from django.core.management.base import BaseCommand

from accounts.models import User, UserRole


class Command(BaseCommand):
    """
    Idempotent first-boot setup for a fresh deployment:
    1. Loads the districts/laboratories/services fixture (safe to re-run — same UUIDs).
    2. Creates one 'main' admin account from ADMIN_EMAIL/ADMIN_PASSWORD env vars,
       only if no 'main' user exists yet.
    """

    help = "Seed catalog fixture and create the initial admin account if missing."

    def handle(self, *args, **options):
        fixture = Path(settings.BASE_DIR) / 'seed_catalog.json'
        if fixture.exists():
            # Faqat bazada hali yo'q yozuvlar qo'shiladi: admin panelda qilingan
            # o'zgarishlar (narx, xulosa shabloni va h.k.) har qayta ishga
            # tushirishda ustidan yozib yuborilmasin.
            created = 0
            with fixture.open(encoding='utf-8') as fh:
                for obj in serializers.deserialize('json', fh):
                    model = type(obj.object)
                    if not model.objects.filter(pk=obj.object.pk).exists():
                        obj.save()
                        created += 1
            self.stdout.write(self.style.SUCCESS(f"Catalog fixture: {created} ta yangi yozuv qo'shildi ({fixture})"))
        else:
            self.stdout.write(self.style.WARNING(f"No fixture at {fixture}, skipping catalog seed"))

        if UserRole.objects.filter(role='main').exists():
            self.stdout.write("A 'main' admin already exists — skipping admin creation.")
            return

        email = os.environ.get('ADMIN_EMAIL')
        password = os.environ.get('ADMIN_PASSWORD')
        if not email or not password:
            self.stdout.write(self.style.WARNING(
                "ADMIN_EMAIL/ADMIN_PASSWORD not set — no admin account created."
            ))
            return

        user, created = User.objects.get_or_create(
            email=email.strip().lower(),
            defaults={'is_staff': True, 'is_superuser': True, 'is_active': True},
        )
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        UserRole.objects.update_or_create(user=user, defaults={'role': 'main', 'district': None})
        self.stdout.write(self.style.SUCCESS(f"Created initial main admin: {email}"))
