import { useEffect, useState } from 'react';
import { adminApi } from '../../services/admin';
export function useAdminResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const key = `${path}|${version}`;
  const [state, setState] = useState<{ key: string; data: T | null; error: string }>({
    key: '',
    data: null,
    error: '',
  });
  useEffect(() => {
    let active = true;
    adminApi<T>(path)
      .then((data) => {
        if (active) setState({ key, data, error: '' });
      })
      .catch((error) => {
        if (active)
          setState({
            key,
            data: null,
            error: error instanceof Error ? error.message : 'Não foi possível carregar o catálogo.',
          });
      });
    return () => {
      active = false;
    };
  }, [path, key]);
  const loading = state.key !== key;
  return {
    data: loading ? null : state.data,
    error: loading ? '' : state.error,
    loading,
    reload: () => setVersion((value) => value + 1),
  };
}
