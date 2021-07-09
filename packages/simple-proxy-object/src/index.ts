export interface ISimpleProxyObjectOptions {
  target?: any;
  hasProp(prop: string | number | symbol): boolean;
  getProp(prop: string | number | symbol): any;
}
export default function createSimpleProxyObject(
  options: ISimpleProxyObjectOptions,
): any {
  const target = options.target ?? {};
  const cache = new Map<string | number | symbol, any>();
  const getPropCached = (prop: string | number | symbol) => {
    if (cache.has(prop)) {
      return cache.get(prop);
    } else {
      const value = options.getProp(prop);
      cache.set(prop, value);
      return value;
    }
  };
  return new Proxy(target, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      } else if (options.hasProp(prop)) {
        return getPropCached(prop);
      } else {
        return undefined;
      }
    },
    set() {
      return false;
    },
    isExtensible() {
      return false;
    },
    getPrototypeOf() {
      return null;
    },
    setPrototypeOf() {
      return false;
    },
    defineProperty() {
      return false;
    },
    deleteProperty() {
      return false;
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop);
      } else if (options.hasProp(prop)) {
        return {
          configurable: false,
          enumerable: false,
          writable: false,
          value: getPropCached(prop),
        };
      } else {
        return undefined;
      }
    },
    has(prop) {
      return options.hasProp(prop);
    },
  }) as any;
}
