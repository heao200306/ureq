import type {
  RequestConfig,
  Response,
  RequestError,
  GlobalConfig,
  RequestEngineType,
  GenericRequestStatic,
  GenericRequestInstance,
  Interceptors,
} from '../core';
import { InterceptorManager } from './interceptor';
import { EngineManager } from './engine-manager';
import { mergeConfig, buildFullPath } from '../core';

export class GenericRequest {
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
    let mergedConfig = this.mergeGlobalConfig(config);
    mergedConfig = await this.runRequestInterceptors(mergedConfig);

    try {
      let response = await this.engineManager.getEngineAdapter().request<T, B>(mergedConfig);
      response = await this.runResponseInterceptors(response);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        const requestError = error as RequestError<T, B>;
        return this.runResponseErrorInterceptors(requestError);
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

  create(config?: GlobalConfig): GenericRequestInstance {
    return new GenericRequest({ ...this.globalConfig, ...config }) as unknown as GenericRequestInstance;
  }

  setEngine(engine: RequestEngineType): void {
    this.engineManager.setEngine(engine);
  }

  getEngine(): RequestEngineType {
    return this.engineManager.getEngine();
  }

  setConfig(config: Partial<GlobalConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
    this.engineManager.updateGlobalConfig(this.globalConfig);
  }

  getConfig(): Readonly<GlobalConfig> {
    return { ...this.globalConfig };
  }

  private mergeGlobalConfig<B>(config: RequestConfig<B>): RequestConfig<B> {
    const fullURL = buildFullPath(this.globalConfig.baseURL, config.url);
    const merged = mergeConfig(
      {
        url: fullURL,
        method: config.method || 'GET',
        headers: this.globalConfig.headers,
        timeout: this.globalConfig.timeout,
        responseType: this.globalConfig.responseType,
        withCredentials: this.globalConfig.withCredentials,
        validateStatus: this.globalConfig.validateStatus,
        onUploadProgress: this.globalConfig.onUploadProgress,
        onDownloadProgress: this.globalConfig.onDownloadProgress,
      },
      config
    );
    merged.url = fullURL;
    return merged;
  }

  private async runRequestInterceptors<B>(config: RequestConfig<B>): Promise<RequestConfig<B>> {
    let result = config;

    const interceptors: Array<{ fulfilled?: Function; rejected?: Function }> = [];

    this.requestInterceptors.forEach((interceptor) => {
      interceptors.push(interceptor);
    });

    for (const interceptor of interceptors) {
      try {
        if (interceptor.fulfilled) {
          result = await interceptor.fulfilled(result) as RequestConfig<B>;
        }
      } catch (error) {
        if (interceptor.rejected) {
          throw await interceptor.rejected(error);
        }
        throw error;
      }
    }

    return result;
  }

  private async runResponseInterceptors<T, B>(response: Response<T, B>): Promise<Response<T, B>> {
    let result = response;

    const interceptors: Array<{ fulfilled?: Function; rejected?: Function }> = [];

    this.responseInterceptors.forEach((interceptor) => {
      interceptors.push(interceptor);
    });

    for (const interceptor of interceptors) {
      try {
        if (interceptor.fulfilled) {
          result = await interceptor.fulfilled(result) as Response<T, B>;
        }
      } catch (error) {
        if (interceptor.rejected) {
          throw await interceptor.rejected(error);
        }
        throw error;
      }
    }

    return result;
  }

  private async runResponseErrorInterceptors<T, B>(error: RequestError<T, B>): Promise<Response<T, B>> {
    let result = error;

    const interceptors: Array<{ fulfilled?: Function; rejected?: Function }> = [];

    this.responseInterceptors.forEach((interceptor) => {
      interceptors.push(interceptor);
    });

    for (const interceptor of interceptors) {
      try {
        if (interceptor.rejected) {
          result = await interceptor.rejected(result) as RequestError<T, B>;
        }
      } catch (rethrowError) {
        throw rethrowError;
      }
    }

    throw result;
  }
}

const defaultGenericRequest = new GenericRequest();

export const genericRequest: GenericRequestStatic = function <T = unknown, B = unknown>(
  config: RequestConfig<B>
): Promise<Response<T, B>> {
  return defaultGenericRequest.request<T, B>(config);
} as GenericRequestStatic;

genericRequest.get = <T = unknown, B = unknown>(url: string, config?: RequestConfig<B>) =>
  defaultGenericRequest.get<T, B>(url, config);

genericRequest.post = <T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>) =>
  defaultGenericRequest.post<T, B>(url, data, config);

genericRequest.put = <T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>) =>
  defaultGenericRequest.put<T, B>(url, data, config);

genericRequest.delete = <T = unknown, B = unknown>(url: string, config?: RequestConfig<B>) =>
  defaultGenericRequest.delete<T, B>(url, config);

