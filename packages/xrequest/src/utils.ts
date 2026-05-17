import type { RequestConfig, RequestHeaders } from './types';

export function buildURL(url: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryString}`;
}

export function mergeHeaders(
  globalHeaders: RequestHeaders = {},
  configHeaders: RequestHeaders = {}
): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(globalHeaders)) {
    if (value != null) {
      merged[key.toLowerCase()] = String(value);
    }
  }

  for (const [key, value] of Object.entries(configHeaders)) {
    if (value != null) {
      merged[key.toLowerCase()] = String(value);
    }
  }

  return merged;
}

export function mergeConfig<T>(
  global: RequestConfig<T>,
  config: RequestConfig<T>
): RequestConfig<T> {
  return {
    ...global,
    ...config,
    headers: mergeHeaders(global.headers as RequestHeaders, config.headers as RequestHeaders),
  };
}

export function formatHeaders(headers: Headers | Record<string, string> | string[][]): Record<string, string> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[key.toLowerCase()] = value;
    }
  } else {
    for (const [key, value] of Object.entries(headers)) {
      result[key.toLowerCase()] = value;
    }
  }

  return result;
}

export function calculateProgress(loaded: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((loaded / total) * 100);
}

export function isAbsoluteURL(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function combineURLs(baseURL: string, relativeURL: string): string {
  return `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`;
}

export function buildFullPath(baseURL: string | undefined, url: string): string {
  if (!baseURL) return url;
  if (isAbsoluteURL(url)) return url;
  return combineURLs(baseURL, url);
}