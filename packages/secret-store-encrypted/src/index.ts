import {throwAbortError} from '@rollinginfra/abort-error';
import {
  IAbortSignal,
  ISecretEncryption,
  ISecretStore,
  IStateStore,
  IStateStoreValue,
} from '@rollinginfra/types';

export interface SecretStoreEncryptedConfig {
  store: IStateStore;
  encryption: ISecretEncryption;
}
export default class SecretStoreEncrypted implements ISecretStore {
  private readonly _store: IStateStore;
  private readonly _encryption: ISecretEncryption;
  private readonly _cache = new Map<
    string,
    Promise<IStateStoreValue<any> | null>
  >();
  constructor({store, encryption}: SecretStoreEncryptedConfig) {
    this._store = store;
    this._encryption = encryption;
  }

  private _getState(name: string): Promise<IStateStoreValue<any> | null> {
    const cached = this._cache.get(name);
    if (cached)
      return cached.catch(() => {
        this._cache.delete(name);
        return Promise.resolve(null).then(() => {
          return this._getState(name);
        });
      });
    const fresh = this._store.read(name);
    this._cache.set(name, fresh);
    return fresh;
  }
  private async _updateState<T>(
    name: string,
    update: (oldValue: T | null) => Promise<T | null>,
  ): Promise<void> {
    const statePromise = this._getState(name);
    const updatedPromise = statePromise.then(async (state) => {
      if (state) {
        const updated = await update(state.value);
        if (updated === state.value) {
          return state;
        }
        if (updated === null) {
          await state.delete();
          return null;
        }
        return state.update(updated);
      } else {
        const updated = await update(null);
        if (updated === null) {
          return null;
        }
        return this._store.create(name, updated);
      }
    });
    this._cache.set(name, updatedPromise);
    await updatedPromise;
  }

  async write(
    name: string,
    plaintext: string,
    options?: {signal?: IAbortSignal},
  ): Promise<void> {
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    const ciphertext = await this._encryption.encrypt(plaintext, options);
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    await this._updateState<string>(`key/${name}`, async (oldValue) => {
      if (oldValue === null) {
        await this._updateState<string[]>(`keys`, async (oldValue) =>
          oldValue?.includes(name)
            ? oldValue
            : [...(oldValue ?? []), name].sort(),
        );
      }
      return ciphertext;
    });
  }
  async read(
    name: string,
    options?: {signal?: IAbortSignal},
  ): Promise<string | null> {
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    const state = await this._getState(`key/${name}`);
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    if (!state) return null;
    return this._encryption.decrypt(state.value, options);
  }
  async delete(name: string, options?: {signal?: IAbortSignal}): Promise<void> {
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    await this._updateState<string>(`key/${name}`, async (oldValue) => {
      return null;
    });
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    await this._updateState<string[]>(`keys`, async (oldValue) =>
      oldValue?.includes(name) ? oldValue.filter((v) => v !== name) : oldValue,
    );
  }
  async listKeys(options?: {signal?: IAbortSignal}): Promise<string[]> {
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    const state = await this._getState(`keys`);
    if (options?.signal?.aborted) {
      return throwAbortError();
    }
    const keys: string[] = state?.value ?? [];
    const keysWithState = await Promise.all(
      keys.map(async (name) => ({
        name,
        state: await this._getState(`key/${name}`),
      })),
    );
    return keysWithState.filter((k) => k.state).map((k) => k.name);
  }
}
