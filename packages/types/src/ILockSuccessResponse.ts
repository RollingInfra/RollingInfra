import ILockState from './ILockState';

export default interface ILockSuccessResponse {
  ok: true;
  user: ILockState;
  removeLock(): Promise<void>;
}
