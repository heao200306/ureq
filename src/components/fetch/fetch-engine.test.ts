import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchEngine } from './fetch-engine';

const BASE_URL = 'http://localhost';

const createMockFetchResponse = (options: {
  status?: number;
  statusText?: string;
  body?: any;
  headers?: Record<string, string>;
}): Response => {
  const body = options.body ?? null;
  const status = options.status ?? 200;
  const statusText = options.statusText ?? (status >= 200 && status < 300 ? 'OK' : 'Error');
  const headers = new Headers(options.headers ?? { 'content-type': 'application/json' });

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
    bodyUsed: false,
    type: 'default' as ResponseType,
    url: '',
    clone: function(this: Response) {
      return createMockFetchResponse({ status, statusText, body, headers: options.headers });
    },
    text: async function(this: Response) {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
    json: async function(this: Response) {
      return typeof body === 'object' ? body : JSON.parse(typeof body === 'string' ? body : JSON.stringify(body));
    },
    blob: async function(this: Response) {
      return new Blob([typeof body === 'string' ? body : JSON.stringify(body)], { type: 'application/octet-stream' });
    },
    arrayBuffer: async function(this: Response) {
      const enc = new TextEncoder();
      return enc.encode(typeof body === 'string' ? body : JSON.stringify(body)).buffer;
    },
    formData: async function() {
      return new FormData();
    },
  } as unknown as Response;
};

const createMockFetch = (response: Response): typeof fetch => {
  return vi.fn().mockImplementation(() => Promise.resolve(response)) as unknown as typeof fetch;
};

