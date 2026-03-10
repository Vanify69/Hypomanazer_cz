import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiRequest,
  apiRequestPublic,
  setToken,
  clearToken,
  hasToken,
  getLeads,
} from './api';

function mockRes(response: { ok: boolean; status: number; data?: unknown; error?: string }) {
  return Promise.resolve({
    ok: response.ok,
    status: response.status,
    statusCode: response.status,
    json: () => Promise.resolve(response.error != null ? { error: response.error } : response.data ?? {}),
    text: () => Promise.resolve(JSON.stringify(response.data ?? {})),
  } as Response);
}

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  describe('apiRequest', () => {
    it('returns data when response is 200', async () => {
      const data = { id: '1', name: 'Test' };
      vi.mocked(fetch).mockResolvedValueOnce(mockRes({ ok: true, status: 200, data }) as Response);

      const result = await apiRequest<typeof data>('/api/test');
      expect(result).toEqual(data);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('throws with server error message when response is 401', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockRes({ ok: false, status: 401, error: 'Neplatný token.' }) as Response
      );

      await expect(apiRequest('/api/test')).rejects.toThrow('Neplatný token.');
    });

    it('throws generic message when response is 500 and no error body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockRes({ ok: false, status: 500 }) as Response
      );

      await expect(apiRequest('/api/test')).rejects.toThrow('Chyba 500');
    });

    it('returns undefined when response is 204', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        } as Response)
      );

      const result = await apiRequest<{ x: number }>('/api/test');
      expect(result).toBeUndefined();
    });

    it('adds Authorization header when token is in localStorage', async () => {
      setToken('my-jwt-token');
      vi.mocked(fetch).mockResolvedValueOnce(mockRes({ ok: true, status: 200, data: {} }) as Response);

      await apiRequest('/api/test');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer my-jwt-token' }),
        })
      );
    });

    it('throws on network failure (fetch throws)', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiRequest('/api/test')).rejects.toThrow('Nelze se připojit k serveru');
    });
  });

  describe('apiRequestPublic', () => {
    it('returns data when response is 200', async () => {
      const data = { valid: true };
      vi.mocked(fetch).mockResolvedValueOnce(mockRes({ ok: true, status: 200, data }) as Response);

      const result = await apiRequestPublic<typeof data>('/api/ref/token');
      expect(result).toEqual(data);
    });

    it('throws on server error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockRes({ ok: false, status: 404, error: 'Neplatný odkaz.' }) as Response
      );

      await expect(apiRequestPublic('/api/ref/x')).rejects.toThrow('Neplatný odkaz.');
    });

    it('throws on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(apiRequestPublic('/api/ref/x')).rejects.toThrow('Nelze se připojit k serveru');
    });
  });

  describe('token helpers', () => {
    it('setToken and hasToken and clearToken', () => {
      expect(hasToken()).toBe(false);
      setToken('abc');
      expect(hasToken()).toBe(true);
      expect(localStorage.getItem('hypo-token')).toBe('abc');
      clearToken();
      expect(hasToken()).toBe(false);
      expect(localStorage.getItem('hypo-token')).toBeNull();
    });
  });

  describe('getLeads', () => {
    it('calls GET /api/leads and returns array', async () => {
      const leads = [{ id: '1', firstName: 'A', lastName: 'B', loanType: 'PURCHASE', source: 'OWN', status: 'DRAFT', createdAt: '', updatedAt: '' }];
      vi.mocked(fetch).mockResolvedValueOnce(mockRes({ ok: true, status: 200, data: leads }) as Response);

      const result = await getLeads();
      expect(result).toEqual(leads);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/leads$/),
        expect.any(Object)
      );
    });

    it('passes query params when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockRes({ ok: true, status: 200, data: [] }) as Response);

      await getLeads({ status: 'CONVERTED', q: 'test' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=CONVERTED'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test'),
        expect.any(Object)
      );
    });
  });

  describe('browser extension – pairing (app ↔ extension)', () => {
    /** Kontrakt: Nastavení volá pairing/start s JWT; server vrací userCode a expiresAt pro vložení do rozšíření. */
    it('pairing/start returns userCode and expiresAt (Settings page contract)', async () => {
      setToken('app-jwt');
      const data = {
        userCode: 'ABCD-EFGH',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockRes({ ok: true, status: 200, data }) as Response);

      const result = await apiRequest<{ userCode: string; expiresAt: string }>(
        '/api/integrations/browser-extension/pairing/start',
        { method: 'POST', body: {} }
      );

      expect(result.userCode).toBe('ABCD-EFGH');
      expect(result.expiresAt).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/integrations/browser-extension/pairing/start'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer app-jwt' }),
        })
      );
    });

    it('pairing/start request uses POST and correct path', async () => {
      clearToken();
      vi.mocked(fetch).mockResolvedValueOnce(
        mockRes({ ok: true, status: 200, data: { userCode: 'X', expiresAt: new Date().toISOString() } }) as Response
      );

      await apiRequest<{ userCode: string; expiresAt: string }>(
        '/api/integrations/browser-extension/pairing/start',
        { method: 'POST', body: {} }
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/integrations/browser-extension/pairing/start'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
