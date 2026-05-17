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

export class XHREngine implements EngineAdapter {
  readonly name: 'xhr' = 'xhr';

  private globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig = {}) {
    this.globalConfig = globalConfig;
  }

  async request<T = unknown, B = unknown>(config: RequestConfig<B>): Promise<Response<T, B>> {
    const startTime = Date.now();

    const mergedConfig = this.mergeConfig(config);
    const fullURL = buildFullPath(this.globalConfig.baseURL, mergedConfig.url);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = mergedConfig.method || 'GET';

      xhr.open(method, fullURL, true);

      this.setupXHR(xhr, mergedConfig);

      xhr.onload = () => {
        const duration = Date.now() - startTime;
        const responseHeaders = this.parseResponseHeaders(xhr.getAllResponseHeaders());

        if (mergedConfig.validateStatus ? mergedConfig.validateStatus(xhr.status) : xhr.status >= 200 && xhr.status < 300) {
          const data = this.parseResponseData<T>(xhr, mergedConfig.responseType);
          resolve({
            data,
            meta: {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: responseHeaders,
              engine: 'xhr',
              duration,
            },
            config: mergedConfig,
            request: xhr,
          });
        } else {
          const error = this.createError<T, B>(
            xhr.status,
            xhr.statusText,
            mergedConfig,
            xhr,
            'HTTP_ERROR',
            false,
            false
          );
          reject(error);
        }
      };

      xhr.onerror = () => {
        const error = this.createError<T, B>(
          0,
          'Network Error',
          mergedConfig,
          xhr,
          'NETWORK_ERROR',
          false,
          true
        );
        reject(error);
      };

      xhr.ontimeout = () => {
        const error = this.createError<T, B>(
          0,
          'Timeout',
          mergedConfig,
          xhr,
          'TIMEOUT',
          true,
          false
        );
        reject(error);
      };

      xhr.onabort = () => {
        const error = this.createError<T, B>(
          0,
          'Aborted',
          mergedConfig,
          xhr,
          'ABORT',
          false,
          false,
          true
        );
        reject(error);
      };

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (mergedConfig.onUploadProgress && event.lengthComputable) {
          mergedConfig.onUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          });
        }
      };

      if (mergedConfig.onDownloadProgress) {
        xhr.onprogress = (event: ProgressEvent) => {
          if (event.lengthComputable) {
            mergedConfig.onDownloadProgress!({
              loaded: event.loaded,
              total: event.total,
              percentage: (event.loaded / event.total) * 100,
            });
          }
        };
      }

      const headers = this.buildHeaders(mergedConfig);
      this.setRequestHeaders(xhr, headers);

      if (mergedConfig.signal) {
        if (mergedConfig.signal.aborted) {
          xhr.abort();
        } else {
          mergedConfig.signal.addEventListener('abort', () => {
            xhr.abort();
          });
        }
      }

      const body = this.buildRequestBody(mergedConfig);
      xhr.send(body);
    });
  }

  private mergeConfig<B>(config: RequestConfig<B>): RequestConfig<B> {
    return {
      ...this.globalConfig,
      ...config,
      headers: mergeHeaders(this.globalConfig.headers || {}, config.headers || {}),
    };
  }

  private setupXHR<B>(xhr: XMLHttpRequest, config: RequestConfig<B>): void {
    xhr.responseType = (config.responseType || 'json') as XMLHttpRequestResponseType;

    if (config.timeout !== undefined) {
      xhr.timeout = config.timeout;
    }

    if (config.withCredentials !== undefined) {
      xhr.withCredentials = config.withCredentials;
    }

    xhr.onerror = () => {};
    xhr.ontimeout = () => {};
    xhr.onabort = () => {};
  }

  private buildHeaders<B>(config: RequestConfig<B>): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.globalConfig.headers) {
      for (const [key, value] of Object.entries(this.globalConfig.headers)) {
        if (value != null) {
          headers[key.toLowerCase()] = String(value);
        }
      }
    }

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        if (value != null) {
          headers[key.toLowerCase()] = String(value);
        }
      }
    }

    if (config.data && !headers['content-type']) {
      if (typeof config.data === 'string') {
        headers['content-type'] = 'text/plain;charset=UTF-8';
      } else if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      } else if (!headers['content-type']) {
        headers['content-type'] = 'application/json;charset=UTF-8';
      }
    }

    return headers;
  }

  private setRequestHeaders(xhr: XMLHttpRequest, headers: Record<string, string>): void {
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
  }

  private parseResponseData<T>(xhr: XMLHttpRequest, responseType?: string): T {
    switch (responseType) {
      case 'text':
        return xhr.responseText as T;
      case 'blob':
        return xhr.response as T;
      case 'arraybuffer':
        return xhr.response as T;
      case 'document':
        return xhr.responseXML as T;
      case 'stream':
        return xhr.response as T;
      case 'json':
      default:
        if (typeof xhr.response === 'string') {
          try {
            return JSON.parse(xhr.response) as T;
          } catch {
            return xhr.responseText as unknown as T;
          }
        }
        return xhr.response as T;
    }
  }

  private parseResponseHeaders(headers: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) return result;

    const lines = headers.split('\r\n');
    for (const line of lines) {
      const index = line.indexOf(':');
      if (index > 0) {
        const key = line.substring(0, index).toLowerCase().trim();
        const value = line.substring(index + 1).trim();
        result[key] = value;
      }
    }

    return result;
  }

  private createError<T, B>(
    status: number,
    statusText: string,
    config: RequestConfig<B>,
    request: XMLHttpRequest,
    code: string,
    isTimeout: boolean,
    isNetworkError: boolean,
    isAbort: boolean = false
  ): RequestError<T, B> {
    const error = new Error(statusText) as RequestError<T, B>;
    error.code = code;
    error.status = status;
    error.statusText = statusText;
    error.config = config;
    error.request = request;
    error.isTimeout = isTimeout;
    error.isNetworkError = isNetworkError;
    error.isAbort = isAbort;
    return error;
  }

  private buildRequestBody<B>(config: RequestConfig<B>): string | FormData | Blob | null {
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

    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
      return new Blob([data]);
    }

    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
      return data.toString();
    }

    if (typeof data === 'string') {
      return data;
    }

    return JSON.stringify(data);
  }
}