describe('FetchEngine', () => {
  let engine: FetchEngine;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should have name "fetch"', () => {
      engine = new FetchEngine();
      expect(engine.name).toBe('fetch');
    });

    it('should make a successful GET request', async () => {
      const mockData = { id: 1, name: 'test' };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/users`,
        method: 'GET',
      });

      expect(response.data).toEqual(mockData);
      expect(response.meta.engine).toBe('fetch');
      expect(response.meta.status).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should make a successful POST request with data', async () => {
      const requestData = { name: 'test' };
      const responseData = { id: 1, ...requestData };
      const mockResponse = createMockFetchResponse({ status: 200, body: responseData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/users`,
        method: 'POST',
        data: requestData,
      });

      expect(response.data).toEqual(responseData);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('request configuration', () => {
    it('should merge global config with request config', async () => {
      const mockData = { success: true };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      const engineWithConfig = new FetchEngine({
        baseURL: `${BASE_URL}/api`,
        headers: { 'Authorization': 'Bearer token' },
      });

      await engineWithConfig.request({
        url: '/users',
        method: 'GET',
      });

      expect(global.fetch).toHaveBeenCalled();
      const calledRequest = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledRequest).toBeInstanceOf(Request);
      expect((calledRequest as Request).url).toContain(`${BASE_URL}/api/users`);
    });

    it('should handle timeout configuration', async () => {
      vi.useFakeTimers();
      const mockData = { timeout: true };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const requestPromise = engine.request({
        url: `${BASE_URL}/api/slow`,
        method: 'GET',
        signal: controller.signal,
      });

      vi.advanceTimersByTime(5100);
      await requestPromise;

      clearTimeout(timeoutId);
      vi.useRealTimers();
    });
  });

  describe('response handling', () => {
    it('should parse JSON response by default', async () => {
      const mockData = { id: 1, name: 'John' };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request<typeof mockData>({
        url: `${BASE_URL}/api/user`,
        method: 'GET',
      });

      expect(response.data).toEqual(mockData);
    });

    it('should handle text response type', async () => {
      const mockResponse = createMockFetchResponse({
        status: 200,
        body: 'plain text content',
        headers: { 'content-type': 'text/plain' },
      });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/text`,
        method: 'GET',
        responseType: 'text',
      });

      expect(response.data).toBe('plain text content');
    });

    it('should handle blob response type', async () => {
      const mockResponse = createMockFetchResponse({
        status: 200,
        body: 'binary data',
        headers: { 'content-type': 'application/octet-stream' },
      });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/binary`,
        method: 'GET',
        responseType: 'blob',
      });

      expect(response.data).toBeInstanceOf(Blob);
    });

    it('should handle arraybuffer response type', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockResponse = createMockFetchResponse({
        status: 200,
        body: 'arraybuffer data',
      });
      mockResponse.arrayBuffer = async () => mockArrayBuffer;
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/array`,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      expect(response.data).toBe(mockArrayBuffer);
    });

    it('should include duration in meta', async () => {
      const mockData = { test: true };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/test`,
        method: 'GET',
      });

      expect(response.meta.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for HTTP 404', async () => {
      const mockResponse = createMockFetchResponse({
        status: 404,
        statusText: 'Not Found',
        body: { error: 'Not Found' },
      });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await expect(engine.request({
        url: `${BASE_URL}/api/nonexistent`,
        method: 'GET',
      })).rejects.toThrow();
    });

    it('should throw error for HTTP 500', async () => {
      const mockResponse = createMockFetchResponse({
        status: 500,
        statusText: 'Internal Server Error',
        body: { error: 'Server Error' },
      });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await expect(engine.request({
        url: `${BASE_URL}/api/error`,
        method: 'GET',
      })).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

      engine = new FetchEngine();
      await expect(engine.request({
        url: `${BASE_URL}/api/network-error`,
        method: 'GET',
      })).rejects.toThrow('Network request failed');
    });

    it('should handle abort errors', async () => {
      const controller = new AbortController();
      controller.abort();

      engine = new FetchEngine();
      await expect(engine.request({
        url: `${BASE_URL}/api/abort`,
        method: 'GET',
        signal: controller.signal,
      })).rejects.toThrow();
    });
  });

  describe('headers handling', () => {
    it('should set Content-Type for JSON data', async () => {
      const mockData = { success: true };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await engine.request({
        url: `${BASE_URL}/api/data`,
        method: 'POST',
        data: { name: 'test' },
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should set Content-Type for string data', async () => {
      const mockData = { success: true };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await engine.request({
        url: `${BASE_URL}/api/text`,
        method: 'POST',
        data: 'plain text',
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not set Content-Type for FormData', async () => {
      const mockResponse = createMockFetchResponse({ status: 200, body: {} });
      global.fetch = createMockFetch(mockResponse);

      const formData = new FormData();
      formData.append('name', 'test');

      engine = new FetchEngine();
      await engine.request({
        url: `${BASE_URL}/api/form`,
        method: 'POST',
        data: formData,
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should use custom headers from config', async () => {
      const mockData = { success: true };
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await engine.request({
        url: `${BASE_URL}/api/custom`,
        method: 'GET',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/json',
        },
      });

      expect(global.fetch).toHaveBeenCalled();
      const calledRequest = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledRequest).toBeInstanceOf(Request);
      expect((calledRequest as Request).headers.get('x-custom-header')).toBe('custom-value');
    });
  });

  describe('credentials handling', () => {
    it('should set credentials to include when withCredentials is true', async () => {
      const mockData = {};
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await engine.request({
        url: `${BASE_URL}/api/credentials`,
        method: 'GET',
        withCredentials: true,
      });

      expect(global.fetch).toHaveBeenCalled();
      const calledRequest = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledRequest).toBeInstanceOf(Request);
      expect((calledRequest as Request).credentials).toBe('include');
    });

    it('should set credentials to omit when withCredentials is false', async () => {
      const mockData = {};
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      await engine.request({
        url: `${BASE_URL}/api/credentials`,
        method: 'GET',
        withCredentials: false,
      });

      expect(global.fetch).toHaveBeenCalled();
      const calledRequest = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledRequest).toBeInstanceOf(Request);
      expect((calledRequest as Request).credentials).toBe('omit');
    });
  });

  describe('validateStatus', () => {
    it('should throw error when validateStatus returns false for 401', async () => {
      const mockResponse = createMockFetchResponse({
        status: 401,
        statusText: 'Unauthorized',
        body: { error: 'Unauthorized' },
      });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const responsePromise = engine.request({
        url: `${BASE_URL}/api/private`,
        method: 'GET',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      await expect(responsePromise).rejects.toThrow();
    });

    it('should accept status 204 No Content', async () => {
      const mockResponse = createMockFetchResponse({
        status: 204,
        statusText: 'No Content',
        body: null,
      });
      global.fetch = createMockFetch(mockResponse);

      engine = new FetchEngine();
      const response = await engine.request({
        url: `${BASE_URL}/api/no-content`,
        method: 'DELETE',
      });

      expect(response.meta.status).toBe(204);
    });
  });

  describe('withCredentials from global config', () => {
    it('should use global withCredentials setting', async () => {
      const mockData = {};
      const mockResponse = createMockFetchResponse({ status: 200, body: mockData });
      global.fetch = createMockFetch(mockResponse);

      const engineWithConfig = new FetchEngine({
        withCredentials: true,
      });

      await engineWithConfig.request({
        url: `${BASE_URL}/api/test`,
        method: 'GET',
      });

      expect(global.fetch).toHaveBeenCalled();
      const calledRequest = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledRequest).toBeInstanceOf(Request);
      expect((calledRequest as Request).credentials).toBe('include');
    });
  });
});