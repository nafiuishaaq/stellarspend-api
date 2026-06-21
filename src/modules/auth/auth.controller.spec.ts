import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController rate limiting', () => {
  let app: INestApplication;

  const loginPayload = {
    publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    signature: 'invalid-signature',
    message: 'login-message',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 5 }],
          setHeaders: true,
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockRejectedValue(new UnauthorizedException('Invalid signature')),
            getStatus: jest.fn().mockReturnValue({ module: 'Auth', status: 'Working' }),
          },
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 after exceeding the login rate limit', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer()).post('/auth/login').send(loginPayload);
    }

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginPayload);

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    });
  });

  it('includes rate limit headers on login responses', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginPayload);

    expect(response.headers['x-ratelimit-limit']).toBe('5');
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });
});
