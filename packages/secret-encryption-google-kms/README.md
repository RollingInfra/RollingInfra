# Secret Encryption - Google KMS

Encrypt and decrypt secret strings using the Google KMS service.

## Set Up Google KMS

1. Open [Google KMS in the Google Cloud Console](https://console.cloud.google.com/marketplace/product/google/cloudkms.googleapis.com)
1. Enable the API (if not already enabled) by clicking "Enable API"
1. Go to ["Security" -> "Key Management" in the Google Cloud Console](https://console.cloud.google.com/security/kms/keyrings)
1. Create a key ring, noting down the key ring name and key ring location for later.
1. Create a key in your new key ring, noting down the key name for later. The "Purpose" must be set to "Symmetric encrypt/decrypt". All other settings can have any value.
1. (Optional) Use "+ Add Member" on the permissions tab to give the "Cloud KMS CryptoKey Encrypter/Decrypter" role to anyone account that needs to use this secret store.

## Set up your local environment

You can set up your local environment by running `gcloud init` and following the prompts to authenticate.

```ts
import SecretEncryptionGoogleKms from '@rollinginfra/secret-encryption-google-kms';

const encryption = new SecretEncryptionGoogleKms({
  googleProjectID: `YOUR_GOOGLE_PROJECT_NAME`,
  keyRingName: `YOUR_KEY_RING_NAME`,
  keyName: `YOUR_KEY_NAME`,
  location: `YOUR_KEY_RING_LOCATION`,
});
```
