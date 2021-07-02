import * as ae from './';

test(`abort error`, () => {
  expect(ae.isAbortError(ae.createAbortError())).toBe(true);
  expect(ae.createAbortError(`custom message`).message).toBe(`custom message`);
});
