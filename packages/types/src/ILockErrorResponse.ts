import ILockState from './ILockState';

export default interface ILockErrorResponse {
  ok: false;
  user: ILockState;
  removeLock(): Promise<void>;
}
