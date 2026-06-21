import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountStatusGuard } from '../../common/guards/account-status.guard';

describe('NotificationsController rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 10 }],
          setHeaders: true,
        }),
      ],
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            getStatus: jest.fn().mockReturnValue({ module: 'Notifications', status: 'Working' }),
            findByUserId: jest.fn(),
            findUnreadByUserId: jest.fn(),
            create: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AccountStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 after exceeding the notifications rate limit', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer()).get('/notifications/status');
    }

    const response = await request(app.getHttpServer()).get('/notifications/status');

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    });
  });

  it('includes rate limit headers on notification responses', async () => {
    const response = await request(app.getHttpServer()).get('/notifications/status');

    expect(response.headers['x-ratelimit-limit']).toBe('5');
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });
});
