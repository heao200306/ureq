import type {
  EngineAdapter,
  RequestConfig,
  Response,
  RequestError,
  GlobalConfig,
} from './types';
import {
  mergeHeaders,
  buildFullPath,
} from './utils';

export class FetchEngine implements EngineAdapter {
  readonly name: 'fetch' = 'fetch';

  private globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig = {}) {
    this.globalConfig = globalConfig;
  }

  async request<T = unknown, B = unknown>(config: RequestConfig<B>): Promise<Response<T, B>> {
    const startTime = Date.now();

    const mergedConfig = this.mergeConfig(config);
    const fullURL = buildFullPath(this.globalConfig.baseURL, mergedConfig.url);

    try {
      const response = await this.doRequest(fullURL, mergedConfig);
      const duration = Date.now() - startTime;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      const validateStatus = mergedConfig.validateStatus || ((status) => status >= 200 && status < 300);

      if (validateStatus(response.status)) {
        const data = await this.parseResponseData<T>(response, mergedConfig.responseType);
        return {
          data,
          meta: {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            engine: 'fetch',
            duration,
          },
          config: mergedConfig,
          request: {} as Request,
        };
      } else {
        const error = await this.createError<T, B>(
          response.status,
          response.statusText,
          mergedConfig,
          response,
          'HTTP_ERROR',
          false
        );
        throw error;
      }
    } catch (error) {
      if ((error as RequestError).code) {
        throw error;
      }

      const isAbort = error instanceof DOMException && error.name === 'AbortException';
      const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';

      if (isAbort) {
        const abortError = await this.createError<T, B>(0, 'Aborted', mergedConfig, null, 'ABORT', false);
        abortError.isAbort = true;
        throw abortError;
      }

      if (isTimeout) {
        const timeoutError = await this.createError<T, B>(0, 'Timeout', mergedConfig, null, 'TIMEOUT', true);
        timeoutError.isTimeout = true;
        throw timeoutError;
      }

      const networkError = await this.createError<T, B>(0, 'Network Error', mergedConfig, null, 'NETWORK_ERROR', false);
      networkError.isNetworkError = true;
      throw networkError;
    }
  }

  private async doRequest(url: string, config: RequestConfig<unknown>): Promise<globalThis.Response> {
    const options = this.buildRequestOptions(config);
    const response = await fetch(url, options);
    return response;
  }

  private mergeConfig<B>(config: RequestConfig<B>): RequestConfig<B> {
    return {
      ...this.globalConfig,
      ...config,
      headers: mergeHeaders(this.globalConfig.headers || {}, config.headers || {}),
    };
  }

  private buildRequestOptions<B>(config: RequestConfig<B>): RequestInit {
    const options: RequestInit = {
      method: config.method?.toUpperCase() || 'GET',
      headers: this.buildHeaders(config),
      body: this.buildRequestBody(config),
      signal: config.signal,
    };

    if (config.responseType === 'stream') {
      (options as Record<string, unknown>).duplex = 'half';
    }

    if (config.withCredentials !== undefined) {
      options.credentials = config.withCredentials ? 'include' : 'omit';
    }

    return options;
  }

  private buildHeaders<B>(config: RequestConfig<B>): HeadersInit {
    const headers = new Headers();

    if (this.globalConfig.headers) {
      for (const [key, value] of Object.entries(this.globalConfig.headers)) {
        if (value != null) {
          headers.append(key, String(value));
        }
      }
    }

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        if (value != null) {
          headers.append(key, String(value));
        }
      }
    }

    if (config.data && !headers.has('content-type')) {
      if (typeof config.data === 'string') {
        headers.set('content-type', 'text/plain;charset=UTF-8');
      } else if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      } else {
        headers.set('content-type', 'application/json;charset=UTF-8');
      }
    }

    return headers;
  }

  private buildRequestBody<B>(config: RequestConfig<B>): BodyInit | null {
    const { data, method } = config;

    if (!data) return null;

    if (method === 'GET' || method === 'HEAD') {
      return null;
    }

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return data;
    }

    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return data;
    }

    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
      return data;
    }

    if (typeof data === 'string') {
      return data;
    }

    return JSON.stringify(data);
  }

  private async parseResponseData<T>(response: globalThis.Response, responseType?: string): Promise<T> {
    switch (responseType) {
      case 'text':
        return await response.text() as T;
      case 'blob':
        return await response.blob() as T;
      case 'arraybuffer':
        return await response.arrayBuffer() as T;
      case 'document':
        return await response.formData() as unknown as T;
      case 'stream':
        return response.body as T;
      case 'json':
      default:
        return await response.json() as T;
    }
  }

  private async createError<T, B>(
    status: number,
    statusText: string,
    config: RequestConfig<B>,
    response: globalThis.Response | null,
    code: string,
    isTimeout: boolean
  ): Promise<RequestError<T, B>> {
    let responseData: Response<T, B> | undefined;

    if (response) {
      try {
        const data = await this.parseResponseData<T>(response, config.responseType);
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });

        responseData = {
          data,
          meta: {
            status: response.status,
            statusText: response.statusText,
            headers,
            engine: 'fetch',
            duration: 0,
          },
          config,
          request: {} as Request,
        };
      } catch {
      }
    }

    const error = new Error(statusText) as RequestError<T, B>;
    error.code = code;
    error.status = status;
    error.statusText = statusText;
    error.config = config;
    error.isTimeout = isTimeout;

    if (responseData) {
      error.response = responseData;
    }

    return error;
  }
}