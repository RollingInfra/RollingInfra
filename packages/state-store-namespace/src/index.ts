import {IAbortSignal, IStateStore, IStateStoreValue} from '@rollinginfra/types';

export interface StateStoreNamespaceConfig {
  prefix: string;
  store: IStateStore;
}

export default class StateStoreNamespace implements IStateStore {
  private readonly _prefix: string;
  private readonly _store: IStateStore;
  constructor({prefix, store}: StateStoreNamespaceConfig) {
    this._prefix = prefix;
    this._store = store;
  }
  async create<T>(name: string, value: T, options?: {signal?: IAbortSignal}) {
    return await this._store.create(`${this._prefix}${name}`, value, options);
  }
  async read<T>(name: string, options?: {signal?: IAbortSignal}) {
    return await this._store.read<T>(`${this._prefix}${name}`, options);
  }
}
