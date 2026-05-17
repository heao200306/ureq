import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XRequest, xrequest, createMixedInstance } from './xrequest';
import type { RequestConfig, Response, GlobalConfig, RequestEngineType } from '../core';

const createMockResponse = <T, B>(data: T, meta?: Partial<Response<T, B>['meta']>): Response<T, B> => {
  return {
    data,
    meta: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      engine: 'fetch' as RequestEngineType,
      duration: 100,
      ...meta,
    },
    config: {} as RequestConfig<B>,
    request: {} as Request,
  };
};

describe('XRequest', () => {
  let engine: XRequest;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const instance = new XRequest();
      expect(instance).toBeInstanceOf(XRequest);
      expect(instance.globalConfig).toEqual({});
    });

    it('should create instance with custom config', () => {
      const config: GlobalConfig = {
        baseURL: 'https://api.example.com',
        timeout: 5000,
      };
      const instance = new XRequest(config);
      expect(instance.globalConfig.baseURL).toBe('https://api.example.com');
      expect(instance.globalConfig.timeout).toBe(5000);
    });

    it('should initialize request and response interceptors', () => {
      const instance = new XRequest();
      expect(instance.interceptors.request).toBeDefined();
      expect(instance.interceptors.response).toBeDefined();
    });
  });

  describe('request method', () => {
    it('should make a successful request', async () => {
      const mockResponse = createMockResponse({ id: 1, name: 'test' });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      const response = await instance.request({
        url: '/api/users',
        method: 'GET',
      });

      expect(response.data).toEqual({ id: 1, name: 'test' });
      expect(mockEngineAdapter.request).toHaveBeenCalled();
    });

    it('should apply global config to request', async () => {
      const mockResponse = createMockResponse({ success: true });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest({
        baseURL: 'https://api.example.com',
        headers: { 'Authorization': 'Bearer token' },
      });
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.request({
        url: '/users',
        method: 'GET',
      });

      const calledConfig = mockEngineAdapter.request.mock.calls[0][0];
      expect(calledConfig.url).toBe('https://api.example.com/users');
      expect(calledConfig.headers).toHaveProperty('Authorization', 'Bearer token');
    });

    it('should run request interceptors before making request', async () => {
      const mockResponse = createMockResponse({ id: 1 });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      const interceptorFn = vi.fn().mockImplementation((config) => {
        config.headers = { ...config.headers, 'X-Request-Id': '123' };
        return config;
      });
      instance.interceptors.request.use({ onFulfilled: interceptorFn });

      await instance.request({
        url: '/api/test',
        method: 'GET',
      });

      expect(interceptorFn).toHaveBeenCalled();
      const calledConfig = mockEngineAdapter.request.mock.calls[0][0];
      expect(calledConfig.headers).toHaveProperty('X-Request-Id', '123');
    });

    it('should run response interceptors after receiving response', async () => {
      const mockResponse = createMockResponse({ id: 1 });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      const responseInterceptorFn = vi.fn().mockImplementation((response) => {
        response.data = { ...response.data, processed: true };
        return response;
      });
      instance.interceptors.response.use({ onFulfilled: responseInterceptorFn });

      const response = await instance.request({
        url: '/api/test',
        method: 'GET',
      });

      expect(responseInterceptorFn).toHaveBeenCalled();
      expect((response.data as any).processed).toBe(true);
    });
  });

  describe('HTTP methods', () => {
    it('should make GET request', async () => {
      const mockResponse = createMockResponse({ items: [] });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.get('/api/items');

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', url: '/api/items' })
      );
    });

    it('should make POST request with data', async () => {
      const mockResponse = createMockResponse({ id: 1 });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.post('/api/items', { name: 'test' });

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', url: '/api/items', data: { name: 'test' } })
      );
    });

    it('should make PUT request with data', async () => {
      const mockResponse = createMockResponse({ updated: true });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.put('/api/items/1', { name: 'updated' });

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT', url: '/api/items/1', data: { name: 'updated' } })
      );
    });

    it('should make DELETE request', async () => {
      const mockResponse = createMockResponse({ deleted: true });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.delete('/api/items/1');

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'DELETE', url: '/api/items/1' })
      );
    });

    it('should make PATCH request with data', async () => {
      const mockResponse = createMockResponse({ patched: true });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.patch('/api/items/1', { name: 'patched' });

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH', url: '/api/items/1', data: { name: 'patched' } })
      );
    });

    it('should make HEAD request', async () => {
      const mockResponse = createMockResponse(null);
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.head('/api/items/1');

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'HEAD', url: '/api/items/1' })
      );
    });

    it('should make OPTIONS request', async () => {
      const mockResponse = createMockResponse({ methods: ['GET', 'POST'] });
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockResolvedValue(mockResponse),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      await instance.options('/api/items');

      expect(mockEngineAdapter.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'OPTIONS', url: '/api/items' })
      );
    });
  });

  describe('engine management', () => {
    it('should set engine type', () => {
      const instance = new XRequest();
      instance.setEngine('xhr');
      expect(instance.getEngine()).toBe('xhr');
    });

    it('should get current engine type', () => {
      const instance = new XRequest();
      expect(instance.getEngine()).toBe('fetch');

      instance.setEngine('xhr');
      expect(instance.getEngine()).toBe('xhr');
    });

    it('should switch between engines', () => {
      const instance = new XRequest();
      const fetchEngine = instance.engineManager.getEngineAdapter();
      expect(fetchEngine.name).toBe('fetch');

      instance.setEngine('xhr');
      const xhrEngine = instance.engineManager.getEngineAdapter();
      expect(xhrEngine.name).toBe('xhr');
    });
  });

  describe('config management', () => {
    it('should update global config', () => {
      const instance = new XRequest();
      instance.setConfig({
        baseURL: 'https://api.new.com',
        timeout: 3000,
      });

      expect(instance.getConfig().baseURL).toBe('https://api.new.com');
      expect(instance.getConfig().timeout).toBe(3000);
    });

    it('should get current config', () => {
      const instance = new XRequest({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      const config = instance.getConfig();
      expect(config.baseURL).toBe('https://api.example.com');
      expect(config.timeout).toBe(5000);
    });

    it('should merge partial config updates', () => {
      const instance = new XRequest({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: { 'Authorization': 'Bearer token' },
      });

      instance.setConfig({ timeout: 10000 });

      expect(instance.getConfig().baseURL).toBe('https://api.example.com');
      expect(instance.getConfig().timeout).toBe(10000);
      expect(instance.getConfig().headers).toEqual({ 'Authorization': 'Bearer token' });
    });
  });

  describe('instance creation', () => {
    it('should create new instance with create method', () => {
      const instance = new XRequest({
        baseURL: 'https://api.example.com',
      });

      const newInstance = instance.create({
        timeout: 5000,
      });

      expect(newInstance).not.toBe(instance);
      expect(newInstance.getConfig().baseURL).toBe('https://api.example.com');
      expect(newInstance.getConfig().timeout).toBe(5000);
    });
  });

  describe('interceptors', () => {
    it('should add request interceptor', () => {
      const instance = new XRequest();
      const interceptorId = instance.interceptors.request.use({
        onFulfilled: (config) => config,
      });

      expect(interceptorId.id).toBeDefined();
    });

    it('should add response interceptor', () => {
      const instance = new XRequest();
      const interceptorId = instance.interceptors.response.use({
        onFulfilled: (response) => response,
      });

      expect(interceptorId.id).toBeDefined();
    });

    it('should eject interceptor', () => {
      const instance = new XRequest();
      const interceptorId = instance.interceptors.request.use({
        onFulfilled: (config) => config,
      });

      instance.interceptors.request.eject(interceptorId.id);
      expect(instance.interceptors.request.size).toBe(0);
    });

    it('should clear all interceptors', () => {
      const instance = new XRequest();
      instance.interceptors.request.use({ onFulfilled: (config) => config });
      instance.interceptors.response.use({ onFulfilled: (response) => response });

      instance.interceptors.request.clear();
      instance.interceptors.response.clear();

      expect(instance.interceptors.request.size).toBe(0);
      expect(instance.interceptors.response.size).toBe(0);
    });

    it('should run request interceptor on error in rejected', async () => {
      const mockError = new Error('Request failed');
      const mockEngineAdapter = {
        name: 'fetch' as RequestEngineType,
        request: vi.fn().mockRejectedValue(mockError),
      };

      const instance = new XRequest();
      (instance.engineManager as any).engines.set('fetch', mockEngineAdapter);

      const errorInterceptor = vi.fn();
      instance.interceptors.response.use({
        onRejected: errorInterceptor,
      });

      try {
        await instance.request({
          url: '/api/error',
          method: 'GET',
        });
      } catch (e) {
        expect(errorInterceptor).toHaveBeenCalled();
      }
    });
  });
});

describe('xrequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default export', () => {
    it('should be a function', () => {
      expect(typeof xrequest).toBe('function');
    });

    it('should have HTTP methods attached', () => {
      expect(typeof xrequest.get).toBe('function');
      expect(typeof xrequest.post).toBe('function');
      expect(typeof xrequest.put).toBe('function');
      expect(typeof xrequest.delete).toBe('function');
      expect(typeof xrequest.patch).toBe('function');
      expect(typeof xrequest.head).toBe('function');
      expect(typeof xrequest.options).toBe('function');
    });
  });
});

describe('createMixedInstance', () => {
  it('should create a mixed instance', () => {
    const mixedInstance = createMixedInstance({});
    expect(mixedInstance).toBeDefined();
  });

  it('should create mixed instance with config', () => {
    const mixedInstance = createMixedInstance({
      baseURL: 'https://api.example.com',
    });
    expect(mixedInstance.getConfig().baseURL).toBe('https://api.example.com');
  });
});