genericRequest.patch = <T = unknown, B = unknown>(url: string, data?: B, config?: RequestConfig<B>) =>
  defaultGenericRequest.patch<T, B>(url, data, config);

genericRequest.head = <T = unknown, B = unknown>(url: string, config?: RequestConfig<B>) =>
  defaultGenericRequest.head<T, B>(url, config);

genericRequest.options = <T = unknown, B = unknown>(url: string, config?: RequestConfig<B>) =>
  defaultGenericRequest.options<T, B>(url, config);

genericRequest.create = (config?: GlobalConfig) => createMixedInstance(config || {});

genericRequest.setEngine = (engine: RequestEngineType) => defaultGenericRequest.setEngine(engine);

genericRequest.getEngine = () => defaultGenericRequest.getEngine();

genericRequest.interceptors = defaultGenericRequest.interceptors;

function createEngineInstance(engineType: RequestEngineType, globalConfig: GlobalConfig): GenericRequest {
  const instance = new GenericRequest(globalConfig);
  instance.setEngine(engineType);
  return instance;
}

function mixInstances(target: GenericRequest, sources: GenericRequest[]): GenericRequestInstance {    
  const mixedInstance = Object.create(Object.getPrototypeOf(target));

  const allMethods: Record<string, Function> = {};

  const targetProto = Object.getPrototypeOf(target);
  const targetMethods = Object.getOwnPropertyNames(targetProto);
  for (const method of targetMethods) {
    if (method === 'constructor' || method === 'create' || method === 'setEngine' || method === 'getEngine' || method === 'setConfig' || method === 'getConfig' || method === 'interceptors') {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(targetProto, method);
    if (descriptor && typeof descriptor.value === 'function') {
      allMethods[method] = descriptor.value;
    }
  }

  for (const source of sources) {
    const proto = Object.getPrototypeOf(source);
    const methods = Object.getOwnPropertyNames(proto);
    for (const method of methods) {
      if (method === 'constructor' || method === 'create' || method === 'setEngine' || method === 'getEngine' || method === 'setConfig' || method === 'getConfig' || method === 'interceptors') {
        continue;
      }
      if (allMethods[method] === undefined) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, method);
        if (descriptor && typeof descriptor.value === 'function') {
          allMethods[method] = descriptor.value;
        }
      }
    }

    const ownProps = Object.getOwnPropertyNames(source);
    for (const prop of ownProps) {
      if (prop === 'engineManager' || prop === 'globalConfig' || prop === 'requestInterceptors' || prop === 'responseInterceptors') {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(mixedInstance, prop)) {
        const descriptor = Object.getOwnPropertyDescriptor(source, prop);
        if (descriptor) {
          Object.defineProperty(mixedInstance, prop, descriptor);
        }
      }
    }
  }

  for (const [methodName, methodFn] of Object.entries(allMethods)) {
    (mixedInstance as any)[methodName] = methodFn.bind(mixedInstance);
  }

  Object.defineProperty(mixedInstance, 'engineManager', {
    get: () => target.engineManager,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mixedInstance, 'globalConfig', {
    get: () => target.globalConfig,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mixedInstance, 'requestInterceptors', {
    get: () => target.requestInterceptors,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mixedInstance, 'responseInterceptors', {
    get: () => target.responseInterceptors,
    enumerable: true,
    configurable: true,
  });

  mixedInstance.create = (config?: GlobalConfig) => {
    return createMixedInstance({ ...target.globalConfig, ...config });
  };

  mixedInstance.setConfig = (config: Partial<GlobalConfig>) => {
    target.globalConfig = { ...target.globalConfig, ...config };
    target.engineManager.updateGlobalConfig(target.globalConfig);
  };

  mixedInstance.getConfig = () => ({ ...target.globalConfig });

  mixedInstance.setEngine = (engine: RequestEngineType) => {
    target.engineManager.setEngine(engine);
  };

  mixedInstance.getEngine = () => target.engineManager.getEngine();

  Object.defineProperty(mixedInstance, 'interceptors', {
    get: () => ({
      request: target.requestInterceptors,
      response: target.responseInterceptors,
    }),
    enumerable: true,
    configurable: true,
  });

  return mixedInstance as GenericRequestInstance;
}

export function createMixedInstance(config: GlobalConfig): GenericRequestInstance {
  const engineChain = config.engine ? (Array.isArray(config.engine) ? config.engine : [config.engine]) : ['fetch'];

  const instances: GenericRequest[] = [];
  for (const engineType of engineChain) {
    instances.push(createEngineInstance(engineType, config));
  }

  const targetInstance = instances[0];
  const sourceInstances = instances.slice(1);

  if (sourceInstances.length === 0) {
    return targetInstance as unknown as GenericRequestInstance;
  }

  const mixed = mixInstances(targetInstance, sourceInstances);
  return mixed;
}