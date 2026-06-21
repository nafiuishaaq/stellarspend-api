import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Request, Response } from 'express';

import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  let logSpy: jest.SpyInstance;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_047);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs method, original URL, status code, and duration when the response finishes', () => {
    const middleware = new LoggerMiddleware();
    const req = {
      method: 'POST',
      originalUrl: '/api/transactions?limit=10',
    } as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode: 201,
    }) as Response & EventEmitter;
    const next = jest.fn();

    middleware.use(req, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(dateNowSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      'POST /api/transactions?limit=10 201 - 47ms',
    );
  });

  it('does not log before the response emits finish', () => {
    const middleware = new LoggerMiddleware();
    const req = {
      method: 'GET',
      originalUrl: '/api/wallet',
    } as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as Response & EventEmitter;

    middleware.use(req, res, jest.fn());

    expect(logSpy).not.toHaveBeenCalled();
  });
});
