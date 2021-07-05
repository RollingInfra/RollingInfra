# State Store - Google Firestore

Store JSON state objects in Google Firestore. Keys can be any valid UTF-8 string.

## Set Up Google Firestore

1. [Enable the Firestore API](https://console.cloud.google.com/flows/enableapi?apiid=firestore.googleapis.com)
2. [Create a Firestore database instance](https://console.cloud.google.com/firestore/data) **N.B.** You must select the "Native mode" if prompted to choose a mode. The Datastore mode is for legacy support, and will not work with this package.
3. Choose a collection name. You don't actually need to create it as collections are automatically created when documents are added to them.

## Set up your local environment

You can set up your local environment by running `gcloud init` and following the prompts to authenticate.

```ts
import StateStoreGoogleFirestore from '@rollinginfra/state-store-google-firestore';

const state = new StateStoreGoogleFirestore({
  googleProjectID: `YOUR_GOOGLE_PROJECT_NAME`,
  collectionName: `YOUR_COLLECTION_NAME`,
});
```
