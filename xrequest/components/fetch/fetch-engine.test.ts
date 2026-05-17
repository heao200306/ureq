import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchEngine } from './fetch-engine';

const createFetchResponse = (data: unknown, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(data), {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
};

describe('FetchEngine', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let engine: FetchEngine;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    engine = new FetchEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should have name "fetch"', () => {
      expect(engine.name).toBe('fetch');
    });

    it('should make a successful GET request', async () => {
      const mockData = { id: 1, name: 'test' };
      fetchMock.mockResolvedValue(createFetchResponse(mockData));

      const response = await engine.request({
        url: '/api/users',
        method: 'GET',
      });

      expect(response.data).toEqual(mockData);
      expect(response.meta.engine).toBe('fetch');
      expect(response.meta.status).toBe(200);
    });

    it('should make a successful POST request with data', async () => {
      const requestData = { name: 'test' };
      const responseData = { id: 1, ...requestData };
      fetchMock.mockResolvedValue(createFetchResponse(responseData));

      const response = await engine.request({
        url: '/api/users',
        method: 'POST',
        data: requestData,
      });

      expect(response.data).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('request configuration', () => {
    it('should merge global config with request config', async () => {
      const engineWithConfig = new FetchEngine({
        baseURL: 'https://api.example.com',
        headers: { 'Authorization': 'Bearer token' },
      });
      const mockData = { success: true };
      fetchMock.mockResolvedValue(createFetchResponse(mockData));

      await engineWithConfig.request({
        url: '/users',
        method: 'GET',
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.url).toBe('https://api.example.com/users');
      expect(fetchCall.headers.get('Authorization')).toBe('Bearer token');
    });

    it('should build URL with query params', async () => {
      const mockData = { items: [] };
      fetchMock.mockResolvedValue(createFetchResponse(mockData));

      await engine.request({
        url: '/api/search',
        method: 'GET',
        params: { q: 'test', page: 1 },
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.url).toContain('q=test');
      expect(fetchCall.url).toContain('page=1');
    });

    it('should handle timeout configuration', async () => {
      vi.useFakeTimers();
      const mockData = { timeout: true };
      let rejectFn: (reason?: unknown) => void;
      fetchMock.mockImplementation(() => new Promise((_, reject) => {
        rejectFn = reject;
      }));

      const requestPromise = engine.request({
        url: '/api/slow',
        method: 'GET',
        timeout: 1000,
      });

      await vi.advanceTimersByTimeAsync(1000);
      await expect(requestPromise).rejects.toThrow();

      vi.useRealTimers();
    });
  });

  describe('response handling', () => {
    it('should parse JSON response by default', async () => {
      const mockData = { id: 1, name: 'John' };
      fetchMock.mockResolvedValue(createFetchResponse(mockData));

      const response = await engine.request<typeof mockData>({
        url: '/api/user',
        method: 'GET',
      });

      expect(response.data).toEqual(mockData);
    });

    it('should handle text response type', async () => {
      const textResponse = new Response('plain text content', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
      fetchMock.mockResolvedValue(textResponse);

      const response = await engine.request({
        url: '/api/text',
        method: 'GET',
        responseType: 'text',
      });

      expect(response.data).toBe('plain text content');
    });

    it('should handle blob response type', async () => {
      const blobData = new Blob(['binary data'], { type: 'application/octet-stream' });
      const blobResponse = new Response(blobData, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      fetchMock.mockResolvedValue(blobResponse);

      const response = await engine.request({
        url: '/api/binary',
        method: 'GET',
        responseType: 'blob',
      });

      expect(response.data).toBeInstanceOf(Blob);
    });

    it('should handle arraybuffer response type', async () => {
      const arrayBuffer = new ArrayBuffer(8);
      const arrayBufferResponse = new Response(arrayBuffer, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      fetchMock.mockResolvedValue(arrayBufferResponse);

      const response = await engine.request({
        url: '/api/binary',
        method: 'GET',
        responseType: 'arraybuffer',
      });

      expect(response.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should include duration in meta', async () => {
      const mockData = { test: true };
      fetchMock.mockResolvedValue(createFetchResponse(mockData));

      const response = await engine.request({
        url: '/api/test',
        method: 'GET',
      });

      expect(response.meta.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for HTTP 404', async () => {
      const errorResponse = new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchMock.mockResolvedValue(errorResponse);

      await expect(engine.request({
        url: '/api/nonexistent',
        method: 'GET',
      })).rejects.toThrow();
    });

    it('should throw error for HTTP 500', async () => {
      const errorResponse = new Response(JSON.stringify({ error: 'Server Error' }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchMock.mockResolvedValue(errorResponse);

      await expect(engine.request({
        url: '/api/error',
        method: 'GET',
      })).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const networkError = new TypeError('Failed to fetch');
      networkError.name = 'TypeError';
      fetchMock.mockRejectedValue(networkError);

      await expect(engine.request({
        url: '/api/network-error',
        method: 'GET',
      })).rejects.toThrow('Network Error');
    });

    it('should handle abort errors', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);

      await expect(engine.request({
        url: '/api/abort',
        method: 'GET',
      })).rejects.toThrow('Request aborted');
    });
  });

  describe('headers handling', () => {
    it('should set Content-Type for JSON data', async () => {
      fetchMock.mockResolvedValue(createFetchResponse({ success: true }));

      await engine.request({
        url: '/api/data',
        method: 'POST',
        data: { name: 'test' },
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.headers.get('Content-Type')).toBe('application/json');
    });

    it('should set Content-Type for string data', async () => {
      fetchMock.mockResolvedValue(createFetchResponse({ success: true }));

      await engine.request({
        url: '/api/text',
        method: 'POST',
        data: 'plain text',
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.headers.get('Content-Type')).toBe('application/json');
    });

    it('should not set Content-Type for FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
      const response = createFetchResponse({ success: true });
      fetchMock.mockResolvedValue(response);

      await engine.request({
        url: '/api/upload',
        method: 'POST',
        data: formData as unknown as Record<string, unknown>,
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.headers.get('Content-Type')).toBeNull();
    });

    it('should use custom headers from config', async () => {
      fetchMock.mockResolvedValue(createFetchResponse({ success: true }));

      await engine.request({
        url: '/api/custom',
        method: 'GET',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/json',
        },
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(fetchCall.headers.get('Accept')).toBe('application/json');
    });
  });

  describe('credentials handling', () => {
    it('should set credentials to include when withCredentials is true', async () => {
      fetchMock.mockResolvedValue(createFetchResponse({}));

      await engine.request({
        url: '/api/credentials',
        method: 'GET',
        withCredentials: true,
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.credentials).toBe('include');
    });

    it('should set credentials to omit when withCredentials is false', async () => {
      fetchMock.mockResolvedValue(createFetchResponse({}));

      await engine.request({
        url: '/api/credentials',
        method: 'GET',
        withCredentials: false,
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.credentials).toBe('omit');
    });
  });

  describe('validateStatus', () => {
    it('should use custom validateStatus function', async () => {
      const errorResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });
      fetchMock.mockResolvedValue(errorResponse);

      const response = await engine.request({
        url: '/api/private',
        method: 'GET',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      expect(response.data).toEqual({ error: 'Unauthorized' });
    });

    it('should accept status 204 No Content', async () => {
      const noContentResponse = new Response(null, {
        status: 204,
        statusText: 'No Content',
      });
      fetchMock.mockResolvedValue(noContentResponse);

      const response = await engine.request({
        url: '/api/no-content',
        method: 'DELETE',
      });

      expect(response.meta.status).toBe(204);
    });
  });

  describe('withCredentials from global config', () => {
    it('should use global withCredentials setting', async () => {
      const engineWithConfig = new FetchEngine({
        withCredentials: true,
      });
      fetchMock.mockResolvedValue(createFetchResponse({}));

      await engineWithConfig.request({
        url: '/api/test',
        method: 'GET',
      });

      const fetchCall = fetchMock.mock.calls[0][0] as Request;
      expect(fetchCall.credentials).toBe('include');
    });
  });
});