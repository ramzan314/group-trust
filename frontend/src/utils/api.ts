function getBaseUrl(): string {
  // If explicitly overridden via environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // In the browser, use relative path '/api'.
  // Next.js rewrites proxy this directly to the backend on localhost:5001,
  // completely eliminating the need to open port 5001 in cloud firewalls or configure CORS.
  if (typeof window !== 'undefined') {
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
      throw new Error(`Request timed out reaching API (${baseUrl}). Please check if backend is running.`);
    }
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error(`Could not connect to API server at ${baseUrl}. Ensure backend service is running.`);
    }
    throw error;
  }
}
