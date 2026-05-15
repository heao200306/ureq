import type {
  EngineAdapter,
  GlobalConfig,
  RequestEngineType,
} from '@xrequest/core';
import { XHREngine } from '@xrequest/xhr';
import { FetchEngine } from '@xrequest/fetch';

export class EngineManager {
  private engines: Map<RequestEngineType, EngineAdapter> = new Map();
  private currentEngineType: RequestEngineType = 'fetch';
  private globalConfig: GlobalConfig = {};

  constructor() {
    this.engines.set('xhr', new XHREngine(this.globalConfig));
    this.engines.set('fetch', new FetchEngine(this.globalConfig));
  }

  setEngine(type: RequestEngineType): void {
    this.currentEngineType = type;
  }

  getEngine(): RequestEngineType {
    return this.currentEngineType;
  }

  getEngineAdapter(): EngineAdapter {
    const engine = this.engines.get(this.currentEngineType);
    if (!engine) {
      throw new Error(`Engine '${this.currentEngineType}' not found`);
    }
    return engine;
  }

  updateGlobalConfig(config: GlobalConfig): void {
    this.globalConfig = { ...this.globalConfig, ...config };
    this.engines.set('xhr', new XHREngine(this.globalConfig));
    this.engines.set('fetch', new FetchEngine(this.globalConfig));
  }

  getGlobalConfig(): GlobalConfig {
    return { ...this.globalConfig };
  }
}
