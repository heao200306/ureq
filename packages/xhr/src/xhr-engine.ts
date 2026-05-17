import type {
  EngineAdapter,
  RequestConfig,
  Response,
  RequestError,
  RequestHeaders,
  GlobalConfig,
} from '@xrequest/core';
import {
  mergeHeaders,
  buildFullPath,
  isFormData,
  isBlob,
  isArrayBuffer,
  isURLSearchParams,
} from '@xrequest/core';

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

      this.setupXHR(xhr, mergedConfig, method);

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

  private setupXHR<B>(xhr: XMLHttpRequest, config: RequestConfig<B>, method: string): void {
    xhr.responseType = this.mapResponseType(config.responseType || 'json');

    if (config.timeout && config.timeout > 0) {
      xhr.timeout = config.timeout;
    }

    xhr.withCredentials = config.withCredentials || false;

    if (method === 'GET' || method === 'HEAD') {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
  }

  private mapResponseType(responseType?: string): XMLHttpRequestResponseType {
    switch (responseType) {
      case 'json':
        return 'json';
      case 'text':
        return 'text';
      case 'blob':
        return 'blob';
      case 'arraybuffer':
        return 'arraybuffer';
      case 'document':
        return 'document';
      default:
        return 'json';
    }
  }

  private buildHeaders<B>(config: RequestConfig<B>): Record<string, string> {
    const headers: Record<string, string> = {};

    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        if (value != null) {
          headers[key.toLowerCase()] = String(value);
        }
      }
    }

    if (!headers['content-type'] && !headers['Content-Type']) {
      const body = this.buildRequestBody(config);
      if (body) {
        if (isFormData(body)) {
        } else if (isBlob(body)) {
          headers['Content-Type'] = body.type || 'application/octet-stream';
        } else if (isArrayBuffer(body)) {
          headers['Content-Type'] = 'application/octet-stream';
        } else if (isURLSearchParams(body)) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (typeof body === 'string') {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    return headers;
  }

  private setRequestHeaders(xhr: XMLHttpRequest, headers: Record<string, string>): void {
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
  }

  private buildRequestBody<B>(config: RequestConfig<B>): string | FormData | Blob | null {
    const { data, method } = config;

    if (!data) return null;

    if (method === 'GET' || method === 'HEAD') {
      return null;
    }

    if (isFormData(data) || isBlob(data)) {
      return data;
    }

    if (isArrayBuffer(data)) {
      return new Blob([data]);
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

  private parseResponseData<T>(xhr: XMLHttpRequest, responseType?: string): T {
    switch (responseType) {
      case 'json':
        return xhr.responseText ? JSON.parse(xhr.responseText) : (null as unknown as T);
      case 'text':
        return xhr.responseText as unknown as T;
      case 'blob':
        return xhr.response as unknown as T;
      case 'arraybuffer':
        return xhr.response as unknown as T;
      case 'document':
        return xhr.responseXML as unknown as T;
      default:
        try {
          return JSON.parse(xhr.responseText);
        } catch {
          return xhr.responseText as unknown as T;
        }
    }
  }

  private parseResponseHeaders(headersString: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headersString) return headers;

    const lines = headersString.split('\r\n');
    for (const line of lines) {
      const index = line.indexOf(':');
      if (index > 0) {
        const key = line.substring(0, index).trim().toLowerCase();
        const value = line.substring(index + 1).trim();
        headers[key] = value;
      }
    }

    return headers;
  }

  private createError<T, B>(
    status: number,
    statusText: string,
    config: RequestConfig<B>,
    request: XMLHttpRequest,
    code: string,
    isTimeout: boolean,
    isNetworkError: boolean,
    isAbort = false
  ): RequestError<T, B> {
    const error = new Error(statusText) as RequestError<T, B>;
    error.code = code;
    error.status = status;
    error.statusText = statusText;
    error.config = config;
    error.isTimeout = isTimeout;
    error.isNetworkError = isNetworkError;
    error.isAbort = isAbort;
    error.response = {
      data: this.parseResponseData<T>(request, config.responseType),
      meta: {
        status,
        statusText,
        headers: this.parseResponseHeaders(request.getAllResponseHeaders()),
        engine: 'xhr',
        duration: 0,
      },
      config,
      request,
    };
    return error;
  }
}

export function createXHREngine(globalConfig?: GlobalConfig): XHREngine {
  return new XHREngine(globalConfig);
}
