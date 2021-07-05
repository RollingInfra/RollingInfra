import ILockErrorResponse from './ILockErrorResponse';
import ILockSuccessResponse from './ILockSuccessResponse';

export default interface ILock {
  getCurrentLockHolder(): Promise<Pick<
    ILockErrorResponse,
    'user' | 'removeLock'
  > | null>;
  acquireLock(): Promise<ILockSuccessResponse | ILockErrorResponse>;
}
