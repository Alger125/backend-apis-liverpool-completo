import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CatalogStatus, PermissionEntity } from '../../permissions/domain/permission.entity';
import { RoleEntity, RoleStatus } from '../domain/role.entity';
import {
  CreateRoleRequest,
  DeleteRoleRequest,
  SearchRolesQuery,
  UpdateRoleRequest,
} from '../presentation/dto/roles.dto';

import {
  AuditAction,
  AuditActorType,
  AuditEventCategory,
  AuditResult,
} from '../../audit/domain/enums';

import type { AuditSnapshot } from '../../audit/domain/audit.types';
import { AuditRepository } from '../../audit/infrastructure/audit.repository';

import {
  RoleDeletedError,
  RoleNotFoundError,
  RoleProtectedError,
  RoleVersionConflictError,
  PermissionNotFoundError,
  PermissionNotAssignableError,
} from '../domain/role.errors';

const code = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
@Injectable()
export class RolesService {
  constructor(
    private db: DataSource,
    private readonly auditRepository: AuditRepository
  ) {}
  private repo() {
    return this.db.getRepository(RoleEntity);
  }
  private async generateCode(manager: EntityManager, name: string) {
    const base = code(name);
    const repository = manager.getRepository(RoleEntity);
    let candidate = base;
    for (let i = 2; await repository.exists({ where: { code: candidate } }); i++) {
      candidate = `${base}_${i}`;
    }
    return candidate;
  }
  private out(role: RoleEntity) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      status: role.status,
      protected: role.protected,
      permissionCount: role.permissions.filter((permission) => permission.status === CatalogStatus.ACTIVE).length,
      version: role.version,
      updatedAt: role.updatedAt.toISOString(),
      permissions: role.permissions,
    };
  }
  async search(query: SearchRolesQuery) {
    const [sortField, sortDirection] = query.sort.split(',');
    const queryBuilder = this.repo()
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.permissions', 'p')
      .skip(query.page * query.pageSize)
      .take(query.pageSize)
      .orderBy('r.' + sortField, sortDirection.toUpperCase() as 'ASC' | 'DESC');
    if (query.status) {
      queryBuilder.andWhere('r.status = :status', {
        status: query.status,
      });
    }
    if (query.search) {
      queryBuilder.andWhere('(r.code ILIKE :search OR r.name ILIKE :search OR r.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    const [roleEntities, totalCount] = await queryBuilder.getManyAndCount();
    return {
      items: roleEntities.map((roleEntity) => {
        const { permissions, ...roleSummary } = this.out(roleEntity);
        return roleSummary;
      }),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    };
  }
  async get(id: string) {
    const role = await this.repo().findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return this.out(role);
  }
  private async perms(
    codes: string[],
    manager: EntityManager = this.db.manager
  ): Promise<PermissionEntity[]> {
    const uniqueCodes = [...new Set(codes)];

    const permissions = await manager.getRepository(PermissionEntity).findBy({
      code: In(uniqueCodes),
      status: CatalogStatus.ACTIVE,
      assignable: true,
    });

    const foundCodes = new Set(permissions.map((permission) => permission.code));

    const invalidCodes = uniqueCodes.filter((permissionCode) => !foundCodes.has(permissionCode));

    if (invalidCodes.length > 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_PERMISSION_CODES',

        detail: 'Uno o más permisos no existen, están inactivos o no son asignables.',

        invalidPermissionCodes: invalidCodes,
      });
    }

    return permissions;
  }

  async create(dto: CreateRoleRequest, userId: string, correlationId?: string) {
    try {
      return await this.db.transaction(async (manager) => {
        const roleRepository = manager.getRepository(RoleEntity);

        const permissions = await this.perms(dto.permissionCodes, manager);

        const role = roleRepository.create({
          code: await this.generateCode(manager, dto.name),
          name: dto.name.trim(),
          description: dto.description.trim(),
          status: RoleStatus.ACTIVE,
          protected: false,
          version: 0,
          permissions,
          createdBy: userId,
          updatedBy: userId,
        });

        const created = await roleRepository.save(role);

        const persisted = await roleRepository.findOne({
          where: {
            id: created.id,
          },
          relations: {
            permissions: true,
          },
        });

        if (!persisted) {
          throw new InternalServerErrorException('No fue posible recuperar el rol creado.');
        }

        await this.auditRepository.append(manager, {
          actorType: AuditActorType.USER,
          userId: userId,
          technicalPrincipal: null,
          eventCategory: AuditEventCategory.SECURITY_ADMINISTRATION,
          action: AuditAction.ROLE_CREATED,
          entityType: 'ROLE',
          entityId: persisted.id,
          roleContext: null,
          scopeContext: null,
          beforeValue: null,
          afterValue: this.toAuditSnapshot(persisted),
          result: AuditResult.SUCCESS,
          correlationId: correlationId ?? null,
        });

        return this.out(persisted);
      });
    } catch (error: unknown) {
      this.translateWriteError(error);
    }
  }
  async update(id: string, dto: UpdateRoleRequest, actorId: string, correlationId: string | null) {
    try {
      return await this.db.transaction(async (manager) => {
        const roleRepository = manager.getRepository(RoleEntity);
        const permissions = await this.perms(dto.permissionCodes, manager);

        const beforeRole = await roleRepository.findOne({
          where: { id },
          relations: { permissions: true },
        });

        if (!beforeRole) {
          throw new RoleNotFoundError();
        }

        if (beforeRole.status === RoleStatus.DELETED) {
          throw new RoleDeletedError(beforeRole.version);
        }

        const before = this.toAuditSnapshot(beforeRole);

        const updateResult = await roleRepository
          .createQueryBuilder()
          .update(RoleEntity)
          .set({
            name: dto.name.trim(),
            description: dto.description.trim(),
            updatedBy: actorId,
            updatedAt: () => 'CURRENT_TIMESTAMP',
            version: () => '"version" + 1',
          })
          .where('id = :id', { id })
          .andWhere('version = :version', { version: dto.version })
          .andWhere('status <> :deleted', {
            deleted: RoleStatus.DELETED,
          })
          .execute();

        if (updateResult.affected !== 1) {
          await this.throwWriteConflict(manager, id);
        }

        await manager
          .createQueryBuilder()
          .delete()
          .from('zd_security.role_permission')
          .where('role_id = :roleId', { roleId: id })
          .execute();

        await manager
          .createQueryBuilder()
          .insert()
          .into('zd_security.role_permission')
          .values(
            permissions.map((permission) => ({
              role_id: id,
              permission_id: permission.id,
            }))
          )
          .execute();

        const updatedRole = await roleRepository.findOne({
          where: { id },
          relations: { permissions: true },
        });

        if (!updatedRole) {
          throw new RoleNotFoundError();
        }

        const after = this.toAuditSnapshot(updatedRole);
        const beforeCodes = new Set(before.permissionCodes);
        const afterCodes = new Set(after.permissionCodes);

        const addedPermissionCodes = after.permissionCodes.filter(
          (permissionCode) => !beforeCodes.has(permissionCode)
        );

        const removedPermissionCodes = before.permissionCodes.filter(
          (permissionCode) => !afterCodes.has(permissionCode)
        );

        await this.auditRepository.append(manager, {
          actorType: AuditActorType.USER,
          userId: actorId,
          technicalPrincipal: null,
          eventCategory: AuditEventCategory.SECURITY_ADMINISTRATION,
          action: AuditAction.ROLE_UPDATED,
          entityType: 'ROLE',
          entityId: id,
          roleContext: null,
          scopeContext: null,
          beforeValue: before,
          afterValue: {
            ...after,
            addedPermissionCodes,
            removedPermissionCodes,
          },
          result: AuditResult.SUCCESS,
          correlationId,
        });

        return this.out(updatedRole);
      });
    } catch (error: unknown) {
      this.translateWriteError(error);
    }
  }
  async impact(id: string) {
    const role = await this.getEntity(id);
    const [assignmentsResult, exceptionsResult] = await Promise.all([
      this.db.query(
        "select count(*)::int c from zd_security.user_role_assignment where role_id=$1 and status='ACTIVE'",
        [id],
      ),
      this.db.query(
        "select count(*)::int c from zd_security.user_role_exception where role_id=$1 and status='ACTIVE'",
        [id],
      ),
    ]);
    return {
      roleId: id,
      protected: role.protected,
      activeAssignments: assignmentsResult[0].c,
      activeExceptions: exceptionsResult[0].c,
      canDelete: !role.protected,
      warnings: [],
    };
  }
  async delete(
    id: string,
    dto: DeleteRoleRequest,
    actorId: string,
    correlationId: string | null
  ): Promise<void> {
    try {
      await this.db.transaction(async (manager) => {
        const roleRepository = manager.getRepository(RoleEntity);

        const current = await roleRepository.findOne({
          where: { id },
          relations: { permissions: true },
        });

        if (!current) {
          throw new RoleNotFoundError();
        }

        if (current.status === RoleStatus.DELETED) {
          throw new RoleDeletedError(current.version);
        }

        if (current.protected) {
          throw new RoleProtectedError();
        }

        const before = this.toAuditSnapshot(current);

        const updateResult = await roleRepository
          .createQueryBuilder()
          .update(RoleEntity)
          .set({
            status: RoleStatus.DELETED,
            deletedAt: () => 'CURRENT_TIMESTAMP',
            deletedBy: actorId,
            updatedAt: () => 'CURRENT_TIMESTAMP',
            updatedBy: actorId,
            version: () => '"version" + 1',
          })
          .where('id = :id', { id })
          .andWhere('version = :version', { version: dto.version })
          .andWhere('protected = false')
          .andWhere('status <> :deleted', {
            deleted: RoleStatus.DELETED,
          })
          .execute();

        if (updateResult.affected !== 1) {
          await this.throwDeleteConflict(manager, id);
        }

        const assignmentsResult = await manager
          .createQueryBuilder()
          .update('zd_security.user_role_assignment')
          .set({
            status: 'REVOKED',
            revoked_at: () => 'CURRENT_TIMESTAMP',
            revoked_by: actorId,
          })
          .where('role_id = :roleId', { roleId: id })
          .andWhere('status = :status', { status: 'ACTIVE' })
          .execute();

        /*
         * SUPUESTO TÉCNICO PENDIENTE DE VALIDACIÓN:
         * ejecutar únicamente después de confirmar que la tabla tiene
         * status, revoked_at y revoked_by y que REVOKED es válido.
         */
        const exceptionsResult = await manager
          .createQueryBuilder()
          .update('zd_security.user_role_exception')
          .set({
            status: 'REVOKED',
            revoked_at: () => 'CURRENT_TIMESTAMP',
            revoked_by: actorId,
          })
          .where('role_id = :roleId', { roleId: id })
          .andWhere('status = :status', { status: 'ACTIVE' })
          .execute();

        const deletedRole = await roleRepository.findOne({
          where: { id },
          relations: { permissions: true },
        });

        if (!deletedRole) {
          throw new RoleNotFoundError();
        }

        await this.auditRepository.append(manager, {
          actorType: AuditActorType.USER,
          userId: actorId,
          technicalPrincipal: null,
          eventCategory: AuditEventCategory.SECURITY_ADMINISTRATION,
          action: AuditAction.ROLE_DELETED,
          entityType: 'ROLE',
          entityId: id,
          roleContext: null,
          scopeContext: null,
          beforeValue: before,
          afterValue: {
            ...this.toAuditSnapshot(deletedRole),
            reason: dto.reason.trim(),
            revokedAssignments: assignmentsResult.affected ?? 0,
            revokedExceptions: exceptionsResult.affected ?? 0,
          },
          result: AuditResult.SUCCESS,
          correlationId,
        });
      });
    } catch (error: unknown) {
      this.translateWriteError(error);
    }
  }
  private toAuditSnapshot(role: RoleEntity): AuditSnapshot {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      status: role.status,
      protected: role.protected,
      version: role.version,
      permissionCodes: [...(role.permissions ?? [])].map((permission) => permission.code).sort(),
    };
  }

  private translateWriteError(error: unknown): never {
    const errorRecord =
      error && typeof error === 'object'
        ? (error as {
            driverError?: {
              code?: string;
              constraint?: string;
              detail?: string;
              table?: string;
              column?: string;
            };

            code?: string;
            constraint?: string;
            detail?: string;
            table?: string;
            column?: string;
          })
        : undefined;

    const postgresError = errorRecord?.driverError ?? errorRecord;

    switch (postgresError?.code) {
      case '23505':
        switch (postgresError.constraint) {
          case 'role_code_key':
            throw new ConflictException({
              code: 'ROLE_CODE_CONFLICT',

              detail: 'Ya existe un rol con ese código.',
            });

          case 'role_name_key':
            throw new ConflictException({
              code: 'ROLE_NAME_CONFLICT',

              detail: 'Ya existe un rol con ese nombre.',
            });

          case 'role_permission_pkey':
            throw new ConflictException({
              code: 'ROLE_PERMISSION_CONFLICT',

              detail: 'El rol ya contiene uno de los permisos seleccionados.',
            });

          default:
            throw new ConflictException({
              code: 'ROLE_UNIQUE_CONFLICT',

              detail: 'Ya existe un registro con los mismos datos.',
            });
        }

      case '23503':
        switch (postgresError.constraint) {
          case 'fk_role_created_by':

          case 'fk_role_updated_by':

          case 'role_deleted_by_fkey':

          case 'audit_event_user_id_fkey':
            throw new UnprocessableEntityException({
              code: 'ROLE_ACTOR_NOT_FOUND',

              detail: 'El usuario que realiza la operación no existe.',
            });

          case 'role_permission_permission_id_fkey':
            throw new UnprocessableEntityException({
              code: 'ROLE_PERMISSION_NOT_FOUND',

              detail: 'Uno de los permisos seleccionados no existe.',
            });

          case 'role_permission_role_id_fkey':
            throw new UnprocessableEntityException({
              code: 'ROLE_NOT_FOUND',

              detail: 'El rol relacionado no existe.',
            });

          default:
            throw new UnprocessableEntityException({
              code: 'ROLE_RELATION_NOT_FOUND',

              detail: 'Una de las relaciones requeridas no existe.',
            });
        }

      case '23514':
        switch (postgresError.constraint) {
          case 'role_status_check':
            throw new UnprocessableEntityException({
              code: 'INVALID_ROLE_STATUS',

              detail: 'El estado del rol no es válido.',
            });

          case 'audit_event_actor_type_check':
            throw new UnprocessableEntityException({
              code: 'INVALID_AUDIT_ACTOR_TYPE',

              detail: 'El tipo de actor de auditoría no es válido.',
            });

          case 'audit_event_event_category_check':
            throw new UnprocessableEntityException({
              code: 'INVALID_AUDIT_EVENT_CATEGORY',

              detail: 'La categoría del evento de auditoría no es válida.',
            });

          case 'audit_event_result_check':
            throw new UnprocessableEntityException({
              code: 'INVALID_AUDIT_RESULT',

              detail: 'El resultado del evento de auditoría no es válido.',
            });

          default:
            throw new UnprocessableEntityException({
              code: 'ROLE_INTEGRITY_RULE_VIOLATION',

              detail: 'La operación incumple una regla de integridad.',
            });
        }

      case '23502':
        throw new UnprocessableEntityException({
          code: 'ROLE_REQUIRED_VALUE_MISSING',

          detail: postgresError?.column
            ? `Falta el valor obligatorio ${postgresError.column}.`
            : 'Falta un valor obligatorio.',
        });

      case '42501':
        throw new ServiceUnavailableException({
          code: 'DATABASE_PERMISSION_DENIED',

          detail: 'El servicio no tiene permisos suficientes para completar la operación.',
        });

      default:
        throw error;
    }
  }

  private async throwWriteConflict(manager: EntityManager, roleId: string): Promise<never> {
    const current = await manager.getRepository(RoleEntity).findOne({
      where: { id: roleId },
      select: {
        id: true,
        status: true,
        version: true,
        protected: true,
      },
    });

    if (!current) {
      throw new RoleNotFoundError();
    }

    if (current.status === RoleStatus.DELETED) {
      throw new RoleDeletedError(current.version);
    }

    throw new RoleVersionConflictError(current.version);
  }

  private async throwDeleteConflict(manager: EntityManager, roleId: string): Promise<never> {
    const current = await manager.getRepository(RoleEntity).findOne({
      where: { id: roleId },
      select: {
        id: true,
        status: true,
        version: true,
        protected: true,
      },
    });

    if (!current) {
      throw new RoleNotFoundError();
    }

    if (current.status === RoleStatus.DELETED) {
      throw new RoleDeletedError(current.version);
    }

    if (current.protected) {
      throw new RoleProtectedError();
    }

    throw new RoleVersionConflictError(current.version);
  }
  private async getEntity(id: string) {
    const role = await this.repo().findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }
}
