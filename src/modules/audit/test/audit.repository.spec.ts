import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { EntityManager } from 'typeorm';
import { AuditAction, AuditActorType, AuditEventCategory, AuditResult } from '../domain/enums';

import type { AppendAuditEvent } from '../domain/audit.types';
import { AuditEventEntity } from '../infrastructure/audit-event.entity';
import { AuditRepository } from '../infrastructure/audit.repository';
import { ApiKeyGuard, PermissionsGuard } from '../../../shared/security/security';

describe('AuditRepository', () => {
  let repository: AuditRepository;
  let manager: jest.Mocked<Pick<EntityManager, 'save'>>;

  beforeEach(() => {
    repository = new AuditRepository();

    manager = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Pick<EntityManager, 'save'>>;
  });

  it('persists actor, category and correlation metadata', async () => {
    const input: AppendAuditEvent = {
      actorType: AuditActorType.USER,
      userId: '0f0a3ad7-5981-4ac1-9850-a832e20015aa',
      technicalPrincipal: null,
      eventCategory: AuditEventCategory.SECURITY_ADMINISTRATION,
      action: AuditAction.ROLE_CREATED,
      entityType: 'ROLE',
      entityId: '12dbf956-bca7-43c4-9770-b54f243af864',
      roleContext: null,
      scopeContext: null,
      beforeValue: null,
      afterValue: {
        id: '12dbf956-bca7-43c4-9770-b54f243af864',
        code: 'ADMINISTRADOR_REGIONAL',
        name: 'Administrador regional',
        description: 'Administra roles de una región.',
        status: 'ACTIVE',
        protected: false,
        version: 0,
        permissionCodes: ['ROLE_UPDATE', 'ROLE_VIEW'],
      },
      result: AuditResult.SUCCESS,
      correlationId: '9dabb008-4a84-4c35-868a-794ecc691fd9',
    };

    manager.save.mockResolvedValue({} as never);

    await repository.append(manager as unknown as EntityManager, input);

    expect(manager.save).toHaveBeenCalledTimes(1);

    const savedEvent = manager.save.mock.calls[0][0];

    expect(savedEvent).toBeInstanceOf(AuditEventEntity);
    expect(savedEvent).toEqual(
      expect.objectContaining({
        actorType: AuditActorType.USER,
        userId: input.userId,
        technicalPrincipal: null,
        eventCategory: AuditEventCategory.SECURITY_ADMINISTRATION,
        action: AuditAction.ROLE_CREATED,
        entityType: 'ROLE',
        entityId: input.entityId,
        roleContext: null,
        scopeContext: null,
        beforeValue: null,
        afterValue: input.afterValue,
        result: AuditResult.SUCCESS,
        correlationId: input.correlationId,
      })
    );
  });

  it('propagates persistence errors', async () => {
    const input: AppendAuditEvent = {
      actorType: AuditActorType.USER,
      userId: null,
      technicalPrincipal: 'zdeptos-dev-api-key',
      eventCategory: AuditEventCategory.SECURITY_ADMINISTRATION,
      action: AuditAction.ROLE_CREATED,
      entityType: 'ROLE',
      entityId: null,
      roleContext: null,
      scopeContext: null,
      beforeValue: null,
      afterValue: null,
      result: AuditResult.FAILURE,
      correlationId: 'audit-failure-test',
    };

    const persistenceError = new Error('Audit persistence failed');
    manager.save.mockRejectedValue(persistenceError);

    await expect(repository.append(manager as unknown as EntityManager, input)).rejects.toBe(
      persistenceError
    );
  });
});
