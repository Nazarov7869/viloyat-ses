from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from catalog.models import District, Laboratory

from .models import ROLE_CHOICES, User, UserRole


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'email', 'password']

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu elektron pochta allaqachon ro'yxatdan o'tgan")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


def _role_payload(user):
    role = getattr(user, 'role_obj', None)
    if not role:
        return {
            'role': None, 'district_id': None, 'district_name': None,
            'laboratory_id': None, 'laboratory_code': None, 'laboratory_name': None,
        }
    return {
        'role': role.role,
        'district_id': str(role.district_id) if role.district_id else None,
        'district_name': role.district.name if role.district else None,
        'laboratory_id': str(role.laboratory_id) if role.laboratory_id else None,
        'laboratory_code': role.laboratory.code if role.laboratory else None,
        'laboratory_name': role.laboratory.name if role.laboratory else None,
    }


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data.update(_role_payload(self.user))
        return data


class MeSerializer(serializers.Serializer):
    user_id = serializers.CharField(source='id')
    email = serializers.EmailField()
    role = serializers.SerializerMethodField()
    district_id = serializers.SerializerMethodField()
    district_name = serializers.SerializerMethodField()
    laboratory_id = serializers.SerializerMethodField()
    laboratory_code = serializers.SerializerMethodField()
    laboratory_name = serializers.SerializerMethodField()
    is_province = serializers.SerializerMethodField()

    def get_role(self, user):
        return _role_payload(user)['role']

    def get_district_id(self, user):
        return _role_payload(user)['district_id']

    def get_district_name(self, user):
        return _role_payload(user)['district_name']

    def get_laboratory_id(self, user):
        return _role_payload(user)['laboratory_id']

    def get_laboratory_code(self, user):
        return _role_payload(user)['laboratory_code']

    def get_laboratory_name(self, user):
        return _role_payload(user)['laboratory_name']

    def get_is_province(self, user):
        role = getattr(user, 'role_obj', None)
        return bool(role and role.role in ('main', 'viloyat'))


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'district']


class UpdateEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = value.strip().lower()
        current_user = self.context['request'].user
        if User.objects.filter(email__iexact=value).exclude(pk=current_user.pk).exists():
            raise serializers.ValidationError("Bu elektron pochta band")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Joriy parol noto'g'ri")
        return value


# ---- Superadmin (role='main') user management ----

class UserSummarySerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    district_id = serializers.SerializerMethodField()
    district_name = serializers.SerializerMethodField()
    laboratory_id = serializers.SerializerMethodField()
    laboratory_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'is_active', 'is_superuser', 'created_at', 'role',
            'district_id', 'district_name', 'laboratory_id', 'laboratory_name',
        ]

    def get_role(self, obj):
        role = getattr(obj, 'role_obj', None)
        return role.role if role else None

    def get_district_id(self, obj):
        role = getattr(obj, 'role_obj', None)
        return str(role.district_id) if role and role.district_id else None

    def get_district_name(self, obj):
        role = getattr(obj, 'role_obj', None)
        return role.district.name if role and role.district else None

    def get_laboratory_id(self, obj):
        role = getattr(obj, 'role_obj', None)
        return str(role.laboratory_id) if role and role.laboratory_id else None

    def get_laboratory_name(self, obj):
        role = getattr(obj, 'role_obj', None)
        return role.laboratory.name if role and role.laboratory else None


class AdminCreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False, allow_null=True)
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), required=False, allow_null=True
    )
    laboratory_id = serializers.PrimaryKeyRelatedField(
        source='laboratory', queryset=Laboratory.objects.all(), required=False, allow_null=True
    )

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu elektron pochta allaqachon ro'yxatdan o'tgan")
        return value


class AdminUpdateUserSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False, allow_null=True)
    district_id = serializers.PrimaryKeyRelatedField(
        source='district', queryset=District.objects.all(), required=False, allow_null=True
    )
    laboratory_id = serializers.PrimaryKeyRelatedField(
        source='laboratory', queryset=Laboratory.objects.all(), required=False, allow_null=True
    )
    is_active = serializers.BooleanField(required=False)
