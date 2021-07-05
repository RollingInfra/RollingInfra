import IAbortSignal from './IAbortSignal';

export default interface IStateStoreValue<T> {
  value: T;
  update(update: T, options?: {signal?: IAbortSignal}): Promise<IStateStoreValue<T>>;
  delete(options?: {signal?: IAbortSignal}): Promise<void>;
}