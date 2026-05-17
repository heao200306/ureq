import type { RequestEngineType, GlobalConfig } from './types';
import type { EngineAdapter } from './types';
import { XHREngine } from './xhr-engine';
import { FetchEngine } from './fetch-engine';

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

    if (config.engine) {
      this.currentEngineType = config.engine;
    }
  }
}