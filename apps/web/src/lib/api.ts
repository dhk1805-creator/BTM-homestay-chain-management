const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('hcmp_refresh') : null;
  if (!refreshToken) return null;
  try {
    const payload = JSON.parse(atob(refreshToken.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) { logout(); return null; }
    localStorage.setItem('hcmp_token', refreshToken);
    return refreshToken;
  } catch { logout(); return null; }
}

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hcmp_token') : null;
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }), ...options?.headers },
    ...options,
  });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retry = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + newToken, ...options?.headers },
        ...options,
      });
      if (!retry.ok) { const e = await retry.json().catch(() => ({ message: retry.statusText })); throw new Error(e.message || 'API Error ' + retry.status); }
      return retry.json();
    }
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  }
  if (!res.ok) { const e = await res.json().catch(() => ({ message: res.statusText })); throw new Error(e.message || 'API Error ' + res.status); }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken: string; user: { id: string; name: string; email: string; role: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem('hcmp_token', data.accessToken);
  localStorage.setItem('hcmp_refresh', data.refreshToken);
  localStorage.setItem('hcmp_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('hcmp_token');
  localStorage.removeItem('hcmp_refresh');
  localStorage.removeItem('hcmp_user');
  window.location.href = '/login';
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('hcmp_user');
  return raw ? JSON.parse(raw) : null;
}
