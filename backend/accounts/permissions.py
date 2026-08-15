from rest_framework.permissions import SAFE_METHODS, BasePermission


def get_role(user):
    return getattr(user, 'role_obj', None)


def user_role(user):
    role = get_role(user)
    return role.role if role else None


def user_district_id(user):
    role = get_role(user)
    return role.district_id if role else None


def user_laboratory_id(user):
    role = get_role(user)
    return role.laboratory_id if role else None


def is_province(user):
    """Mirrors public.is_province_viewer(): role is 'main' or 'viloyat'."""
    role = get_role(user)
    return bool(role and role.role in ('main', 'viloyat'))


def is_district_staff(user):
    """Mirrors public.is_district_staff(): role isn't 'viloyat' and has a district assigned."""
    role = get_role(user)
    return bool(role and role.role != 'viloyat' and role.district_id)


class HasAnyRole(BasePermission):
    """Authenticated and has a UserRole assigned at all."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and get_role(request.user))


class IsProvinceOrMain(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_province(request.user))


class IsMainAdmin(BasePermission):
    """Superadmin-only gate: user management is restricted to role='main', not 'viloyat'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and user_role(request.user) == 'main')


class ReadOnlyOrProvince(BasePermission):
    """Any authenticated user can read; only main/viloyat can write. Used for shared catalogs."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_province(user)


class IsProvinceOrDistrictStaff(BasePermission):
    """Read/write access gate for district-scoped resources; queryset filtering happens separately."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return is_province(user) or is_district_staff(user)


class IsProvinceStaffLaborantOrDistrict(BasePermission):
    """
    Gate for lab_orders: province roles and laborants get province-wide access
    (labs serve every district), everyone else needs a matching district.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return is_province(user) or user_role(user) == 'laborant' or is_district_staff(user)


class DistrictScopedMixin:
    """
    Scopes a ViewSet's queryset/writes to the requesting user's district, unless the
    user is province-level (main/viloyat), matching the original Postgres RLS policies.
    `district_lookup` is the ORM filter kwarg for the model's district FK (e.g. "district_id").
    """

    district_lookup = 'district_id'
    permission_classes = [IsProvinceOrDistrictStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_province(user):
            return qs
        if is_district_staff(user):
            return qs.filter(**{self.district_lookup: user_district_id(user)})
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if is_district_staff(user):
            serializer.save(**{self.district_lookup: user_district_id(user)})
        else:
            serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if is_district_staff(user) and not is_province(user):
            serializer.save(**{self.district_lookup: user_district_id(user)})
        else:
            serializer.save()
