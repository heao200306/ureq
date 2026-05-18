// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XHREngine } from './xhr-engine';

const createMockXHR = (options: {
  status?: number;
  statusText?: string;
  responseText?: string;
  response?: unknown;
  headers?: string;
  readyState?: number;
}): any => {
  let onloadHandler: (() => void) | null = null;
  let onerrorHandler: (() => void) | null = null;
  let ontimeoutHandler: (() => void) | null = null;
  let onabortHandler: (() => void) | null = null;

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
    abort: vi.fn(function(this: Partial<XMLHttpRequest>) {
      onabortHandler?.();
    }),
    addEventListener: vi.fn() as any,
    upload: {
      addEventListener: vi.fn() as any,
      onprogress: null,
    } as unknown as XMLHttpRequestUpload,
    get onload(): XMLHttpRequest['onload'] | null {
      return onloadHandler;
    },
    set onload(handler: XMLHttpRequest['onload'] | null) {
      onloadHandler = handler;
    },
    get onerror(): XMLHttpRequest['onerror'] | null {
      return onerrorHandler;
    },
    set onerror(handler: XMLHttpRequest['onerror'] | null) {
      onerrorHandler = handler;
    },
    get ontimeout(): XMLHttpRequest['ontimeout'] | null {
      return ontimeoutHandler;
    },
    set ontimeout(handler: XMLHttpRequest['ontimeout'] | null) {
      ontimeoutHandler = handler;
    },
    get onabort(): XMLHttpRequest['onabort'] | null {
      return onabortHandler;
    },
    set onabort(handler: XMLHttpRequest['onabort'] | null) {
      onabortHandler = handler;
    },
    triggerLoad: function(this: Partial<XMLHttpRequest>) {
      onloadHandler?.();
    },
    triggerError: function() {
      onerrorHandler?.();
    },
    triggerTimeout: function() {
      ontimeoutHandler?.();
    },
    triggerAbort: function() {
      onabortHandler?.();
    },
    ...options,
  } as any;
};

describe('XHREngine', () => {
  let engine: XHREngine;

  beforeEach(() => {
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

      const responsePromise = engine.request({
        url: '/api/users',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
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

      const responsePromise = engine.request({
        url: '/api/users',
        method: 'POST',
        data: requestData,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
      expect(response.data).toEqual(responseData);
      expect(mockXHR.send).toHaveBeenCalled();
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

      const responsePromise = engineWithConfig.request({
        url: '/users',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
      expect(mockXHR.open).toHaveBeenCalledWith('GET', 'https://api.example.com/users', true);
    });

    it('should set timeout', async () => {
      const mockData = { timeout: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/slow',
        method: 'GET',
        timeout: 5000,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
      expect(mockXHR.timeout).toBe(5000);
    });

    it('should set withCredentials', async () => {
      const mockData = {};
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/credentials',
        method: 'GET',
        withCredentials: true,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
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

      const responsePromise = engine.request<typeof mockData>({
        url: '/api/user',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
      expect(response.data).toEqual(mockData);
    });

    it('should handle text response type', async () => {
      const mockXHR = createMockXHR({
        status: 200,
        responseText: 'plain text content',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/text',
        method: 'GET',
        responseType: 'text',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
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

      const responsePromise = engine.request({
        url: '/api/binary',
        method: 'GET',
        responseType: 'blob',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
      expect(response.data).toBeInstanceOf(Blob);
    });

    it('should include duration in meta', async () => {
      const mockData = { test: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/test',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
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

      const responsePromise = engine.request({
        url: '/api/headers',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
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

      const responsePromise = engine.request({
        url: '/api/nonexistent',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await expect(responsePromise).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const mockXHR = createMockXHR({
        status: 0,
        statusText: 'Network Error',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/network-error',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerError();

      await expect(responsePromise).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const mockXHR = createMockXHR({
        status: 0,
        statusText: 'Timeout',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/timeout',
        method: 'GET',
        timeout: 1000,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerTimeout();

      await expect(responsePromise).rejects.toThrow();
    });

    it('should handle abort errors', async () => {
      const mockXHR = createMockXHR({
        status: 0,
        statusText: 'Aborted',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/abort',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerAbort();

      await expect(responsePromise).rejects.toThrow();
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

      const responsePromise = engine.request({
        url: '/api/data',
        method: 'POST',
        data: { name: 'test' },
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
      expect(mockXHR.setRequestHeader).toHaveBeenCalled();
    });

    it('should set Content-Type for string data', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/text',
        method: 'POST',
        data: 'plain text',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
      expect(mockXHR.setRequestHeader).toHaveBeenCalled();
    });

    it('should use custom headers from config', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/custom',
        method: 'GET',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/json',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('x-custom-header', 'custom-value');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('accept', 'application/json');
    });
  });

  describe('validateStatus', () => {
    it('should throw error when validateStatus returns false for 401', async () => {
      const mockXHR = createMockXHR({
        status: 401,
        statusText: 'Unauthorized',
        responseText: '{"error": "Unauthorized"}',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/private',
        method: 'GET',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await expect(responsePromise).rejects.toThrow();
    });

    it('should accept status 204 No Content', async () => {
      const mockXHR = createMockXHR({
        status: 204,
        statusText: 'No Content',
        responseText: '',
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const responsePromise = engine.request({
        url: '/api/no-content',
        method: 'DELETE',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      const response = await responsePromise;
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

      const responsePromise = engineWithConfig.request({
        url: '/api/test',
        method: 'GET',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
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

      const responsePromise = engine.request({
        url: '/api/test',
        method: 'GET',
        signal: controller.signal,
      });

      await expect(responsePromise).rejects.toThrow();
      expect(mockXHR.abort).toHaveBeenCalled();
    });

    it('should abort request when signal is aborted during request', async () => {
      const mockData = {};
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const controller = new AbortController();

      const responsePromise = engine.request({
        url: '/api/test',
        method: 'GET',
        signal: controller.signal,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      controller.abort();

      await expect(responsePromise).rejects.toThrow();
    });
  });

  describe('progress events', () => {
    it('should handle onUploadProgress callback', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const uploadProgressCallback = vi.fn();

      const responsePromise = engine.request({
        url: '/api/upload',
        method: 'POST',
        data: { file: 'test' },
        onUploadProgress: uploadProgressCallback,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
    });

    it('should handle onDownloadProgress callback', async () => {
      const mockData = { success: true };
      const mockXHR = createMockXHR({
        status: 200,
        responseText: JSON.stringify(mockData),
      });

      (XMLHttpRequest as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockXHR);

      const downloadProgressCallback = vi.fn();

      const responsePromise = engine.request({
        url: '/api/download',
        method: 'GET',
        onDownloadProgress: downloadProgressCallback,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      mockXHR.triggerLoad();

      await responsePromise;
    });
  });
});