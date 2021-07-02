import {promises as fs} from 'fs';
import {IStateStore, IStateStoreValue} from '@rollinginfra/types';
import throat from 'throat';

export interface StateStoreFileSystemConfig {
  filename: string;
}

interface StoreStructure {
  [key: string]: StoreValue | undefined;
}
interface StoreValue {
  value: any;
  version: number;
}

interface FileUpdater {
  get(name: string): Promise<StoreValue | undefined>;
  set(
    name: string,
    value: any,
    previousVersion: number,
  ): Promise<StoreValue | undefined>;
  delete(name: string, previousVersion: number): Promise<boolean>;
}
function fileUpdater(filename: string): FileUpdater {
  const lock = throat(1);
  const read = (): Promise<StoreStructure> =>
    fs.readFile(filename, `utf8`).then(
      (data) => JSON.parse(data),
      (err) => {
        if (err.code === `ENOENT`) return {};
        throw err;
      },
    );
  let currentFileContents = read();
  return {
    async get(name: string) {
      return (await currentFileContents)[name];
    },
    async set(name: string, value: any, previousVersion: number) {
      return await lock(async () => {
        let updated: StoreValue | undefined;
        await (currentFileContents = read().then(
          async (currentFileContents) => {
            if (
              previousVersion === 0
                ? currentFileContents[name] === undefined
                : currentFileContents[name]?.version === previousVersion
            ) {
              updated = currentFileContents[name] = {
                value,
                version: previousVersion + 1,
              };
            }
            await fs.writeFile(
              filename,
              JSON.stringify(currentFileContents, null, `  `),
            );
            return currentFileContents;
          },
        ));
        return updated;
      });
    },
    async delete(name: string, previousVersion: number) {
      return await lock(async () => {
        let deleted = false;
        await (currentFileContents = read().then(
          async (currentFileContents) => {
            if (
              previousVersion === 0
                ? currentFileContents[name] === undefined
                : currentFileContents[name]?.version === previousVersion
            ) {
              currentFileContents[name] = undefined;
              deleted = true;
            }
            await fs.writeFile(
              filename,
              JSON.stringify(currentFileContents, null, `  `),
            );
            return currentFileContents;
          },
        ));
        return deleted;
      });
    },
  };
}
function makeValue<T>(
  updater: FileUpdater,
  name: string,
  value: T,
  version: number,
): IStateStoreValue<T> {
  return {
    value: JSON.parse(JSON.stringify(value)),
    async update(newValue) {
      const v: T = JSON.parse(JSON.stringify(newValue));
      const updated = await updater.set(
        name,
        JSON.parse(JSON.stringify(newValue)),
        version,
      );
      if (!updated) {
        throw new Error(`Conflict encountered while writing ${name}`);
      }
      return makeValue<T>(updater, name, updated.value, updated.version);
    },
    async delete() {
      const deleted = await updater.delete(name, version);
      if (!deleted) {
        throw new Error(`Conflict encountered while deleting ${name}`);
      }
    },
  };
}

export default class StateStoreFileSystem implements IStateStore {
  private readonly _updater: FileUpdater;
  constructor({filename}: StateStoreFileSystemConfig) {
    this._updater = fileUpdater(filename);
  }
  async create<T>(name: string, value: T) {
    const record = await this._updater.set(name, value, 0);
    if (!record) throw new Error(`Record exists with the name ${name}`);
    return makeValue<T>(this._updater, name, record.value, record.version);
  }
  async read<T>(name: string) {
    const record = await this._updater.get(name);
    if (!record) return null;
    return makeValue<T>(this._updater, name, record.value, record.version);
  }
}
