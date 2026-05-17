import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XRequest } from '../src/xrequest';

describe('XRequest', () => {
  let xrequest: XRequest;

  beforeEach(() => {
    xrequest = new XRequest({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  describe('constructor', () => {
    it('should create an instance with default config', () => {
      const instance = new XRequest();
      expect(instance).toBeDefined();
    });

    it('should create an instance with custom config', () => {
      expect(xrequest.getConfig().baseURL).toBe('https://api.example.com');
      expect(xrequest.getConfig().timeout).toBe(5000);
    });
  });

  describe('create', () => {
    it('should create a new instance with merged config', () => {
      const instance = xrequest.create({
        timeout: 10000,
        headers: { Authorization: 'Bearer token' },
      });

      expect(instance.getConfig().baseURL).toBe('https://api.example.com');
      expect(instance.getConfig().timeout).toBe(10000);
      expect(instance.getConfig().headers).toHaveProperty('Authorization');
    });
  });

  describe('setEngine / getEngine', () => {
    it('should set and get engine', () => {
      xrequest.setEngine('fetch');
      expect(xrequest.getEngine()).toBe('fetch');

      xrequest.setEngine('xhr');
      expect(xrequest.getEngine()).toBe('xhr');
    });

    it('should set engine chain', () => {
      xrequest.setEngine(['fetch', 'xhr']);
      expect(xrequest.getEngine()).toEqual(['fetch', 'xhr']);
    });
  });

  describe('setConfig / getConfig', () => {
    it('should update config', () => {
      xrequest.setConfig({ timeout: 3000 });
      expect(xrequest.getConfig().timeout).toBe(3000);
    });

    it('should preserve existing config when updating', () => {
      xrequest.setConfig({ timeout: 3000 });
      expect(xrequest.getConfig().baseURL).toBe('https://api.example.com');
    });
  });

  describe('interceptors', () => {
    it('should have request and response interceptors', () => {
      expect(xrequest.interceptors.request).toBeDefined();
      expect(xrequest.interceptors.response).toBeDefined();
    });

    it('should add and remove request interceptor', () => {
      const id = xrequest.interceptors.request.use((config) => config);
      expect(typeof id).toBe('number');

      xrequest.interceptors.request.eject(id);
    });

    it('should add and remove response interceptor', () => {
      const id = xrequest.interceptors.response.use(
        (response) => response,
        (error) => error
      );
      expect(typeof id).toBe('number');

      xrequest.interceptors.response.eject(id);
    });
  });

  describe('HTTP methods', () => {
    it('should have all HTTP method shortcuts', () => {
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

describe('Engine Chain', () => {
  it('should create instance with engine chain', () => {
    const api = new XRequest({
      engine: ['fetch', 'xhr'],
    });
    expect(api.getEngine()).toEqual(['fetch', 'xhr']);
  });

  it('should create instance with single engine', () => {
    const api = new XRequest({
      engine: 'fetch',
    });
    expect(api.getEngine()).toBe('fetch');
  });
});