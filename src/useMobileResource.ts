import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { apiRequest } from './api';

export function useMobileResource<T>(path: string | null, token: string) {
  const [result, setResult] = useState<{ path: string; token: string; data: T } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  function refresh() {
    setVersion(value => value + 1);
  }
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiRequest<T>(path, { signal: controller.signal }, token)
      .then(data => {
        if (!controller.signal.aborted) setResult({ path, token, data });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(String(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, token, version]);
  return {
    data: result?.path === path && result?.token === token ? result.data : undefined,
    error,
    loading,
    refresh,
  };
}
