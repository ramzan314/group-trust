function getBaseUrl(): string {
  // If explicitly set at build or runtime
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Client-side dynamic origin detection
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;

    // Local machine development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }

    // Direct port 3000 access on VPS without Nginx proxy (e.g. http://123.45.67.89:3000)
    if (port === '3000') {
      return `${protocol}//${hostname}:5001/api`;
    }

    // Standard port 80 / 443 / domain access through Nginx reverse proxy
    return '/api';
  }

  return 'http://localhost:5001/api';
}

export async function fetchAPI(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const baseUrl = getBaseUrl();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 15-second timeout controller so requests fail fast with actionable errors rather than hanging indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out reaching backend API (${baseUrl}). Please check if port 5001 is open or if Nginx is running.`);
    }
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error(`Could not connect to API server at ${baseUrl}. Ensure backend is running and not blocked by firewall.`);
    }
    throw error;
  }
}
