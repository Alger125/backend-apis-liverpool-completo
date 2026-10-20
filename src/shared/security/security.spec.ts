import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from '@jest/globals';
import type { Request } from 'express';
import { ApiKeyGuard } from './security';

function context(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const userId = '00000000-0000-4000-8000-000000000001';

  function guard(values: Record<string, string>): ApiKeyGuard {
    return new ApiKeyGuard({ get: (key: string) => values[key] } as ConfigService);
  }

  it('acepta una llave valida desde loopback', () => {
    const request = {
      headers: { 'x-dev-api-key': 'new-local-key' },
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: 'development',
      DEV_API_KEY: 'new-local-key',
      DEV_USER_ID: userId,
    });
    expect(subject.canActivate(context(request))).toBe(true);
    expect((request as Request & { user: { id: string } }).user.id).toBe(userId);
  });

  it('rechaza una llave invalida', () => {
    const request = {
      headers: { 'x-dev-api-key': 'old-key' },
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: 'development',
      DEV_API_KEY: 'new-local-key',
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(UnauthorizedException);
  });

  it('rechaza conexiones no locales', () => {
    const request = {
      headers: { 'x-dev-api-key': 'new-local-key' },
      ip: '10.10.10.25',
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: 'development',
      DEV_API_KEY: 'new-local-key',
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(ForbiddenException);
  });

  it('se deshabilita fuera de development y test', () => {
    const request = {
      headers: { 'x-dev-api-key': 'new-local-key' },
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: 'production',
      DEV_API_KEY: 'new-local-key',
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(ServiceUnavailableException);
  });

  it('rechaza la configuracion placeholder', () => {
    const request = {
      headers: { 'x-dev-api-key': 'change-me' },
      ip: '127.0.0.1',
      socket: {},
    } as unknown as Request;
    const subject = guard({
      NODE_ENV: 'development',
      DEV_API_KEY: 'change-me',
      DEV_USER_ID: userId,
    });
    expect(() => subject.canActivate(context(request))).toThrow(ServiceUnavailableException);
  });
});
