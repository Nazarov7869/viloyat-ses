from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, UserRole
from .permissions import IsMainAdmin
from .serializers import (
    AdminCreateUserSerializer,
    AdminUpdateUserSerializer,
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    MeSerializer,
    RegisterSerializer,
    UpdateEmailSerializer,
    UserSummarySerializer,
)


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': "Hisob yaratildi. Administrator sizga rol tayinlashi kerak."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateEmailSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.email = serializer.validated_data['email']
        request.user.save(update_fields=['email'])
        return Response(MeSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': "Parol muvaffaqiyatli yangilandi"})


class UserAdminViewSet(viewsets.ViewSet):
    """Superadmin (role='main') CRUD over accounts + their role/district assignment."""

    permission_classes = [IsMainAdmin]

    def get_queryset(self):
        return User.objects.select_related('role_obj', 'role_obj__district').order_by('email')

    def list(self, request):
        return Response(UserSummarySerializer(self.get_queryset(), many=True).data)

    def create(self, request):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.create_user(email=data['email'], password=data['password'])
        role = data.get('role')
        if role:
            UserRole.objects.create(user=user, role=role, district=data.get('district'))
        return Response(UserSummarySerializer(user).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        serializer = AdminUpdateUserSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if 'is_active' in data:
            user.is_active = data['is_active']
            user.save(update_fields=['is_active'])

        if 'role' in data or 'district' in data:
            role_obj = getattr(user, 'role_obj', None)
            if role_obj is None:
                role_obj = UserRole(user=user, role=data.get('role') or 'qabul')
            if data.get('role'):
                role_obj.role = data['role']
            if 'district' in data:
                role_obj.district = data['district']
            role_obj.save()

        user.refresh_from_db()
        return Response(UserSummarySerializer(user).data)

    def destroy(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        if user.pk == request.user.pk:
            raise ValidationError("O'zingizni o'chira olmaysiz.")
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
