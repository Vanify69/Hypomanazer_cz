import { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Unplug, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { getGoogleStatus, disconnectGoogle, syncGoogleCalendar, type GoogleConnectionStatus } from '../../lib/api';
import { openGoogleOAuthPopup } from '../../lib/google-oauth';

export function GoogleCalendarCard() {
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getGoogleStatus();
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const success = await openGoogleOAuthPopup();
      if (success) {
        await fetchStatus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Připojení selhalo.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Opravdu chcete odpojit Google účet? Lokální události zůstanou zachovány.')) return;
    try {
      await disconnectGoogle();
      setStatus({ connected: false });
      setSyncResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Odpojení selhalo.');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await syncGoogleCalendar();
      setSyncResult(`Synchronizováno: ${result.pushed} odesláno do Google, ${result.pulled} staženo z Google.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Synchronizace selhala.');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Calendar
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Synchronizujte události z HypoManažeru do Google Calendar — budou viditelné na všech vašich zařízeních.
        </p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {syncResult && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {syncResult}
          </div>
        )}

        {status?.connected ? (
          <>
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Připojeno</p>
                <p className="text-xs text-green-600 dark:text-green-400">{status.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronizuji…' : 'Synchronizovat nyní'}
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Unplug className="w-4 h-4" />
                Odpojit
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-500">
              Nové události se automaticky synchronizují. Použijte tlačítko výše pro ruční synchronizaci všech událostí.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Připojte svůj Google účet pro automatickou synchronizaci kalendářových událostí.
              Po připojení se vaše schůzky, úkoly a připomínky zobrazí i v Google Calendar na telefonu.
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {connecting ? 'Připojuji…' : 'Připojit Google účet'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
