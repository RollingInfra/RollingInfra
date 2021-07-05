export default interface ILockState {
  username: string;
  hostname: string;
  platform: NodeJS.Platform;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
