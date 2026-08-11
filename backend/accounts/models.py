from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from catalog.models import District
from config.base_models import TimeStampedUUIDModel

ROLE_CHOICES = [
    ('main', 'Bosh admin'),
    ('qabul', 'Qabul'),
    ('payment', "To'lov"),
    ('registrants', "Ro'yxatdan o'tganlar"),
    ('viloyat', 'Viloyat nazoratchisi'),
    ('laborant', 'Laborant'),
]


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email manzili kiritilishi shart")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser is_staff=True bo\'lishi shart')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser is_superuser=True bo\'lishi shart')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedUUIDModel):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email


class UserRole(TimeStampedUUIDModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='role_obj')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.CASCADE, related_name='user_roles'
    )

    def __str__(self):
        return f"{self.user.email} — {self.role}"
