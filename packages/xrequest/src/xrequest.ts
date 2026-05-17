import type {
  RequestConfig,
  Response,
  RequestError,
  GlobalConfig,
  RequestEngineType,
  XRequestStatic,
  XRequestInstance,
  Interceptors,
} from './types';
import {
  InterceptorManager,
  runRequestInterceptors,
  runResponseInterceptors,
  runResponseErrorInterceptors,
} from './interceptor';
import { EngineManager } from './engine-manager';
import { mergeConfig } from './utils';

export class XRequest {
  engineManager: EngineManager;
  globalConfig: GlobalConfig;
  requestInterceptors: InterceptorManager;
  responseInterceptors: InterceptorManager;

  constructor(config: GlobalConfig = {}) {
    this.engineManager = new EngineManager();
    this.globalConfig = { ...config };
    this.engineManager.updateGlobalConfig(this.globalConfig);

    this.requestInterceptors = new InterceptorManager();
    this.responseInterceptors = new InterceptorManager();
  }

  get interceptors(): Interceptors {
    return {
      request: this.requestInterceptors as unknown as Interceptors['request'],
      response: this.responseInterceptors as unknown as Interceptors['response'],
    };
  }

  async request<T = unknown, B = unknown>(config: RequestConfig<B>): Promise<Response<T, B>> {
    const mergedConfig = this.mergeGlobalConfig(config);
    const processedConfig = await runRequestInterceptors(this.requestInterceptors, mergedConfig) as RequestConfig<B>;

    try {
      const response = await this.engineManager.getEngineAdapter().request<T, B>(processedConfig);
      const processedResponse = await runResponseInterceptors(this.responseInterceptors, response) as Response<T, B>;
      return processedResponse;
    } catch (error) {
      if (error instanceof Error) {
        const requestError = error as RequestError<T, B>;
        const errorResponse = await runResponseErrorInterceptors(this.responseInterceptors, requestError);
        throw errorResponse;
      }
      throw error;
    }
  }

  get<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'GET',
    });
  }

  post<T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'POST',
      data,
    });
  }

  put<T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'PUT',
      data,
    });
  }

  delete<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'DELETE',
    });
  }

  patch<T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'PATCH',
      data,
    });
  }

  head<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'HEAD',
    });
  }

  options<T = unknown, B = unknown>(url: string, config?: RequestConfig<B>): Promise<Response<T, B>> {
    return this.request<T, B>({
      ...config,
      url,
      method: 'OPTIONS',
    });
  }

  setEngine(type: RequestEngineType): void {
    this.engineManager.setEngine(type);
  }

  getEngine(): RequestEngineType {
    return this.engineManager.getEngine();
  }

  private mergeGlobalConfig<B>(config: RequestConfig<B>): RequestConfig<B> {
    return mergeConfig(this.globalConfig as RequestConfig<B>, config);
  }
}

function createXRequest(config?: GlobalConfig): XRequestInstance {
  return new XRequest(config) as unknown as XRequestInstance;
}

export const xrequest: XRequestStatic = {
  create: createXRequest,
  interceptors: {
    request: new InterceptorManager() as unknown as Interceptors['request'],
    response: new InterceptorManager() as unknown as Interceptors['response'],
  },
} as XRequestStatic;