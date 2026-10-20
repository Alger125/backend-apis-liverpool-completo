import type { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyGuard, PermissionsGuard } from '../../../shared/security/security';
import { RolesService } from '../application/roles.service';
import { RolesController } from '../presentation/roles.controller';

describe('RolesController', () => {
  const roleId = '12dbf956-bca7-43c4-9770-b54f243af864';
  const actorId = '0f0a3ad7-5981-4ac1-9850-a832e20015aa';
  const correlationId = '9dabb008-4a84-4c35-868a-794ecc691fd9';

  let controller: RolesController;

  const rolesServiceMock = {
    search: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    impact: jest.fn(),
    delete: jest.fn(),
  };

  const allowGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: rolesServiceMock,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(allowGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('delegates role creation with actor and correlation ID', async () => {
    const body = {
      name: 'Administrador regional',
      description: 'Administra roles de una región.',
      permissionCodes: ['ROLE_VIEW', 'ROLE_UPDATE'],
    };

    const request = {
      user: {
        id: actorId,
      },
      correlationId,
    };

    const expected = {
      id: roleId,
      code: 'ROLE_001',
      name: body.name,
      description: body.description,
      status: 'ACTIVE',
      protected: false,
      version: 0,
      permissions: body.permissionCodes,
    };

    rolesServiceMock.create.mockResolvedValue(expected);

    await expect(controller.create(body, request as never)).resolves.toEqual(expected);

    expect(rolesServiceMock.create).toHaveBeenCalledTimes(1);
    expect(rolesServiceMock.create).toHaveBeenCalledWith(body, actorId, correlationId);

    expect(rolesServiceMock.update).not.toHaveBeenCalled();
    expect(rolesServiceMock.delete).not.toHaveBeenCalled();
  });

  it('delegates role update with actor and correlation ID', async () => {
    const body = {
      name: 'Administrador regional actualizado',
      description: 'Administra roles regionales actualizados.',
      permissionCodes: ['ROLE_VIEW', 'ROLE_UPDATE'],
      version: 3,
    };

    const request = {
      user: {
        id: actorId,
      },
      correlationId,
    };

    const expected = {
      id: roleId,
      code: 'ROLE_001',
      name: body.name,
      description: body.description,
      status: 'ACTIVE',
      protected: false,
      version: 4,
      permissions: body.permissionCodes,
    };

    rolesServiceMock.update.mockResolvedValue(expected);

    await expect(controller.update(roleId, body, request as never)).resolves.toEqual(expected);

    expect(rolesServiceMock.update).toHaveBeenCalledTimes(1);
    expect(rolesServiceMock.update).toHaveBeenCalledWith(roleId, body, actorId, correlationId);

    expect(rolesServiceMock.create).not.toHaveBeenCalled();
    expect(rolesServiceMock.delete).not.toHaveBeenCalled();
  });

  it('normalizes an absent update correlation ID to null', async () => {
    const body = {
      name: 'Administrador regional actualizado',
      description: 'Administra roles regionales actualizados.',
      permissionCodes: ['ROLE_VIEW'],
      version: 3,
    };

    const request = {
      user: {
        id: actorId,
      },
      correlationId: undefined,
    };

    const expected = {
      id: roleId,
      version: 4,
    };

    rolesServiceMock.update.mockResolvedValue(expected);

    await expect(controller.update(roleId, body, request as never)).resolves.toEqual(expected);

    expect(rolesServiceMock.update).toHaveBeenCalledTimes(1);
    expect(rolesServiceMock.update).toHaveBeenCalledWith(roleId, body, actorId, null);
  });

  it('delegates role deletion with actor and correlation ID', async () => {
    const body = {
      reason: 'Rol sustituido por una nueva definición.',
      version: 3,
    };

    const request = {
      user: {
        id: actorId,
      },
      correlationId,
    };

    rolesServiceMock.delete.mockResolvedValue(undefined);

    await expect(controller.delete(roleId, body, request as never)).resolves.toBeUndefined();

    expect(rolesServiceMock.delete).toHaveBeenCalledTimes(1);
    expect(rolesServiceMock.delete).toHaveBeenCalledWith(roleId, body, actorId, correlationId);

    expect(rolesServiceMock.create).not.toHaveBeenCalled();
    expect(rolesServiceMock.update).not.toHaveBeenCalled();
  });

  it('normalizes an absent delete correlation ID to null', async () => {
    const body = {
      reason: 'Rol sustituido por una nueva definición.',
      version: 3,
    };

    const request = {
      user: {
        id: actorId,
      },
      correlationId: undefined,
    };

    rolesServiceMock.delete.mockResolvedValue(undefined);

    await expect(controller.delete(roleId, body, request as never)).resolves.toBeUndefined();

    expect(rolesServiceMock.delete).toHaveBeenCalledTimes(1);
    expect(rolesServiceMock.delete).toHaveBeenCalledWith(roleId, body, actorId, null);
  });
});
