# State Store - Namespace

Split one physical store into multiple logical store by specifying prefixes for stores.

## Usage

```ts
import StateStoreGoogleObjects from '@rollinginfra/state-store-google-objects';
import StateStoreNamespace from '@rollinginfra/state-store-local-file-system';

const state = new StateStoreGoogleObjects({
  googleProjectID: `YOUR_GOOGLE_PROJECT_NAME`,
  bucketName: `YOUR_BUCKET_NAME`,
});

const resourcesState = new StateStoreNamespace({
  prefix: `resources/`,
  state,
});
const secretsState = new StateStoreNamespace({
  prefix: `secrets/`,
  state,
});
```
