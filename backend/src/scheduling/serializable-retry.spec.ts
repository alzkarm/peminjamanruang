import { SchedulingBusyError, runSerializableWithRetry } from './serializable-retry';

describe('runSerializableWithRetry', () => {
  it('retries P2034 failures and returns the successful result', async () => {
    let attempts = 0;
    const result = await runSerializableWithRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw { code: 'P2034' };
      return 'committed';
    });

    expect(result).toBe('committed');
    expect(attempts).toBe(3);
  });

  it('fails clearly after three serialization failures', async () => {
    let attempts = 0;
    await expect(
      runSerializableWithRetry(async () => {
        attempts += 1;
        throw { code: 'P2034' };
      }),
    ).rejects.toBeInstanceOf(SchedulingBusyError);
    expect(attempts).toBe(3);
  });

  it('does not retry unrelated failures', async () => {
    let attempts = 0;
    const failure = new Error('database unavailable');
    await expect(
      runSerializableWithRetry(async () => {
        attempts += 1;
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(attempts).toBe(1);
  });
});
