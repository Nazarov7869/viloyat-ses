from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, UserRole


class UserRoleInline(admin.StackedInline):
    model = UserRole
    can_delete = True
    extra = 0


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = [UserRoleInline]
    model = User
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active', 'role_display')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Shaxsiy ma\'lumot', {'fields': ('first_name', 'last_name')}),
        ('Ruxsatlar', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )

    def role_display(self, obj):
        role = getattr(obj, 'role_obj', None)
        return role.role if role else '—'
    role_display.short_description = 'Rol'


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'district')
    list_filter = ('role', 'district')
    search_fields = ('user__email',)
