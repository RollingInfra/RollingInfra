// GUID rather than using Symbol so that it doesn't fail if you have multiple
// instances of the package, e.g. one locally installed & one globally installed
const ABORT_ERROR = `ABORT_ERROR_94bfb5ab-1519-4a57-b318-1f5f347718be`;

export interface IAbortError extends Error {
  readonly code: 'ABORT';
  readonly [ABORT_ERROR]: true;
}

export function isAbortError(err: unknown): err is IAbortError {
  return (
    typeof err === 'object' &&
    err !== null &&
    err instanceof Error &&
    (err as any)[ABORT_ERROR] === true
  );
}

export function createAbortError(
  message: string = `Operation aborted`,
): IAbortError {
  return Object.assign(new Error(message), {
    code: 'ABORT' as const,
    [ABORT_ERROR]: true as const,
  });
}

export function throwAbortError(message: string = `Operation aborted`): never {
  throw createAbortError(message);
}
