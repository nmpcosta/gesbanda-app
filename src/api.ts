import { Platform } from 'react-native';

import config from '../app.json';

export const API_BASE_URL = config.apiBaseUrl || (
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1');

let expiredListener: ((token: string) => void) | undefined;
let requestLanguage = 'pt-PT';
export function setApiLanguage(language: 'pt' | 'en') {
  requestLanguage = language === 'en' ? 'en' : 'pt-PT';
}
export function onSessionExpired(listener: (token: string) => void) {
  expiredListener = listener;
  return () => { if (expiredListener === listener) expiredListener = undefined; };
}

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as ApiErrorPayload;

  if (data.message) {
    return data.message;
  }

  if (data.errors) {
    const firstField = Object.values(data.errors)[0];
    if (firstField && firstField.length > 0) {
      return firstField[0];
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('Accept-Language', requestLanguage);
  const isFormDataBody =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!headers.has('Content-Type') && options.body && !isFormDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && token) expiredListener?.(token);
    throw new Error(
      extractErrorMessage(payload, `Pedido falhou com HTTP ${response.status}`)
    );
  }

  return payload as T;
}
