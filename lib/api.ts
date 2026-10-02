let refreshing: Promise<Response> | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const perform = () =>
    fetch(`/api/v1${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  let response = await perform();
  if (response.status === 401 && !path.startsWith('/auth/')) {
    refreshing ||= fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).finally(() => {
      refreshing = null;
    });
    const refreshed = await refreshing;
    if (refreshed.ok) response = await perform();
  }
  const result = await response
    .json()
    .catch(() => ({ error: 'The service is temporarily unavailable.' }));
  if (!response.ok) throw new ApiError(result.error || 'Please try again.', response.status);
  return result as T;
}
export const send = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});
