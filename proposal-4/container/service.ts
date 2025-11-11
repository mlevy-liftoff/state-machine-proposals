/**
 * The container service is a simple implementation of the Inversion of Control
 * pattern. It allows us to register services with the container and then
 * retrieve them later.
 * The container is a singleton, so it can be accessed from anywhere in the
 * application.
 */
import BindingResolutionError from './binding-resolution-error';

interface ContainerInterface {
  bind(key: any, value: any): this;
  get<T = any>(key: any): T;
  has(key: any): boolean;
  reset: () => void;
}

class Container implements ContainerInterface {
  private readonly bindings: Map<any, any>;

  private static instance: Container;

  private constructor(readonly startTimestamp = Date.now()) {
    this.bindings = new Map();
  }

  static getInstance(startTimestamp?: number) {
    if (!this.instance) {
      this.instance = new Container(startTimestamp);
    }

    return this.instance;
  }

  bind(key: any, value: any): this {
    this.bindings.set(key, value);
    return this;
  }

  get<T = any>(key: any): T {
    if (!this.bindings.has(key)) {
      throw new BindingResolutionError(`Could not find anything for key ${key}`);
    }
    return this.bindings.get(key);
  }

  has(key: any): boolean {
    return this.bindings.has(key);
  }

  reset(): void {
    this.bindings.clear();
  }
}

export default Container;
