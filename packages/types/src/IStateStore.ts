import IAbortSignal from './IAbortSignal';
import IStateStoreValue from './IStateStoreValue';

export default interface IStateStore {
  create<T>(name: string, data: T, options?: {signal?: IAbortSignal}): Promise<IStateStoreValue<T>>;
  read<T>(name: string, options?: {signal?: IAbortSignal}): Promise<IStateStoreValue<T> | null>;
}
