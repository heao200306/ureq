export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type RequestEngineType = 'xhr' | 'fetch';

export type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'document' | 'stream';

export interface ProgressEvent {
  loaded: number;
  total: number;
  percentage?: number;
}

export interface UploadProgressEvent extends ProgressEvent {
  speed?: number;
  remaining?: number;
}

export interface DownloadProgressEvent extends ProgressEvent {
  speed?: number;
  remaining?: number;
}

export interface RequestHeaders {
  [key: string]: string | number | boolean | null | undefined;
}

export interface GlobalConfig {
  baseURL?: string;
  headers?: RequestHeaders;
  timeout?: number;
  responseType?: ResponseType;
  withCredentials?: boolean;
  validateStatus?: (status: number) => boolean;
  engine?: RequestEngineType;
}

export interface RequestConfig<B = unknown> {
  url: string;
  method?: HttpMethod;
  headers?: RequestHeaders;
  params?: Record<string, string | number | boolean | null | undefined>;
  data?: B;
  timeout?: number;
  responseType?: ResponseType;
  withCredentials?: boolean;
  signal?: AbortSignal;
  onUploadProgress?: (event: UploadProgressEvent) => void;
  onDownloadProgress?: (event: DownloadProgressEvent) => void;
  validateStatus?: (status: number) => boolean;
}

export interface ResponseMeta {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  engine: RequestEngineType;
  duration: number;
}

export interface Response<T = unknown, B = unknown> {
  data: T;
  meta: ResponseMeta;
  config: RequestConfig<B>;
  request: XMLHttpRequest | Request;
}

export interface RequestError<T = unknown, B = unknown> extends Error {
  code?: string;
  status?: number;
  statusText?: string;
  response?: Response<T, B>;
  config?: RequestConfig<B>;
  request?: XMLHttpRequest | Request;
  isTimeout?: boolean;
  isAbort?: boolean;
  isNetworkError?: boolean;
}

export interface InterceptorRequestHook<V = unknown> {
  onFulfilled?: (config: RequestConfig<V>) => RequestConfig<V> | Promise<RequestConfig<V>>;
  onRejected?: (error: RequestError) => RequestError;
}

export interface InterceptorResponseHook<T = unknown, B = unknown> {
  onFulfilled?: (response: Response<T, B>) => Response<T, B> | Promise<Response<T, B>>;
  onRejected?: (error: RequestError<T, B>) => RequestError<T, B> | Promise<RequestError<T, B>>;
}

export interface InterceptorId {
  id: number;
}

export interface InterceptorManager<V, T = unknown, B = unknown> {
  use(hook: InterceptorRequestHook<V> | InterceptorResponseHook<T, B>): InterceptorId;
  eject(id: number): void;
  clear(): void;
  forEach(fn: (hook: InterceptorRequestHook<V>) => void): void;
}

export interface Interceptors<T = unknown, B = unknown> {
  request: InterceptorManager<RequestConfig<B>, RequestError>;
  response: InterceptorManager<Response<T, B>, RequestError<T, B>>;
}

export interface EngineAdapter {
  name: RequestEngineType;
  request<T = unknown, B = unknown>(config: RequestConfig<B>): Promise<Response<T, B>>;
}

export interface EngineAdapterFactory {
  create(config?: GlobalConfig): EngineAdapter;
}

export interface XRequestStatic {
  create(config?: GlobalConfig): XRequestInstance;
  interceptors: Interceptors;
}

export interface XRequestInstance {
  request<T = unknown, B = unknown>(config: RequestConfig<B>): Promise<Response<T, B>>;
  get<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>>;
  post<T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>): Promise<Response<T, B>>;
  put<T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>): Promise<Response<T, B>>;
  delete<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>>;
  patch<T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>): Promise<Response<T, B>>;
  head<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>>;
  options<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>>;
  interceptors: Interceptors;
}

export interface XHRRequestConfig extends RequestConfig {
  upload?: {
    onProgress?: (event: UploadProgressEvent) => void;
  };
  xhr?: {
    ontimeout?: () => void;
    onabort?: () => void;
    onerror?: () => void;
  };
}

export interface FetchRequestConfig extends RequestConfig {
  fetch?: {
    credentials?: RequestCredentials;
    cache?: RequestCache;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    integrity?: string;
    keepalive?: boolean;
  };
}

export function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer;
}

export function isURLSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams;
}

export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

export function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value);
}