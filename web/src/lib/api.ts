const TOKEN_KEY = 'hypo-token';

const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://hypomanazercz-production.up.railway.app');

const APP_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : (import.meta.env.VITE_APP_URL || '');

interface AuthResponse {
  user: { id: string; email: string; name: string | null };
  token: string;
}

async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error ?? `Chyba ${res.status}`);
  }

  return data as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await authRequest('/api/auth/login', { email, password });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  const data = await authRequest('/api/auth/register', { email, password, name });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export function redirectToApp(token: string): void {
  if (APP_URL) {
    window.location.href = `${APP_URL}?auth_token=${encodeURIComponent(token)}`;
  } else {
    localStorage.setItem(TOKEN_KEY, token);
    window.location.href = '/';
  }
}
