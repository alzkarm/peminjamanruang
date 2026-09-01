import { SERIALIZABLE_MAX_ATTEMPTS } from './scheduling.constants';

export class SchedulingBusyError extends Error {
  readonly code = 'SCHEDULING_BUSY';

  constructor() {
    super('Sistem penjadwalan sedang sibuk. Silakan coba kembali.');
    this.name = 'SchedulingBusyError';
  }
}

export async function runSerializableWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      if (error?.code !== 'P2034') throw error;
      if (attempt === maxAttempts) throw new SchedulingBusyError();
    }
  }
  throw new SchedulingBusyError();
}
