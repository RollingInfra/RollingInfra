import IAbortSignal from './IAbortSignal';

export default interface ISecretEncryption {
  encrypt(
    plaintext: string,
    options?: {signal?: IAbortSignal},
  ): Promise<string>;
  decrypt(
    ciphertext: string,
    options?: {signal?: IAbortSignal},
  ): Promise<string>;
}
