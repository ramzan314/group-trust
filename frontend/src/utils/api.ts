function getBaseUrl(): string {
  // If explicitly overridden via environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Client-side detection
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    
    // In local development, connect directly to the Express backend port 5001
    // to bypass any local sandbox socket restrictions
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }

    // In production (VPS / domain / public IP), use relative '/api'
    // which routes via Nginx or Next.js server rewrite
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
