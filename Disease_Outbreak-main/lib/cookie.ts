// Simple cookie utility for SSR and client
export function getCookie(name: string): string | undefined {
  if (typeof window !== 'undefined') {
    // Client-side
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : undefined;
  } else if (typeof require !== 'undefined') {
    // Server-side: Next.js can use headers, but fallback for edge
    // This is a placeholder. For full SSR, use next/headers or pass cookie from req.
    return undefined;
  }
}

export function setCookie(name: string, value: string, days = 365) {
  if (typeof window !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  }
}
