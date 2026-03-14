/**
 * Google OAuth popup flow helper.
 * Otevře popup okno s Google OAuth URL a čeká na postMessage od callbacku.
 */
import { getGoogleConnectUrl } from './api';

export async function openGoogleOAuthPopup(): Promise<boolean> {
  const { url } = await getGoogleConnectUrl();

  return new Promise((resolve) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no`
    );

    if (!popup) {
      resolve(false);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-oauth-success') {
        cleanup();
        resolve(true);
      } else if (event.data?.type === 'google-oauth-error') {
        cleanup();
        resolve(false);
      }
    };

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        cleanup();
        resolve(false);
      }
    }, 500);

    function cleanup() {
      window.removeEventListener('message', handleMessage);
      clearInterval(checkClosed);
    }

    window.addEventListener('message', handleMessage);
  });
}
