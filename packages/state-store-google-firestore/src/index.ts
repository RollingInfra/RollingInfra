import {
  Firestore,
  CollectionReference,
  DocumentData,
  Timestamp,
  DocumentReference,
} from '@google-cloud/firestore';
import {IStateStore, IStateStoreValue} from '@rollinginfra/types';
import assertValidUnicode from '@databases/validate-unicode';
import shortHash from 'generate-alphabetic-name';

export interface GoogleFirestoreStoreConfig {
  googleProjectID: string;
  collectionName: string;
}

// Must be valid UTF-8 characters
// Must be no longer than 1,500 bytes
// Cannot contain a forward slash (/)
// Cannot solely consist of a single period (.) or double periods (..)
// Cannot match the regular expression __.*__
function formatName(name: string) {
  assertValidUnicode(name);

  return `${name.replace(/\//g, '_').substr(0, 100)}-${shortHash(name)}`;
}

function getDoc(
  collection: CollectionReference<DocumentData>,
  name: string,
): FirebaseFirestore.DocumentReference {
  return collection.doc(formatName(name));
}

function makeValue<T>(
  doc: DocumentReference,
  timestamp: Timestamp,
  value: T,
): IStateStoreValue<T> {
  return {
    value,
    async update(newValue) {
      const {writeTime} = await doc.update(
        {state: JSON.parse(JSON.stringify(newValue))},
        {
          lastUpdateTime: timestamp,
        },
      );
      return makeValue<T>(doc, writeTime, JSON.parse(JSON.stringify(newValue)));
    },
    async delete() {
      await doc.delete({lastUpdateTime: timestamp});
    },
  };
}

export default class StateStoreGoogleFirestore implements IStateStore {
  private readonly _collection: CollectionReference<DocumentData>;
  constructor({googleProjectID, collectionName}: GoogleFirestoreStoreConfig) {
    const client = new Firestore({
      projectId: googleProjectID,
    });
    this._collection = client.collection(collectionName);
  }
  async create<T>(name: string, value: T) {
    const v: T = JSON.parse(JSON.stringify(value));
    const doc = getDoc(this._collection, name);
    const {writeTime} = await doc.create({state: v});
    return makeValue<T>(doc, writeTime, JSON.parse(JSON.stringify(value)));
  }
  async read<T>(name: string) {
    const doc = getDoc(this._collection, name);
    const d = await doc.get();
    const data = d.exists && d.data();
    const timestamp = d.updateTime ?? d.createTime;
    return data && timestamp ? makeValue<T>(doc, timestamp, data.state) : null;
  }
}
