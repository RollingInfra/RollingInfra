# Secret Encryption - Fake

Implements the `ISecretEncryption` interface for encrypting secrets, but **does no real encryption**.

This package only base64 encodes secrets. It should never be used to encrypt genuine secrets.

## Usage

```ts
import SecretEncryptionFake from '@rollinginfra/secret-encryption-fake';

const encryption = new SecretEncryptionFake();
```
