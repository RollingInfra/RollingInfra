import {KeyManagementServiceClient} from '@google-cloud/kms';
import {ISecretEncryption} from '@rollinginfra/types';
import crc32c from './crc32c';

export interface GoogleSecretEncryptionConfig {
  googleProjectID: string;
  keyRingName: string;
  keyName: string;
  location: string;
}
export interface GoogleSecretEncryption extends ISecretEncryption {
  createKeyRing(): Promise<void>;
  createKey(): Promise<void>;
}

function getKeyRingParentName({
  googleProjectID,
  location,
}: Pick<GoogleSecretEncryptionConfig, 'googleProjectID' | 'location'>) {
  return `projects/${googleProjectID}/locations/${location}`;
}
function getFullKeyRingName({
  keyRingName,
  ...config
}: Pick<
  GoogleSecretEncryptionConfig,
  'googleProjectID' | 'keyRingName' | 'location'
>) {
  return `${getKeyRingParentName(config)}/keyRings/${keyRingName}`;
}

function getFullKeyName({keyName, ...config}: GoogleSecretEncryptionConfig) {
  return `${getFullKeyRingName(config)}/cryptoKeys/${keyName}`;
}

async function getKeyRingsForClient(
  client: KeyManagementServiceClient,
  config: Pick<GoogleSecretEncryptionConfig, 'googleProjectID' | 'location'>,
): Promise<{projectID: string; location: string; name: string}[]> {
  const [rings] = await client.listKeyRings({
    parent: getKeyRingParentName(config),
  });
  return rings.flatMap((r) => {
    if (!r.name) return [];
    const match = /^projects\/(.+)\/locations\/(.+)\/keyRings\/(.+)$/.exec(
      r.name,
    );
    if (!match) return [];
    return [{projectID: match[1], location: match[2], name: match[3]}];
  });
}

export async function getKeyRings(
  config: Pick<GoogleSecretEncryptionConfig, 'googleProjectID' | 'location'>,
): Promise<{projectID: string; location: string; name: string}[]> {
  const client = new KeyManagementServiceClient({
    projectId: config.googleProjectID,
  });
  return await getKeyRingsForClient(client, config);
}

async function getKeysForClient(
  client: KeyManagementServiceClient,
  config: Pick<
    GoogleSecretEncryptionConfig,
    'googleProjectID' | 'keyRingName' | 'location'
  >,
): Promise<
  {projectID: string; location: string; keyRingName: string; name: string}[]
> {
  const [keys] = await client.listCryptoKeys({
    parent: getFullKeyRingName(config),
  });
  return keys
    .filter(
      (k) => k.purpose === 'ENCRYPT_DECRYPT' && k.nextRotationTime === null,
    )
    .flatMap((r) => {
      if (!r.name) return [];
      const match = /^projects\/(.+)\/locations\/(.+)\/keyRings\/(.+)\/cryptoKeys\/(.+)$/.exec(
        r.name,
      );
      if (!match) return [];
      return [
        {
          projectID: match[1],
          location: match[2],
          keyRingName: match[3],
          name: match[4],
        },
      ];
    });
}

export async function getKeys(
  config: Pick<
    GoogleSecretEncryptionConfig,
    'googleProjectID' | 'keyRingName' | 'location'
  >,
): Promise<
  {projectID: string; location: string; keyRingName: string; name: string}[]
> {
  const client = new KeyManagementServiceClient({
    projectId: config.googleProjectID,
  });
  return getKeysForClient(client, config);
}

export async function createKeyRing({
  keyRingName,
  ...config
}: Pick<
  GoogleSecretEncryptionConfig,
  'googleProjectID' | 'keyRingName' | 'location'
>): Promise<void> {
  const client = new KeyManagementServiceClient({
    projectId: config.googleProjectID,
  });
  await client.createKeyRing({
    parent: getKeyRingParentName(config),
    keyRingId: keyRingName,
  });
}
export async function createKey({
  keyName,
  ...config
}: GoogleSecretEncryptionConfig): Promise<void> {
  const client = new KeyManagementServiceClient({
    projectId: config.googleProjectID,
  });
  await client.createCryptoKey({
    parent: getFullKeyRingName(config),
    cryptoKeyId: keyName,
    cryptoKey: {
      purpose: 'ENCRYPT_DECRYPT',
    },
  });
}

export default class SecretEncryptionGoogleKms implements ISecretEncryption {
  private readonly _client: KeyManagementServiceClient;
  private readonly _keyName: string;
  constructor(options: GoogleSecretEncryptionConfig) {
    this._client = new KeyManagementServiceClient({
      projectId: options.googleProjectID,
    });
    this._keyName = getFullKeyName(options);
  }
  async encrypt(plaintext: string): Promise<string> {
    const plaintextBuffer = Buffer.from(plaintext, `utf8`);
    const plaintextCrc32c = crc32c(plaintextBuffer);
    const [encryptResponse] = await this._client.encrypt({
      name: this._keyName,
      plaintext: plaintextBuffer,
      plaintextCrc32c: {
        value: plaintextCrc32c,
      },
    });
    const ciphertextBuffer = Buffer.from(encryptResponse.ciphertext!);

    // Optional, but recommended: perform integrity verification on encryptResponse.
    // For more details on ensuring E2E in-transit integrity to and from Cloud KMS visit:
    // https://cloud.google.com/kms/docs/data-integrity-guidelines
    if (!encryptResponse.verifiedPlaintextCrc32c) {
      throw new Error('Encrypt: request corrupted in-transit');
    }
    if (
      crc32c(ciphertextBuffer) !==
      Number(encryptResponse.ciphertextCrc32c!.value)
    ) {
      throw new Error('Encrypt: response corrupted in-transit');
    }

    return ciphertextBuffer.toString(`base64`);
  }
  async decrypt(ciphertext: string): Promise<string> {
    const ciphertextBuffer = Buffer.from(ciphertext, `base64`);
    const ciphertextCrc32c = crc32c(ciphertextBuffer);
    const [decryptResponse] = await this._client.decrypt({
      name: this._keyName,
      ciphertext: ciphertextBuffer,
      ciphertextCrc32c: {
        value: ciphertextCrc32c,
      },
    });
    const plaintextBuffer = Buffer.from(decryptResponse.plaintext!);

    // Optional, but recommended: perform integrity verification on encryptResponse.
    // For more details on ensuring E2E in-transit integrity to and from Cloud KMS visit:
    // https://cloud.google.com/kms/docs/data-integrity-guidelines
    if (
      crc32c(plaintextBuffer) !== Number(decryptResponse.plaintextCrc32c!.value)
    ) {
      throw new Error('Decrypt: response corrupted in-transit');
    }

    return plaintextBuffer.toString(`utf8`);
  }
}
