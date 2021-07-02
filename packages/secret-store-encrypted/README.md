# Secret Store - Encrypted

Combine an `IStateStore` and an `ISecretEncryption` to securely store encrypted secrets in a standard object store.

## Usage

```ts
import SecretEncryptionGoogleKms from '@rollinginfra/secret-encryption-google-kms';
import SecretStoreEncrypted from '@rollinginfra/secret-store-encrypted';
import StateStoreLocalFileSystem from '@rollinginfra/state-store-local-file-system';

const secrets = new SecretStoreEncrypted({
  store: new StateStoreLocalFileSystem({
    filename: `secrets.json`,
  }),
  encryption: new SecretEncryptionGoogleKms({
    googleProjectID: `YOUR_GOOGLE_PROJECT_NAME`,
    keyRingName: `YOUR_KEY_RING_NAME`,
    keyName: `YOUR_KEY_NAME`,
    location: `YOUR_KEY_RING_LOCATION`,
  }),
});
```
