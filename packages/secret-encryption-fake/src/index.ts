import {ISecretEncryption} from '@rollinginfra/types';

export default class SecretEncryptionFake implements ISecretEncryption {
  async encrypt(plaintext: string): Promise<string> {
    return Buffer.from(plaintext, `utf8`).toString(`base64`);
  }
  async decrypt(ciphertext: string): Promise<string> {
    return Buffer.from(ciphertext, `base64`).toString(`utf8`);
  }
}
