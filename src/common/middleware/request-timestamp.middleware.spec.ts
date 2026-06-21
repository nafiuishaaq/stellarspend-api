import { Logger } from '@nestjs/common';
import { Response } from 'express';

import { RequestTimestampMiddleware } from './request-timestamp.middleware';

interface RequestWithTimestamp {
  method: string;
  url: string;
  requestTimestamp?: string;
}

describe('RequestTimestampMiddleware', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-06-20T08:15:30.123Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('attaches an ISO timestamp to the request before continuing', () => {
    const middleware = new RequestTimestampMiddleware();
    const req: RequestWithTimestamp = {
      method: 'PATCH',
      url: '/api/budgets/weekly',
    };
    const next = jest.fn();

    middleware.use(req as never, {} as Response, next);

    expect(req.requestTimestamp).toBe('2026-06-20T08:15:30.123Z');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs the timestamped request method and URL', () => {
    const middleware = new RequestTimestampMiddleware();
    const req: RequestWithTimestamp = {
      method: 'DELETE',
      url: '/api/transactions/txn_123',
    };

    middleware.use(req as never, {} as Response, jest.fn());

    expect(logSpy).toHaveBeenCalledWith(
      '[2026-06-20T08:15:30.123Z] DELETE /api/transactions/txn_123',
    );
  });
});
