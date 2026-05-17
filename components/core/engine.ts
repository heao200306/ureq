import type {
  EngineAdapter,
  RequestConfig,
  Response,
  RequestError,
  RequestEngineType,
  ProgressEvent,
  UploadProgressEvent,
  DownloadProgressEvent,
} from './types';

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

export interface XHROptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | FormData | Blob | null;
  timeout: number;
  responseType: XMLHttpRequestResponseType;
  withCredentials: boolean;
  onload: () => void;
  onerror: () => void;
  ontimeout: () => void;
  onabort: () => void;
  onprogress: ((event: ProgressEvent) => void) | null;
  upload: {
    onprogress: ((event: ProgressEvent) => void) | null;
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

export interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body: string | FormData | Blob | null;
  signal: AbortSignal | null;
  credentials: RequestCredentials;
  cache: RequestCache;
  referrerPolicy: ReferrerPolicy;
  integrity: string;
  keepalive: boolean;
  duplex?: string;
}

export {
  EngineAdapter,
  RequestConfig,
  Response,
  RequestError,
  RequestEngineType,
  ProgressEvent,
  UploadProgressEvent,
  DownloadProgressEvent,
};
