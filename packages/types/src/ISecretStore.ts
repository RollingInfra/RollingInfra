import IAbortSignal from './IAbortSignal';

export default interface ISecretStore {
  write(
    name: string,
    plaintext: string,
    options?: {signal?: IAbortSignal},
  ): Promise<void>;
  read(name: string, options?: {signal?: IAbortSignal}): Promise<string | null>;
  delete(name: string, options?: {signal?: IAbortSignal}): Promise<void>;
  listKeys(options?: {signal?: IAbortSignal}): Promise<string[]>;
}
