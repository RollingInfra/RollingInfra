export default interface IAbortSignal {
  readonly aborted: boolean;
  addEventListener(name: 'abort', handler: () => void): void;
  removeEventListener(name: 'abort', handler: () => void): void;
}