import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XHREngine } from './xhr-engine';

const createMockXHR = (options: {
  status?: number;
  statusText?: string;
  responseText?: string;
  response?: unknown;
  headers?: string;
  readyState?: number;
}): Partial<XMLHttpRequest> => {
  return {
    readyState: options.readyState ?? 4,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    responseText: options.responseText ?? '',
    response: options.response ?? options.responseText ?? '',
    getAllResponseHeaders: () => options.headers ?? 'content-type: application/json',
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    addEventListener: vi.fn(),
    upload: {
      addEventListener: vi.fn(),
      onprogress: null,
    } as unknown as XMLHttpRequestUpload,
    ...options,
  };
};

describe('XHREngine', () => {
  let engine: XHREngine;
  let originalXMLHttpRequest: typeof XMLHttpRequest;

  beforeEach(() => {
    originalXMLHttpRequest = XMLHttpRequest;
    vi.stubGlobal('XMLHttpRequest', vi.fn());
    engine = new XHREngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should have name "xhr"', () => {
      expect(engine.name).toBe('xhr');
    });

    it('should make a successful GET request', async () => {
      const mockData = { id: 1, name: 'test' };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/users',
        method: 'GET',
      });

      expect(response.data).toEqual(mockData);
      expect(response.meta.engine).toBe('xhr');
      expect(response.meta.status).toBe(200);
      expect(mockXHR.open).toHaveBeenCalledWith('GET', '/api/users', true);
      expect(mockXHR.send).toHaveBeenCalled();
    });

    it('should make a successful POST request with data', async () => {
      const requestData = { name: 'test' };
      const responseData = { id: 1, ...requestData };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(responseData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/users',
        method: 'POST',
        data: requestData,
      });

      expect(response.data).toEqual(responseData);
      expect(mockXHR.send).toHaveBeenCalledWith(JSON.stringify(requestData));
    });
  });

  describe('request configuration', () => {
    it('should merge global config with request config', async () => {
      const engineWithConfig = new XHREngine({
        baseURL: 'https://api.example.com',
        headers: { 'Authorization': 'Bearer token' },
      });
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engineWithConfig.request({
        url: '/users',
        method: 'GET',
      });

      expect(mockXHR.open).toHaveBeenCalledWith('GET', 'https://api.example.com/users', true);
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer token');
    });

    it('should build URL with query params', async () => {
      const mockData = { items: [] };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/search',
        method: 'GET',
        params: { q: 'test', page: 1 },
      });

      expect(mockXHR.open).toHaveBeenCalledWith('GET', '/api/search?q=test&page=1', true);
    });

    it('should set timeout', async () => {
      const mockData = { timeout: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/slow',
        method: 'GET',
        timeout: 5000,
      });

      expect(mockXHR.timeout).toBe(5000);
    });

    it('should set withCredentials', async () => {
      const mockData = {};
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/credentials',
        method: 'GET',
        withCredentials: true,
      });

      expect(mockXHR.withCredentials).toBe(true);
    });
  });

  describe('response handling', () => {
    it('should parse JSON response by default', async () => {
      const mockData = { id: 1, name: 'John' };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request<typeof mockData>({
        url: '/api/user',
        method: 'GET',
      });

      expect(response.data).toEqual(mockData);
    });

    it('should handle text response type', async () => {
      const mockXHR = createMockXHR({
        status: 200,
        responseText: 'plain text content',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/text',
        method: 'GET',
        responseType: 'text',
      });

      expect(response.data).toBe('plain text content');
    });

    it('should handle blob response type', async () => {
      const blobData = new Blob(['binary data'], { type: 'application/octet-stream' });
      const mockXHR = createMockXHR({
        status: 200,
        response: blobData,
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/binary',
        method: 'GET',
        responseType: 'blob',
      });

      expect(response.data).toBeInstanceOf(Blob);
    });

    it('should include duration in meta', async () => {
      const mockData = { test: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/test',
        method: 'GET',
      });

      expect(response.meta.duration).toBeGreaterThanOrEqual(0);
    });

    it('should parse response headers correctly', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
        headers: 'content-type: application/json\r\nx-custom-header: custom-value',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/headers',
        method: 'GET',
      });

      expect(response.meta.headers['content-type']).toBe('application/json');
      expect(response.meta.headers['x-custom-header']).toBe('custom-value');
    });
  });

  describe('error handling', () => {
    it('should throw error for HTTP 404', async () => {
      const mockXHR = createMockXHR({
        status: 404,
        statusText: 'Not Found',
        responseText: '{"error": "Not Found"}',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      let error: unknown;
      mockXHR.onload!();

      try {
        await engine.request({
          url: '/api/nonexistent',
          method: 'GET',
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const mockXHR = createMockXHR({
        status: 0,
        statusText: 'Network Error',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      let error: unknown;
      mockXHR.onerror!();

      try {
        await engine.request({
          url: '/api/network-error',
          method: 'GET',
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      const mockXHR = createMockXHR({
        status: 0,
        statusText: 'Timeout',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      let error: unknown;
      mockXHR.ontimeout!();

      try {
        await engine.request({
          url: '/api/timeout',
          method: 'GET',
          timeout: 1000,
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });

    it('should handle abort errors', async () => {
      const mockXHR = createMockXHR({
        status: 0,
        statusText: 'Aborted',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      let error: unknown;
      mockXHR.onabort!();

      try {
        await engine.request({
          url: '/api/abort',
          method: 'GET',
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });
  });

  describe('headers handling', () => {
    it('should set Content-Type for JSON data', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/data',
        method: 'POST',
        data: { name: 'test' },
      });

      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('should set Content-Type for string data', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/text',
        method: 'POST',
        data: 'plain text',
      });

      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    it('should set Content-Type for URLSearchParams data', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/form',
        method: 'POST',
        data: new URLSearchParams('name=test'),
      });

      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/x-www-form-urlencoded');
    });

    it('should use custom headers from config', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engine.request({
        url: '/api/custom',
        method: 'GET',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/json',
        },
      });

      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('x-custom-header', 'custom-value');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('accept', 'application/json');
    });
  });

  describe('validateStatus', () => {
    it('should use custom validateStatus function', async () => {
      const mockXHR = createMockXHR({
        status: 401,
        statusText: 'Unauthorized',
        responseText: '{"error": "Unauthorized"}',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/private',
        method: 'GET',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      expect(response.meta.status).toBe(401);
    });

    it('should accept status 204 No Content', async () => {
      const mockXHR = createMockXHR({
        status: 204,
        statusText: 'No Content',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const response = await engine.request({
        url: '/api/no-content',
        method: 'DELETE',
      });

      expect(response.meta.status).toBe(204);
    });
  });

  describe('withCredentials from global config', () => {
    it('should use global withCredentials setting', async () => {
      const engineWithConfig = new XHREngine({
        withCredentials: true,
      });
      const mockData = {};
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      await engineWithConfig.request({
        url: '/api/test',
        method: 'GET',
      });

      expect(mockXHR.withCredentials).toBe(true);
    });
  });

  describe('abort signal handling', () => {
    it('should abort request when signal is already aborted', async () => {
      const mockData = {};
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const controller = new AbortController();
      controller.abort();

      await engine.request({
        url: '/api/test',
        method: 'GET',
        signal: controller.signal,
      });

      expect(mockXHR.abort).toHaveBeenCalled();
    });

    it('should abort request when signal is aborted during request', async () => {
      const mockData = {};
      let abortHandler: (() => void) | null = null;
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const xhr = mockXHR;
        xhr.addEventListener = ((event: string, handler: () => void) => {
          if (event === 'abort') {
            abortHandler = handler;
          }
        }) as typeof xhr.addEventListener;
        return xhr;
      });

      const controller = new AbortController();

      const requestPromise = engine.request({
        url: '/api/test',
        method: 'GET',
        signal: controller.signal,
      });

      controller.abort();

      if (abortHandler) {
        abortHandler();
      }

      await expect(requestPromise).rejects.toThrow();
    });
  });

  describe('progress events', () => {
    it('should call onUploadProgress callback', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const uploadProgressCallback = vi.fn();

      await engine.request({
        url: '/api/upload',
        method: 'POST',
        data: { file: 'test' },
        onUploadProgress: uploadProgressCallback,
      });

      const progressEvent = new ProgressEvent('progress', {
        loaded: 50,
        total: 100,
      });
      mockXHR.upload.onprogress!(progressEvent);

      expect(uploadProgressCallback).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percentage: 50,
      });
    });

    it('should call onDownloadProgress callback', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const downloadProgressCallback = vi.fn();

      await engine.request({
        url: '/api/download',
        method: 'GET',
        onDownloadProgress: downloadProgressCallback,
      });

      const progressEvent = new ProgressEvent('progress', {
        loaded: 50,
        total: 100,
      });
      mockXHR.onprogress!(progressEvent);

      expect(downloadProgressCallback).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percentage: 50,
      });
    });
  });
});