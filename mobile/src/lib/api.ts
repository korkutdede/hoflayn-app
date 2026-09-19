import type { ApiEnvelope } from '@hoflayn/contracts';
import { DEFAULT_LOCALE } from '@hoflayn/i18n';
import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export class HoflaynApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'HoflaynApiError';
  }
}

/**
 * Decides which language the API answers in. The workbench UI is Turkish by
 * default; keep API copy on the same locale until in-app language switching
 * exists on mobile.
 */
function deviceLanguage(): string {
  return DEFAULT_LOCALE;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated: boolean,
): Promise<T> {
  if (!API_URL) {
    throw new HoflaynApiError(
      'api_url_missing',
      'EXPO_PUBLIC_API_URL tanımlı değil.',
      0,
    );
  }

  const headers = new Headers(init.headers);
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', deviceLanguage());
  }
  if (authenticated) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new HoflaynApiError(
        'missing_session',
        'Oturum açman gerekiyor.',
        401,
      );
    }
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const error = payload.ok
      ? { code: 'request_failed', message: 'İstek başarısız.' }
      : payload.error;
    throw new HoflaynApiError(error.code, error.message, response.status);
  }
  return payload.data;
}

export function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return request<T>(path, init, true);
}

export function publicApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return request<T>(path, init, false);
}
