import {userInfo, hostname, platform} from 'os';
import {
  IStateStore,
  ILock,
  ILockErrorResponse,
  ILockState,
  ILockSuccessResponse,
} from '@rollinginfra/types';

// If the lock is not updated, it automatically expires after 10 minutes
// We refresh it every 10 seconds to prevent that happening while a deployment
// is running.
const ERR_LOCK_REFRESH_MS = 500;
const LOCK_REFRESH_MS = 10_000;
const LOCK_EXPIRY_MS = 10 * 60_000;

const LOCK_KEY = `lock`;
interface LockStateJSON {
  username: string;
  hostname: string;
  platform: NodeJS.Platform;
  createdAt: string; // ISO8601 UTC Timestamp
  updatedAt: string; // ISO8601 UTC Timestamp
  expiresAt: string; // ISO8601 UTC Timestamp
}
export interface LockStateStoreConfig {
  store: IStateStore;
}
export default class LockStateStore implements ILock {
  private readonly _store: IStateStore;
  constructor({store}: LockStateStoreConfig) {
    this._store = store;
  }
  async getCurrentLockHolder(): Promise<Pick<
    ILockErrorResponse,
    'user' | 'removeLock'
  > | null> {
    const now = Date.now();
    const currentLock = await this._store.read<LockStateJSON>(LOCK_KEY);
    if (currentLock && new Date(currentLock.value.expiresAt).getTime() < now) {
      await currentLock.delete();
    } else if (currentLock) {
      return {
        user: {
          username: currentLock.value.username,
          hostname: currentLock.value.hostname,
          platform: currentLock.value.platform,
          createdAt: new Date(currentLock.value.createdAt),
          updatedAt: new Date(currentLock.value.updatedAt),
          expiresAt: new Date(currentLock.value.expiresAt),
        },
        async removeLock() {
          await currentLock.delete();
        },
      };
    }
    return null;
  }
  async acquireLock(): Promise<ILockSuccessResponse | ILockErrorResponse> {
    const now = Date.now();
    const currentLock = await this._store.read<LockStateJSON>(LOCK_KEY);
    if (currentLock && new Date(currentLock.value.expiresAt).getTime() < now) {
      await currentLock.delete();
    } else if (currentLock) {
      return {
        ok: false,
        user: {
          username: currentLock.value.username,
          hostname: currentLock.value.hostname,
          platform: currentLock.value.platform,
          createdAt: new Date(currentLock.value.createdAt),
          updatedAt: new Date(currentLock.value.updatedAt),
          expiresAt: new Date(currentLock.value.expiresAt),
        },
        async removeLock() {
          await currentLock.delete();
        },
      };
    }
    let freshLock = await this._store.create<LockStateJSON>(LOCK_KEY, {
      username: userInfo().username,
      hostname: hostname(),
      platform: platform(),
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + LOCK_EXPIRY_MS).toISOString(),
    });
    let freshestLock = Promise.resolve(freshLock);
    let releasedLock = false;
    let refreshTimeout = setTimeout(() => {
      refreshLock();
    }, LOCK_REFRESH_MS);
    function refreshLock() {
      if (releasedLock) return;
      const now = Date.now();
      freshestLock = freshLock
        .update({
          ...freshLock.value,
          updatedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + LOCK_EXPIRY_MS).toISOString(),
        })
        .then(
          (updated) => {
            if (releasedLock) return updated;
            freshLock = updated;
            refreshTimeout = setTimeout(() => {
              refreshLock();
            }, LOCK_REFRESH_MS);
            return freshLock;
          },
          (err) => {
            if (releasedLock) return freshLock;
            if (
              new Date(freshLock.value.expiresAt).getTime() <
              Date.now() + ERR_LOCK_REFRESH_MS + 1000
            ) {
              setImmediate(() => {
                throw err;
              });
            } else {
              refreshTimeout = setTimeout(() => {
                refreshLock();
              }, ERR_LOCK_REFRESH_MS);
            }
            return freshLock;
          },
        );
    }
    return {
      ok: true,
      user: {
        username: freshLock.value.username,
        hostname: freshLock.value.hostname,
        platform: freshLock.value.platform,
        createdAt: new Date(freshLock.value.createdAt),
        get updatedAt() {
          return new Date(freshLock.value.updatedAt);
        },
        get expiresAt() {
          return new Date(freshLock.value.expiresAt);
        },
      },
      async removeLock() {
        releasedLock = true;
        clearTimeout(refreshTimeout);
        const lock = await freshestLock;
        await lock.delete();
      },
    };
  }
}
