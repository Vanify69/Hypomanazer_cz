/** V dev režimu prázdné (proxy). V produkci URL API na Railway (bez VITE_ kvůli Railpack „secret not found“). */
export const API_BASE = import.meta.env.DEV
  ? ''
  : 'https://hypomanazercz-production.up.railway.app';

const getToken = (): string | null => localStorage.getItem('hypo-token');

/** Po 401 odhlásíme a aplikace přesměruje na login. */
export const AUTH_UNAUTHORIZED_EVENT = 'hypo-unauthorized';

function notifyUnauthorized(): void {
  if (typeof window === 'undefined') return;
  clearToken();
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
}

/** Chyba při síťovém požadavku – backend neběží nebo je špatná adresa. */
const NETWORK_ERROR_MSG =
  (API_BASE
    ? `Nelze se připojit k serveru. Spusťte backend (v adresáři server: npm run dev). API: ${API_BASE}`
    : 'Nelze se připojit k serveru. Spusťte backend na portu 4000 (v adresáři server: npm run dev).') +
  ' V DevTools (záložka Síť) zkontrolujte, že nemáte zapnutý režim „Offline“.';

/** Zpráva když prohlížeč hlásí offline (nebo je v DevTools zapnutý režim Offline). */
export const OFFLINE_HINT =
  'Režim offline: zkontrolujte internetové připojení a v DevTools (záložka Síť) zkontrolujte, že nemáte zapnutý režim „Offline“. Spusťte také backend (v adresáři server: npm run dev).';

const FETCH_TIMEOUT_MS = 25000;

function wrapNetworkError(err: unknown): never {
  if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    throw new Error(offline ? OFFLINE_HINT : NETWORK_ERROR_MSG);
  }
  if (err instanceof Error) throw err;
  throw new Error(String(err));
}

/** AbortController + timeout, aby requesty nevisely donekonečna. */
function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(to));
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, {
      ...rest,
      headers,
      ...(body !== undefined && body !== null ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError')
      throw new Error('Požadavek vypršel. Zkuste to znovu.');
    wrapNetworkError(e);
  }

  if (res!.status === 401) {
    notifyUnauthorized();
    throw new Error('Session vypršela. Přihlaste se znovu.');
  }
  if (res!.status === 204) return undefined as T;
  const data = await res!.json().catch(() => ({}));
  if (!res!.ok) throw new Error(data?.error ?? `Chyba ${res!.status}`);
  return data as T;
}

