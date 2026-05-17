import type {
  EngineAdapter,
  RequestConfig,
  Response as XResponse,
  RequestError,
  RequestHeaders,
  GlobalConfig,
} from '../core';
import {
  buildURL,
  mergeHeaders,
  formatHeaders,
  buildFullPath,
  isFormData,
  isBlob,
  isArrayBuffer,
  isURLSearchParams,
} from '../core';

export class FetchEngine implements EngineAdapter {
  readonly name: 'fetch' = 'fetch';

  private globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig = {}) {
    this.globalConfig = globalConfig;
  }

  async request<T = unknown, B = unknown>(config: RequestConfig<B>): Promise<XResponse<T, B>> {
    const startTime = Date.now();

    const mergedConfig = this.mergeConfig(config);
    const url = this.buildURL(mergedConfig);
    const options = this.buildRequestOptions(mergedConfig);

    const fetchRequest = new Request(url, options);

    try {
      const fetchResponse = await fetch(fetchRequest);
      const duration = Date.now() - startTime;

      const responseHeaders = this.parseResponseHeaders(fetchResponse.headers);

      if (mergedConfig.validateStatus ? mergedConfig.validateStatus(fetchResponse.status) : fetchResponse.ok) {
        const data = await this.parseResponseData<T>(fetchResponse, mergedConfig.responseType);

        return {
          data,
          meta: {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: responseHeaders,
            engine: 'fetch',
            duration,
          },
          config: mergedConfig,
          request: fetchRequest,
        };
      } else {
        const data = await this.parseResponseData<T>(fetchResponse, mergedConfig.responseType);
        const error = this.createError<T, B>(
          fetchResponse.status,
          fetchResponse.statusText,
          mergedConfig,
          fetchRequest,
          data
        );
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const abortError = this.createAbortError<T, B>(mergedConfig, fetchRequest);
          throw abortError;
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          const networkError = this.createNetworkError<T, B>(mergedConfig, fetchRequest);
          throw networkError;
        }

        throw error;
      }
      throw error;
    }
  }

  private mergeConfig<B>(config: RequestConfig<B>): RequestConfig<B> {
    return {
      ...this.globalConfig,
      ...config,
      headers: mergeHeaders(
        this.globalConfig.headers as RequestHeaders,
        config.headers as RequestHeaders
      ),
      timeout: config.timeout ?? this.globalConfig.timeout ?? 0,
      responseType: config.responseType ?? this.globalConfig.responseType ?? 'json',
      withCredentials: config.withCredentials ?? this.globalConfig.withCredentials ?? false,
      validateStatus: config.validateStatus ?? this.globalConfig.validateStatus,
    };
  }

  private buildURL<B>(config: RequestConfig<B>): string {
    const fullURL = buildFullPath(this.globalConfig.baseURL, config.url);
    return buildURL(fullURL, config.params as Record<string, string | number | boolean | null | undefined>);
  }

  private buildRequestOptions<B>(config: RequestConfig<B>): RequestInit {
    const method = config.method || 'GET';
    const headers = this.buildHeaders(config);

    const body = this.buildRequestBody(config);

    const options: RequestInit = {
      method,
      headers,
      body: body as BodyInit | null,
    };

    if (config.signal) {
      options.signal = config.signal;
    } else if (config.timeout && config.timeout > 0) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), config.timeout);
      options.signal = controller.signal;
    }

    if (config.withCredentials !== undefined) {
      options.credentials = config.withCredentials ? 'include' : 'omit';
    }

    if (config.responseType === 'stream') {
      (options as Record<string, unknown>).duplex = 'half';
    }

    return options;
  }

  private buildHeaders<B>(config: RequestConfig<B>): HeadersInit {
    const headers: Record<string, string> = {};

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        if (value != null) {
          headers[key] = String(value);
        }
      }
    }

    const body = this.buildRequestBody(config);

    if (!headers['Content-Type'] && !headers['content-type']) {
      if (body) {
        if (isFormData(body)) {
        } else if (isBlob(body) && (body as Blob).type) {
          headers['Content-Type'] = (body as Blob).type;
        } else if (isArrayBuffer(body)) {
          headers['Content-Type'] = 'application/octet-stream';
        } else if (isURLSearchParams(body)) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (typeof body === 'string') {
          headers['Content-Type'] = 'application/json';
        } else if (typeof body === 'object') {
          headers['Content-Type'] = 'application/json';
        }
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

    if (isFormData(data) || isBlob(data) || isArrayBuffer(data)) {
      return data as FormData | Blob | ArrayBuffer;
    }

    if (isURLSearchParams(data)) {
      return data.toString();
    }

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object') {
      return JSON.stringify(data);
    }

    return String(data);
  }

  private async parseResponseData<T>(response: globalThis.Response, responseType?: string): Promise<T> {
    switch (responseType) {
      case 'json':
        return await response.json();
      case 'text':
        return await response.text() as unknown as T;
      case 'blob':
        return await response.blob() as unknown as T;
      case 'arraybuffer':
        return await response.arrayBuffer() as unknown as T;
      case 'document':
        if (response.headers.get('content-type')?.includes('text/html')) {
          return await response.text() as unknown as T;
        }
        return await response.text() as unknown as T;
      case 'stream':
        return response.body as unknown as T;
      default:
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        return await response.text() as unknown as T;
    }
  }

  private parseResponseHeaders(headers: Headers): Record<string, string> {
    return formatHeaders(headers);
  }

  private createError<T, B>(
    status: number,
    statusText: string,
    config: RequestConfig<B>,
    _request: Request,
    _data?: T
  ): RequestError<T, B> {
    const error = new Error(statusText) as RequestError<T, B>;
    error.code = 'HTTP_ERROR';
    error.status = status;
    error.statusText = statusText;
    error.config = config;
    error.isNetworkError = false;
    error.isTimeout = false;
    error.isAbort = false;
    return error;
  }

  private createAbortError<T, B>(config: RequestConfig<B>, _request: Request): RequestError<T, B> {
    const error = new Error('Request aborted') as RequestError<T, B>;
    error.code = 'ABORT';
    error.status = 0;
    error.statusText = 'Aborted';
    error.config = config;
    error.isAbort = true;
    error.isTimeout = false;
    error.isNetworkError = false;
    return error;
  }

  private createNetworkError<T, B>(config: RequestConfig<B>, _request: Request): RequestError<T, B> {
    const error = new Error('Network Error') as RequestError<T, B>;
    error.code = 'NETWORK_ERROR';
    error.status = 0;
    error.statusText = 'Network Error';
    error.config = config;
    error.isNetworkError = true;
    error.isTimeout = false;
    error.isAbort = false;
    return error;
  }
}

export function createFetchEngine(globalConfig?: GlobalConfig): FetchEngine {
  return new FetchEngine(globalConfig);
}
