import {AbortController} from '@rollinginfra/abort-controller';
import {createAbortError} from '@rollinginfra/abort-error';
import {IAbortSignal} from '@rollinginfra/types';

export async function promiseForAbort(signal: IAbortSignal): Promise<never> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }
  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(createAbortError()));
  });
}

export async function withAbortHandler<TResult, TAborted>(
  signal: IAbortSignal,
  task: () => Promise<TResult>,
  onAbort: () => Promise<TAborted>,
): Promise<TResult | TAborted> {
  return await new Promise<TResult | TAborted>((resolve, reject) => {
    if (signal.aborted) {
      resolve(onAbort());
    }
    const abortHandler = () => {
      try {
        resolve(onAbort());
      } catch (ex) {
        reject(ex);
      }
    };
    Promise.resolve(task()).then(
      (v) => {
        signal.removeEventListener('abort', abortHandler);
        resolve(v);
      },
      (v) => {
        signal.removeEventListener('abort', abortHandler);
        reject(v);
      },
    );
    signal.addEventListener('abort', onAbort);
  });
}

export class MergedAbortSignal implements IAbortSignal {
  private readonly _signal: IAbortSignal;
  constructor(...signals: (IAbortSignal | undefined)[]) {
    const controller = new AbortController();
    for (const s of signals) {
      if (s) {
        if (s.aborted) {
          controller.abort();
        } else {
          s.addEventListener('abort', () => controller.abort());
        }
      }
    }
    this._signal = controller.signal;
  }
  get aborted() {
    return this._signal.aborted;
  }
  addEventListener(name: 'abort', handler: () => void): void {
    this._signal.addEventListener(name, handler);
  }
  removeEventListener(name: 'abort', handler: () => void): void {
    this._signal.removeEventListener(name, handler);
  }
}