/** Veřejné API (bez auth) – pro intake a ref stránky. */
export async function apiRequestPublic<T>(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      ...(body !== undefined && body !== null ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message.includes('fetch')))
      throw new Error('Nelze se připojit k serveru.');
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Chyba ${res.status}`);
  return data as T;
}

export async function apiUpload<T>(
  path: string,
  file: File,
  type: string
): Promise<T> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch (e) {
    wrapNetworkError(e);
  }
  const data = await res!.json().catch(() => ({}));
  if (!res!.ok) throw new Error(data?.error ?? `Chyba ${res!.status}`);
  return data as T;
}

/** Vytvoří případ z více souborů. Typy volitelné – při nevyplnění se dokumenty rozpoznají automaticky (OCR). */
export async function apiCreateCaseFromFiles<T>(
  files: File[],
  types?: string[]
): Promise<T> {
  const token = getToken();
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  if (types && types.length >= files.length) {
    form.append('types', types.slice(0, files.length).join(','));
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/cases/from-files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch (e) {
    wrapNetworkError(e);
  }
  const data = await res!.json().catch(() => ({}));
  if (!res!.ok) throw new Error(data?.error ?? `Chyba ${res!.status}`);
  return data as T;
}

export function setToken(token: string): void {
  localStorage.setItem('hypo-token', token);
}

export function clearToken(): void {
  localStorage.removeItem('hypo-token');
}

export function hasToken(): boolean {
  return !!getToken();
}

// --- Leady ---
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  loanType: string;
  note?: string;
  source: string;
  referrerId?: string;
  referrer?: { id: string; displayName: string };
  status: string;
  convertedCaseId?: string;
  createdAt: string;
  updatedAt: string;
  intakeSession?: { id: string; state: string; expiresAt: string; intakeLink?: string };
}

export async function getLeads(params?: {
  status?: string;
  loanType?: string;
  source?: string;
  q?: string;
  deleted?: boolean;
}): Promise<Lead[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.loanType) search.set('loanType', params.loanType);
  if (params?.source) search.set('source', params.source);
  if (params?.q) search.set('q', params.q);
  if (params?.deleted) search.set('deleted', 'true');
  const qs = search.toString();
  return apiRequest<Lead[]>(`/api/leads${qs ? `?${qs}` : ''}`);
}

export async function getLead(id: string): Promise<Lead & { uploadSlots?: unknown[] }> {
  return apiRequest<Lead & { uploadSlots?: unknown[] }>(`/api/leads/${id}`);
}

export async function createLead(body: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  loanType: string;
  note?: string;
  source?: 'OWN' | 'REFERRER';
  referrerId?: string;
}): Promise<Lead & { intakeLink: string; expiresAt: string }> {
  return apiRequest<Lead & { intakeLink: string; expiresAt: string }>('/api/leads', {
    method: 'POST',
    body,
  });
}

export async function updateLead(
  id: string,
  body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    loanType?: string;
    note?: string;
    source?: 'OWN' | 'REFERRER';
    referrerId?: string | null;
  }
): Promise<Lead> {
  return apiRequest<Lead>(`/api/leads/${id}`, {
    method: 'PATCH',
    body,
  });
}

export async function sendLeadLink(
  id: string,
  channels: ('sms' | 'email')[]
): Promise<{ ok: boolean; sent: { sms: boolean; email: boolean } }> {
  return apiRequest(`/api/leads/${id}/send-link`, {
    method: 'POST',
    body: { channels },
  });
}

export async function regenerateLeadLink(id: string): Promise<{
  ok: boolean;
  intakeLink: string;
  expiresAt: string;
}> {
  return apiRequest(`/api/leads/${id}/regenerate-link`, { method: 'POST' });
}

export async function expireLead(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/leads/${id}/expire`, { method: 'POST' });
}

/** Přesun leadu do koše (soft delete). */
export async function deleteLead(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/leads/${id}/delete`, { method: 'POST' });
}

/** Obnovení leadu z koše. */
export async function restoreLead(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/leads/${id}/restore`, { method: 'POST' });
}

