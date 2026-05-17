export class InterceptorManager {
  private interceptors: Map<number, { fulfilled?: Function; rejected?: Function }> = new Map();
  private nextId: number = 0;

  use(fulfilled?: Function, rejected?: Function): { id: number } {
    const id = this.nextId++;
    this.interceptors.set(id, { fulfilled, rejected });
    return { id };
  }

  eject(id: number): void {
    this.interceptors.delete(id);
  }

  clear(): void {
    this.interceptors.clear();
  }

  forEach(fn: (hook: { fulfilled?: Function; rejected?: Function }) => void): void {
    for (const hook of this.interceptors.values()) {
      fn(hook);
    }
  }

  get size(): number {
    return this.interceptors.size;
  }
}

export async function runRequestInterceptors(
  interceptors: InterceptorManager,
  config: unknown
): Promise<unknown> {
  let mutatedConfig = config;

  const promises: Promise<unknown>[] = [];

  interceptors.forEach((hook) => {
    if (hook.fulfilled) {
      promises.push(Promise.resolve(hook.fulfilled(mutatedConfig)));
    }
  });

  try {
    mutatedConfig = await promises.reduce(
      async (acc) => {
        return acc;
      },
      Promise.resolve(mutatedConfig)
    );
  } catch (error) {
    throw error;
  }

  return mutatedConfig;
}

export async function runResponseInterceptors(
  interceptors: InterceptorManager,
  response: unknown
): Promise<unknown> {
  let mutatedResponse = response;

  const promises: Promise<unknown>[] = [];

  interceptors.forEach((hook) => {
    if (hook.fulfilled) {
      promises.push(Promise.resolve(hook.fulfilled(mutatedResponse)));
    }
  });

  try {
    mutatedResponse = await promises.reduce(
      async (acc) => {
        return acc;
      },
      Promise.resolve(mutatedResponse)
    );
  } catch (error) {
    throw error;
  }

  return mutatedResponse;
}

export async function runResponseErrorInterceptors(
  interceptors: InterceptorManager,
  error: unknown
): Promise<unknown> {
  let mutatedError = error;

  const promises: Promise<unknown>[] = [];

  interceptors.forEach((hook) => {
    if (hook.rejected) {
      promises.push(Promise.resolve(hook.rejected(mutatedError)));
    }
  });

  try {
    mutatedError = await promises.reduce(
      async (acc) => {
        return acc;
      },
      Promise.resolve(mutatedError)
    );
  } catch (error) {
    throw error;
  }

  return mutatedError;
}