import {IAbortSignal} from '@rollinginfra/types';

export interface IAbortController {
  readonly signal: IAbortSignal;
  abort(): void;
}

export class AbortController implements IAbortController {
  public readonly signal: IAbortSignal;
  private readonly _abort: () => void;
  constructor() {
    let abortFn: undefined | (() => void);
    this.signal = new AbortSignal((abort) => {
      abortFn = abort;
    });
    if (!abortFn) {
      throw new Error(
        `AbortSignal should have subscribed to the AbortController`,
      );
    }
    this._abort = abortFn;
  }
  public abort() {
    this._abort();
  }
}

class AbortSignal implements IAbortSignal {
  private _aborted: boolean = false;
  private readonly _handlers = new Set<() => void>();

  get aborted() {
    return this._aborted;
  }

  addEventListener(name: 'abort', handler: () => void): void {
    if (name !== 'abort') {
      throw new Error(`Unsupported event name "${name}", expected "abort"`);
    }
    this._handlers.add(handler);
  }
  removeEventListener(name: 'abort', handler: () => void): void {
    if (name !== 'abort') {
      throw new Error(`Unsupported event name "${name}", expected "abort"`);
    }
    this._handlers.delete(handler);
  }

  constructor(subscribe: (handler: () => void) => void) {
    subscribe(() => {
      if (this._aborted) {
        return;
      }
      this._aborted = true;
      for (const handler of this._handlers) {
        setImmediate(() => handler());
      }
    });
  }
}