/** Trvalé odstranění leadu (pouze z koše). */
export async function deleteLeadPermanently(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/leads/${id}`, { method: 'DELETE' });
}

/** Vytvoření intake odkazů u leadu v konceptu (např. lead od tipaře bez vygenerovaného odkazu). */
export async function createLeadIntake(id: string): Promise<{
  intakeLink: string;
  expiresAt: string;
  message?: string;
}> {
  return apiRequest(`/api/leads/${id}/create-intake`, { method: 'POST' });
}

// --- Tipaři (referrers) ---
export interface Referrer {
  id: string;
  type: string;
  displayName: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  payoutMethod: string;
  agreedCommissionPercent?: number;
  bankAccount?: string;
  invoiceCompanyName?: string;
  invoiceIco?: string;
  invoiceDic?: string;
  createdAt: string;
  updatedAt: string;
  leadCount?: number;
}

export async function getReferrers(params?: { q?: string; type?: string }): Promise<Referrer[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.type) search.set('type', params.type);
  const qs = search.toString();
  return apiRequest<Referrer[]>(`/api/referrers${qs ? `?${qs}` : ''}`);
}

export async function getReferrer(id: string): Promise<Referrer> {
  return apiRequest<Referrer>(`/api/referrers/${id}`);
}

export async function createReferrer(body: {
  type: string;
  displayName: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  payoutMethod?: string;
  agreedCommissionPercent?: number;
  bankAccount?: string;
  invoiceCompanyName?: string;
  invoiceIco?: string;
  invoiceDic?: string;
}): Promise<Referrer & { referrerLink: string; expiresAt: string }> {
  return apiRequest<Referrer & { referrerLink: string; expiresAt: string }>('/api/referrers', {
    method: 'POST',
    body,
  });
}

export async function updateReferrer(
  id: string,
  body: {
    type?: string;
    displayName?: string;
    registrationNumber?: string;
    email?: string;
    phone?: string;
    payoutMethod?: string;
    agreedCommissionPercent?: number;
    bankAccount?: string;
    invoiceCompanyName?: string;
    invoiceIco?: string;
    invoiceDic?: string;
  }
): Promise<Referrer> {
  return apiRequest<Referrer>(`/api/referrers/${id}`, {
    method: 'PATCH',
    body,
  });
}

export async function regenerateReferrerLink(id: string): Promise<{
  referrerLink: string;
  expiresAt: string;
}> {
  return apiRequest<{ referrerLink: string; expiresAt: string }>(`/api/referrers/${id}/regenerate-link`, {
    method: 'POST',
  });
}

export async function sendReferrerLink(id: string, channels: ('sms' | 'email')[]): Promise<{ ok: boolean; sent: { sms: boolean; email: boolean } }> {
  return apiRequest(`/api/referrers/${id}/send-link`, {
    method: 'POST',
    body: { channels },
  });
}

// --- Kalendář ---
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type: 'meeting' | 'task' | 'reminder' | 'call';
  startAt: string;
  endAt?: string | null;
  allDay: boolean;
  location?: string | null;
  caseId?: string | null;
  case?: { id: string; jmeno: string } | null;
  leadId?: string | null;
  lead?: { id: string; firstName: string; lastName: string } | null;
  reminderMinutes?: number | null;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventInput {
  title: string;
  type: 'meeting' | 'task' | 'reminder' | 'call';
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  caseId?: string;
  leadId?: string;
  reminderMinutes?: number;
}

export async function getCalendarEvents(params: {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  caseId?: string;
  status?: string;
}): Promise<CalendarEvent[]> {
  const search = new URLSearchParams();
  if (params.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params.dateTo) search.set('dateTo', params.dateTo);
  if (params.type) search.set('type', params.type);
  if (params.caseId) search.set('caseId', params.caseId);
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  return apiRequest<CalendarEvent[]>(`/api/calendar/events${qs ? `?${qs}` : ''}`);
}

export async function getCalendarEvent(id: string): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/api/calendar/events/${id}`);
}

export async function createCalendarEvent(data: CalendarEventInput): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>('/api/calendar/events', {
    method: 'POST',
    body: data,
  });
}

export async function updateCalendarEvent(id: string, data: Partial<CalendarEventInput> & { status?: string }): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/api/calendar/events/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  return apiRequest<void>(`/api/calendar/events/${id}`, { method: 'DELETE' });
}

export async function completeCalendarEvent(id: string): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/api/calendar/events/${id}/complete`, { method: 'PATCH' });
}

// --- Google integrace ---

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  scopes?: string[];
  connectedAt?: string;
}

export async function getGoogleConnectUrl(): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/api/integrations/google/connect');
}

export async function getGoogleStatus(): Promise<GoogleConnectionStatus> {
  return apiRequest<GoogleConnectionStatus>('/api/integrations/google/status');
}

export async function disconnectGoogle(): Promise<void> {
  return apiRequest<void>('/api/integrations/google/disconnect', { method: 'DELETE' });
}

export async function syncGoogleCalendar(): Promise<{ ok: boolean; pulled: number; pushed: number }> {
  return apiRequest<{ ok: boolean; pulled: number; pushed: number }>('/api/integrations/google/calendar/sync', { method: 'POST' });
}

export async function syncGoogleCalendarEvent(eventId: string): Promise<{ ok: boolean; googleEventId: string | null }> {
  return apiRequest<{ ok: boolean; googleEventId: string | null }>(`/api/integrations/google/calendar/sync/${eventId}`, { method: 'POST' });
}
