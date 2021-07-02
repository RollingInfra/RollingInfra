# State Store - Local File System

Store JSON state objects in a file. Keys can be any valid UTF-8 string.

## Usage

```ts
import StateStoreLocalFileSystem from '@rollinginfra/state-store-local-file-system';

const state = new StateStoreLocalFileSystem({
  filename: `state.json`,
});
```
