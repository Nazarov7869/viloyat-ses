import api, { tokenStorage } from "./api";

export interface AuthMe {
  user_id: string;
  email: string;
  role: string | null;
  district_id: string | null;
  district_name: string | null;
  laboratory_id: string | null;
  laboratory_code: string | null;
  laboratory_name: string | null;
  is_province: boolean;
}

interface LoginResponse {
  access: string;
  refresh: string;
  role: string | null;
  district_id: string | null;
  district_name: string | null;
  laboratory_id: string | null;
  laboratory_code: string | null;
  laboratory_name: string | null;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login/", { email, password });
  tokenStorage.setTokens(data.access, data.refresh);
  return data;
}

export async function register(email: string, password: string): Promise<void> {
  await api.post("/auth/register/", { email, password });
}

export async function logout(): Promise<void> {
  const refresh = tokenStorage.getRefresh();
  try {
    if (refresh) await api.post("/auth/logout/", { refresh });
  } finally {
    tokenStorage.clear();
  }
}

export async function fetchMe(): Promise<AuthMe | null> {
  if (!tokenStorage.getAccess()) return null;
  try {
    const { data } = await api.get<AuthMe>("/auth/me/");
    return data;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!tokenStorage.getAccess();
}

export async function updateEmail(email: string): Promise<AuthMe> {
  const { data } = await api.patch<AuthMe>("/auth/me/", { email });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
