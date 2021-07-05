import {Bucket, Storage} from '@google-cloud/storage';
import {IStateStore, IStateStoreValue} from '@rollinginfra/types';
import assertValidUnicode from '@databases/validate-unicode';
import shortHash from 'generate-alphabetic-name';

export interface GoogleObjectsStoreConfig {
  googleProjectID: string;
  bucketName: string;
}

// Object names can contain any sequence of valid Unicode characters, of length 1-1024 bytes when UTF-8 encoded.
// Object names cannot contain Carriage Return or Line Feed characters.
// Object names cannot start with .well-known/acme-challenge/.
// Objects cannot be named . or ...
// Avoid using control characters that are illegal in XML 1.0 (#x7F–#x84 and #x86–#x9F): these characters cause XML listing issues when you try to list your objects.
// Avoid using "#" in your object names: gsutil interprets object names ending with #<numeric string> as version identifiers, so including "#" in object names can make it difficult or impossible to perform operations on such versioned objects using gsutil (see Object Versioning and Concurrency Control).
// Avoid using "[", "]", "*", or "?" in your object names: gsutil interprets these characters as wildcards, so including them in object names can make it difficult or impossible to perform wildcard operations using gsutil.
function formatName(name: string) {
  assertValidUnicode(name);

  return `${name.startsWith('.well-known') ? `_` : ``}${name
    .replace(/[\[\]\*\?\r\n\#]/g, '_')
    .substr(0, 100)}-${shortHash(name)}`;
}

export async function getBuckets({
  googleProjectID,
}: Pick<GoogleObjectsStoreConfig, 'googleProjectID'>): Promise<
  {name: string}[]
> {
  const client = new Storage({
    projectId: googleProjectID,
  });
  const [buckets] = await client.getBuckets({});
  return buckets.map((b) => ({name: b.name}));
}

export async function createBucket({
  googleProjectID,
  bucketName,
}: Pick<
  GoogleObjectsStoreConfig,
  'googleProjectID' | 'bucketName'
>): Promise<void> {
  const client = new Storage({
    projectId: googleProjectID,
  });
  await client.createBucket(bucketName);
}

async function writeBuffer(
  bucket: Bucket,
  name: string,
  data: Buffer,
): Promise<void> {
  await bucket.file(formatName(name)).save(data);
}
async function readBuffer(bucket: Bucket, name: string): Promise<Buffer> {
  const [response] = await bucket.file(formatName(name)).download();
  return response;
}

function makeValue<T>(
  bucket: Bucket,
  name: string,
  value: T,
): IStateStoreValue<T> {
  return {
    value,
    async update(newValue) {
      const str = JSON.stringify(newValue, null, `  `);
      await writeBuffer(bucket, name, Buffer.from(str));
      return makeValue<T>(bucket, name, JSON.parse(str));
    },
    async delete() {
      await bucket.file(formatName(name)).delete();
    },
  };
}

export default class StateStoreGoogleObjects implements IStateStore {
  private readonly _bucket: Bucket;
  constructor({googleProjectID, bucketName}: GoogleObjectsStoreConfig) {
    const client = new Storage({
      projectId: googleProjectID,
    });
    this._bucket = client.bucket(bucketName);
  }
  async create<T>(name: string, value: T) {
    const str = JSON.stringify(value, null, `  `);
    await writeBuffer(this._bucket, name, Buffer.from(str));
    return makeValue<T>(this._bucket, name, JSON.parse(str));
  }
  async read<T>(name: string) {
    let buf: Buffer | undefined;
    try {
      buf = await readBuffer(this._bucket, name);
    } catch (ex) {
      return null;
    }
    return makeValue<T>(this._bucket, name, JSON.parse(buf.toString('utf8')));
  }
}
