# State Store - Google Objects

Store JSON state objects in Google Objects. Keys can be any valid UTF-8 string.

N.B. Google Objects do not offer transactional safety. Although Google Objects may be simpler to set up, your state may be safer to store in the Google Firestore storage

## Set Up Google Google Cloud Storage Objects

1. Enable the Cloud Storage API
2. [Create a bucket](https://console.cloud.google.com/storage/browser) **N.B.** Bucket names must be globally unique, not just unique within a project.

## Set up your local environment

You can set up your local environment by running `gcloud init` and following the prompts to authenticate.

```ts
import StateStoreGoogleObjects from '@rollinginfra/state-store-google-objects';

const state = new StateStoreGoogleObjects({
  googleProjectID: `YOUR_GOOGLE_PROJECT_NAME`,
  bucketName: `YOUR_BUCKET_NAME`,
});
```
