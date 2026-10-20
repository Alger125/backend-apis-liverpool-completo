/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — ROLES, PERMISOS, EXCEPCIONES Y SEGMENTACIÓN OPERATIVA
 * MÓDULO:   Access Management Repository
 * HISTORIAS: HU-58 a HU-61 (HU-013 a HU-018) | CATÁLOGO DOMINIO 9
 * CASOS DE USO: CU-SEG-001, CU-EXC-001
 * ============================================================================
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import {
  AccessScopeQuery,
  BulkCreateExceptionDto,
  CreateAssignmentDto,
  CreateExceptionDto,
  EffectivePageQuery,
  PageQuery,
  RevokeDto,
  UpdateAssignmentDto,
  UpdateExceptionDto,
} from "./dto";


type DatabaseRow = Record<string, unknown>;

@Injectable()
export class AccessManagementRepository {
  constructor(private readonly dataSource: DataSource) {}

  private paginate(
    items: DatabaseRow[],
    totalItems: number,
    page: number,
    pageSize: number,
  ) {
    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  private statusSql(tableAlias: string): string {
    return `CASE WHEN ${tableAlias}.status='REVOKED' THEN 'REVOKED' WHEN ${tableAlias}.valid_from > CURRENT_DATE THEN 'SCHEDULED' WHEN ${tableAlias}.valid_to IS NOT NULL AND ${tableAlias}.valid_to < CURRENT_DATE THEN 'EXPIRED' ELSE 'ACTIVE' END`;
  }

  async users(query: PageQuery) {
    const searchPattern = query.search?.trim() || null;
    const offset = query.page * query.pageSize;

    const [userRows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT u.id, u.entra_object_id AS "entraObjectId", u.tenant_id AS "tenantId", u.display_name AS "displayName", u.email, u.status 
         FROM zd_security.app_user u 
         LEFT JOIN zd_ref.employee_reference e ON e.id=u.employee_id 
         WHERE ($1::text IS NULL OR u.display_name ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%' OR e.employee_number ILIKE '%'||$1||'%' OR e.display_name ILIKE '%'||$1||'%' OR e.assignment_id_external ILIKE '%'||$1||'%') 
         ORDER BY u.display_name 
         LIMIT $2 OFFSET $3`,
        [searchPattern, query.pageSize, offset],
      ),
      this.dataSource.query(
        `SELECT count(*)::int total 
         FROM zd_security.app_user u 
         LEFT JOIN zd_ref.employee_reference e ON e.id=u.employee_id 
         WHERE ($1::text IS NULL OR u.display_name ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%' OR e.employee_number ILIKE '%'||$1||'%' OR e.display_name ILIKE '%'||$1||'%' OR e.assignment_id_external ILIKE '%'||$1||'%')`,
        [searchPattern],
      ),
    ]);

    return this.paginate(
      userRows,
      Number(countRows[0].total),
      query.page,
      query.pageSize,
    );
  }

  async user(userId: string) {
    const userRows = await this.dataSource.query(
      `SELECT u.id, u.entra_object_id AS "entraObjectId", u.tenant_id AS "tenantId", u.display_name AS "displayName", u.email, u.status, u.first_login_at AS "firstLoginAt", u.last_login_at AS "lastLoginAt" 
       FROM zd_security.app_user u 
       WHERE u.id=$1`,
      [userId],
    );

    if (!userRows[0]) {
      throw new NotFoundException("USER_NOT_FOUND");
    }

    return userRows[0];
  }

  async scopes(query: AccessScopeQuery) {
    const searchPattern = query.search?.trim() || null;
    const offset = query.page * query.pageSize;
    const queryValues = [
      searchPattern,
      query.scopeType || null,
      query.structureVariantId || null,
      query.pageSize,
      offset,
    ];

    const whereClause = `WHERE a.status='ACTIVE' AND ($1::text IS NULL OR a.display_name ILIKE '%'||$1||'%' OR a.path ILIKE '%'||$1||'%') AND ($2::text IS NULL OR a.scope_type=$2) AND ($3::uuid IS NULL OR a.structure_variant_id=$3)`;

    const [scopeRows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT a.id, a.scope_type AS "scopeType", a.structure_node_id AS "structureNodeId", a.structure_variant_id AS "structureVariantId", a.display_name AS "displayName", a.path, a.status 
         FROM zd_security.access_scope a ${whereClause} 
         ORDER BY a.display_name 
         LIMIT $4 OFFSET $5`,
        queryValues,
      ),
      this.dataSource.query(
        `SELECT count(*)::int total FROM zd_security.access_scope a ${whereClause}`,
        queryValues.slice(0, 3),
      ),
    ]);

    return this.paginate(
      scopeRows,
      Number(countRows[0].total),
      query.page,
      query.pageSize,
    );
  }

  private async exists(
    entityManager: EntityManager,
    tableName: string,
    entityId: string,
    errorCode: string,
  ): Promise<void> {
    const entityRows = await entityManager.query(
      `SELECT id, status FROM ${tableName} WHERE id=$1`,
      [entityId],
    );

    if (!entityRows[0]) {
      throw new NotFoundException(errorCode);
    }

    if (entityRows[0].status !== "ACTIVE") {
      throw new UnprocessableEntityException(`${errorCode}_INACTIVE`);
    }
  }

  private validateDates(validFrom: string, validTo?: string | null): void {
    if (validTo && validTo < validFrom) {
      throw new UnprocessableEntityException("VALID_TO_BEFORE_VALID_FROM");
    }
  }

  private async validateScopes(
    entityManager: EntityManager,
    requestedScopes: { accessScopeId: string }[],
  ): Promise<void> {
    const scopeIds = [
      ...new Set(requestedScopes.map((scopeItem) => scopeItem.accessScopeId)),
    ];

    if (scopeIds.length !== requestedScopes.length) {
      throw new UnprocessableEntityException("DUPLICATE_SCOPE");
    }

    const activeScopes = await entityManager.query(
      `SELECT id FROM zd_security.access_scope WHERE id=ANY($1::uuid[]) AND status='ACTIVE'`,
      [scopeIds],
    );

    if (activeScopes.length !== scopeIds.length) {
      throw new UnprocessableEntityException("INVALID_ACCESS_SCOPE");
    }
  }

  async list(
    managementKind: "assignment" | "exception",
    query: EffectivePageQuery,
    userId?: string,
  ) {
    const tableName =
      managementKind === "assignment"
        ? "user_role_assignment"
        : "user_role_exception";
    const effectiveDate = query.effectiveOn || null;
    const searchPattern = query.search?.trim() || null;
    const offset = query.page * query.pageSize;

    const whereClause = `WHERE ($1::uuid IS NULL OR x.user_id=$1) AND ($2::date IS NULL OR x.valid_from <= $2 AND (x.valid_to IS NULL OR x.valid_to >= $2)) AND ($3::text IS NULL OR u.display_name ILIKE '%'||$3||'%' OR u.email ILIKE '%'||$3||'%' OR r.code ILIKE '%'||$3||'%' OR r.name ILIKE '%'||$3||'%')`;
    const baseQuerySql = `FROM zd_security.${tableName} x JOIN zd_security.app_user u ON u.id=x.user_id JOIN zd_security.role r ON r.id=x.role_id ${whereClause}`;

    const items = await this.dataSource.query(
      `SELECT x.id, x.user_id AS "userId", x.role_id AS "roleId", u.display_name AS "userDisplayName", r.code AS "roleCode", r.name AS "roleName", ${this.statusSql("x")} status, x.valid_from AS "validFrom", x.valid_to AS "validTo", x.version, x.created_at AS "createdAt", x.updated_at AS "updatedAt" 
       ${baseQuerySql} 
       ORDER BY x.updated_at DESC 
       LIMIT $4 OFFSET $5`,
      [userId || null, effectiveDate, searchPattern, query.pageSize, offset],
    );

    const countResult = await this.dataSource.query(
      `SELECT count(*)::int total ${baseQuerySql}`,
      [userId || null, effectiveDate, searchPattern],
    );

    return this.paginate(
      items,
      Number(countResult[0].total),
      query.page,
      query.pageSize,
    );
  }

  async detail(
    managementKind: "assignment" | "exception",
    recordId: string,
    entityManager: EntityManager = this.dataSource.manager,
  ) {
    const tableName =
      managementKind === "assignment"
        ? "user_role_assignment"
        : "user_role_exception";
    const bridgeTableName =
      managementKind === "assignment" ? "assignment_scope" : "exception_scope";
    const foreignKeyColumn =
      managementKind === "assignment"
        ? "user_role_assignment_id"
        : "user_role_exception_id";

    const recordRows = await entityManager.query(
      `SELECT x.*, ${this.statusSql("x")} AS computed_status 
       FROM zd_security.${tableName} x 
       WHERE x.id=$1`,
      [recordId],
    );

    if (!recordRows[0]) {
      throw new NotFoundException(
        managementKind === "assignment"
          ? "ROLE_ASSIGNMENT_NOT_FOUND"
          : "ROLE_EXCEPTION_NOT_FOUND",
      );
    }

    const assignedScopes = await entityManager.query(
      `SELECT s.access_scope_id AS "accessScopeId", s.include_descendants AS "includeDescendants", a.scope_type AS "scopeType", a.display_name AS "displayName", a.path 
       FROM zd_security.${bridgeTableName} s 
       JOIN zd_security.access_scope a ON a.id=s.access_scope_id 
       WHERE s.${foreignKeyColumn}=$1 
       ORDER BY a.display_name`,
      [recordId],
    );

    return {
      ...recordRows[0],
      status: recordRows[0].computed_status,
      scopes: assignedScopes,
    };
  }

  private async idempotent(
    entityManager: EntityManager,
    idempotencyKey: string | undefined,
    operationName: string,
    operationPayload: unknown,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    const payloadHash = JSON.stringify(operationPayload);
    const existingRecords = await entityManager.query(
      `SELECT resource_id, payload 
       FROM zd_security.api_idempotency 
       WHERE idempotency_key=$1 AND operation=$2 
       FOR UPDATE`,
      [idempotencyKey, operationName],
    );

    if (existingRecords[0]) {
      if (existingRecords[0].payload !== payloadHash) {
        throw new ConflictException("IDEMPOTENCY_KEY_REUSED");
      }
      return existingRecords[0].resource_id as string;
    }

    return { key: idempotencyKey, hash: payloadHash };
  }

  async createAssignment(
    dto: CreateAssignmentDto,
    idempotencyKey?: string,
    actorUserId?: string,
  ) {
    this.validateDates(dto.validFrom, dto.validTo);

    return this.dataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
        const idempotencyResult = await this.idempotent(
          transactionalEntityManager,
          idempotencyKey,
          "CREATE_ASSIGNMENT",
          dto,
        );

        if (typeof idempotencyResult === "string") {
          return this.detail(
            "assignment",
            idempotencyResult,
            transactionalEntityManager,
          );
        }

        await this.exists(
          transactionalEntityManager,
          "zd_security.app_user",
          dto.userId,
          "USER_NOT_FOUND",
        );
        await this.exists(
          transactionalEntityManager,
          "zd_security.role",
          dto.roleId,
          "ROLE_NOT_FOUND",
        );
        await this.validateScopes(transactionalEntityManager, dto.scopes);

        const overlappingRecords = await transactionalEntityManager.query(
          `SELECT 1 FROM zd_security.user_role_assignment 
           WHERE user_id=$1 AND role_id=$2 AND status<>'REVOKED' 
             AND daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') && daterange($3::date, COALESCE($4::date, 'infinity'::date), '[]')`,
          [dto.userId, dto.roleId, dto.validFrom, dto.validTo],
        );

        if (overlappingRecords[0]) {
          throw new ConflictException("ROLE_ASSIGNMENT_OVERLAP");
        }

        const insertResult = await transactionalEntityManager.query(
          `INSERT INTO zd_security.user_role_assignment(user_id, role_id, origin, valid_from, valid_to, status, notes, version, created_by, updated_by) 
           VALUES($1, $2, $3, $4, $5, CASE WHEN $4::date>CURRENT_DATE THEN 'SCHEDULED' ELSE 'ACTIVE' END, $6, 0, $7, $7) 
           RETURNING id`,
          [
            dto.userId,
            dto.roleId,
            dto.origin,
            dto.validFrom,
            dto.validTo,
            dto.notes || null,
            actorUserId || null,
          ],
        );

        for (const scopeItem of dto.scopes) {
          await transactionalEntityManager.query(
            `INSERT INTO zd_security.assignment_scope(user_role_assignment_id, access_scope_id, include_descendants) 
             VALUES($1, $2, $3)`,
            [
              insertResult[0].id,
              scopeItem.accessScopeId,
              scopeItem.includeDescendants,
            ],
          );
        }

        if (idempotencyResult && "key" in idempotencyResult) {
          await transactionalEntityManager.query(
            `INSERT INTO zd_security.api_idempotency(idempotency_key, operation, payload, resource_id) 
             VALUES($1, $2, $3, $4)`,
            [
              idempotencyResult.key,
              "CREATE_ASSIGNMENT",
              idempotencyResult.hash,
              insertResult[0].id,
            ],
          );
        }

        return this.detail(
          "assignment",
          insertResult[0].id,
          transactionalEntityManager,
        );
      },
    );
  }

  async updateAssignment(
    assignmentId: string,
    dto: UpdateAssignmentDto,
    actorUserId?: string,
  ) {
    this.validateDates(dto.validFrom, dto.validTo);

    return this.dataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
        await this.validateScopes(transactionalEntityManager, dto.scopes);

        const updateResult = await transactionalEntityManager.query(
          `UPDATE zd_security.user_role_assignment 
           SET valid_from=$1, valid_to=$2, notes=$3, version=version+1, updated_at=now(), updated_by=$4, 
               status=CASE WHEN $1::date>CURRENT_DATE THEN 'SCHEDULED' ELSE 'ACTIVE' END 
           WHERE id=$5 AND version=$6 AND status<>'REVOKED' 
           RETURNING id`,
          [
            dto.validFrom,
            dto.validTo,
            dto.notes || null,
            actorUserId || null,
            assignmentId,
            dto.version,
          ],
        );

        if (!updateResult[0]) {
          await this.detail(
            "assignment",
            assignmentId,
            transactionalEntityManager,
          );
          throw new ConflictException("ROLE_ASSIGNMENT_VERSION_CONFLICT");
        }

        await transactionalEntityManager.query(
          `DELETE FROM zd_security.assignment_scope WHERE user_role_assignment_id=$1`,
          [assignmentId],
        );

        for (const scopeItem of dto.scopes) {
          await transactionalEntityManager.query(
            `INSERT INTO zd_security.assignment_scope(user_role_assignment_id, access_scope_id, include_descendants) 
             VALUES($1, $2, $3)`,
            [
              assignmentId,
              scopeItem.accessScopeId,
              scopeItem.includeDescendants,
            ],
          );
        }

        return this.detail(
          "assignment",
          assignmentId,
          transactionalEntityManager,
        );
      },
    );
  }

  async createException(
    dto: CreateExceptionDto,
    idempotencyKey?: string,
    actorUserId?: string,
  ) {
    this.validateDates(dto.validFrom, dto.validTo);

    return this.dataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
        const idempotencyResult = await this.idempotent(
          transactionalEntityManager,
          idempotencyKey,
          "CREATE_EXCEPTION",
          dto,
        );

        if (typeof idempotencyResult === "string") {
          return this.detail(
            "exception",
            idempotencyResult,
            transactionalEntityManager,
          );
        }

        await this.exists(
          transactionalEntityManager,
          "zd_security.app_user",
          dto.userId,
          "USER_NOT_FOUND",
        );
        await this.exists(
          transactionalEntityManager,
          "zd_security.role",
          dto.roleId,
          "ROLE_NOT_FOUND",
        );
        await this.validateScopes(transactionalEntityManager, dto.scopes);

        const insertResult = await transactionalEntityManager.query(
          `INSERT INTO zd_security.user_role_exception(user_id, role_id, valid_from, valid_to, justification, ticket_reference, status, version, created_by, updated_by) 
           VALUES($1, $2, $3, $4, $5, $6, CASE WHEN $3::date>CURRENT_DATE THEN 'SCHEDULED' ELSE 'ACTIVE' END, 0, $7, $7) 
           RETURNING id`,
          [
            dto.userId,
            dto.roleId,
            dto.validFrom,
            dto.validTo,
            dto.justification,
            dto.ticketReference || null,
            actorUserId || null,
          ],
        );

        for (const scopeItem of dto.scopes) {
          await transactionalEntityManager.query(
            `INSERT INTO zd_security.exception_scope(user_role_exception_id, access_scope_id, include_descendants) 
             VALUES($1, $2, $3)`,
            [
              insertResult[0].id,
              scopeItem.accessScopeId,
              scopeItem.includeDescendants,
            ],
          );
        }

        if (idempotencyResult && "key" in idempotencyResult) {
          await transactionalEntityManager.query(
            `INSERT INTO zd_security.api_idempotency(idempotency_key, operation, payload, resource_id) 
             VALUES($1, $2, $3, $4)`,
            [
              idempotencyResult.key,
              "CREATE_EXCEPTION",
              idempotencyResult.hash,
              insertResult[0].id,
            ],
          );
        }

        return this.detail(
          "exception",
          insertResult[0].id,
          transactionalEntityManager,
        );
      },
    );
  }

  async updateException(
    exceptionId: string,
    dto: UpdateExceptionDto,
    actorUserId?: string,
  ) {
    this.validateDates(dto.validFrom, dto.validTo);

    return this.dataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
        await this.validateScopes(transactionalEntityManager, dto.scopes);

        const updateResult = await transactionalEntityManager.query(
          `UPDATE zd_security.user_role_exception 
           SET user_id=$1, role_id=$2, valid_from=$3, valid_to=$4, justification=$5, ticket_reference=$6, version=version+1, updated_at=now(), updated_by=$7, 
               status=CASE WHEN $3::date>CURRENT_DATE THEN 'SCHEDULED' ELSE 'ACTIVE' END 
           WHERE id=$8 AND version=$9 AND status<>'REVOKED' 
           RETURNING id`,
          [
            dto.userId,
            dto.roleId,
            dto.validFrom,
            dto.validTo,
            dto.justification,
            dto.ticketReference || null,
            actorUserId || null,
            exceptionId,
            dto.version,
          ],
        );

        if (!updateResult[0]) {
          await this.detail(
            "exception",
            exceptionId,
            transactionalEntityManager,
          );
          throw new ConflictException("ROLE_EXCEPTION_VERSION_CONFLICT");
        }

        await transactionalEntityManager.query(
          `DELETE FROM zd_security.exception_scope WHERE user_role_exception_id=$1`,
          [exceptionId],
        );

        for (const scopeItem of dto.scopes) {
          await transactionalEntityManager.query(
            `INSERT INTO zd_security.exception_scope(user_role_exception_id, access_scope_id, include_descendants) 
             VALUES($1, $2, $3)`,
            [
              exceptionId,
              scopeItem.accessScopeId,
              scopeItem.includeDescendants,
            ],
          );
        }

        return this.detail(
          "exception",
          exceptionId,
          transactionalEntityManager,
        );
      },
    );
  }

  async revoke(
    managementKind: "assignment" | "exception",
    recordId: string,
    dto: RevokeDto,
    actorUserId?: string,
  ) {
    const tableName =
      managementKind === "assignment"
        ? "user_role_assignment"
        : "user_role_exception";

    const updateResult = await this.dataSource.query(
      `UPDATE zd_security.${tableName} 
       SET status='REVOKED', revoked_at=now(), revoked_by=$1, revocation_reason=$2, version=version+1, updated_at=now(), updated_by=$1 
       WHERE id=$3 AND version=$4 AND status<>'REVOKED' 
       RETURNING id`,
      [actorUserId || null, dto.reason, recordId, dto.version],
    );

    if (!updateResult[0]) {
      await this.detail(managementKind, recordId);
      throw new ConflictException(
        managementKind === "assignment"
          ? "ROLE_ASSIGNMENT_VERSION_CONFLICT"
          : "ROLE_EXCEPTION_VERSION_CONFLICT",
      );
    }

    return this.detail(managementKind, recordId);
  }

  async impact(
    managementKind: "assignment" | "exception",
    dto: CreateAssignmentDto | CreateExceptionDto,
  ) {
    return this.dataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
        await this.exists(
          transactionalEntityManager,
          "zd_security.app_user",
          dto.userId,
          "USER_NOT_FOUND",
        );
        await this.exists(
          transactionalEntityManager,
          "zd_security.role",
          dto.roleId,
          "ROLE_NOT_FOUND",
        );
        await this.validateScopes(transactionalEntityManager, dto.scopes);

        const addedPermissions = await transactionalEntityManager.query(
          `SELECT p.code 
           FROM zd_security.role_permission rp 
           JOIN zd_security.permission p ON p.id=rp.permission_id 
           WHERE rp.role_id=$1 AND p.status='ACTIVE' 
           ORDER BY p.code`,
          [dto.roleId],
        );

        const duplicatePermissions = await transactionalEntityManager.query(
          `SELECT DISTINCT p.code 
           FROM zd_security.user_role_assignment x 
           JOIN zd_security.role_permission rp ON rp.role_id=x.role_id 
           JOIN zd_security.permission p ON p.id=rp.permission_id 
           WHERE x.user_id=$1 AND x.status<>'REVOKED' AND x.valid_from<=CURRENT_DATE 
             AND (x.valid_to IS NULL OR x.valid_to>=CURRENT_DATE) 
             AND p.code=ANY($2::text[])`,
          [
            dto.userId,
            addedPermissions.map(
              (permissionRow: DatabaseRow) => permissionRow.code,
            ),
          ],
        );

        return {
          user: await this.user(dto.userId),
          roleId: dto.roleId,
          requestedScopes: dto.scopes,
          addedPermissionCodes: addedPermissions.map(
            (permissionRow: DatabaseRow) => permissionRow.code,
          ),
          duplicatePermissionCodes: duplicatePermissions.map(
            (permissionRow: DatabaseRow) => permissionRow.code,
          ),
          conflicts: [],
          warnings:
            managementKind === "exception"
              ? ["TEMPORARY_ADDITIVE_ACCESS"]
              : [],
        };
      },
    );
  }

  /**
   * ==========================================================================
   * HU-017 (CU-SEC-006 FA-05 / PROP-03):
   * Asignar el mismo rol excepcional a varios colaboradores en lote,
   * validando cada registro y reportando éxitos y fallos individuales.
   * ==========================================================================
   */
  async bulkCreateExceptions(
    dto: BulkCreateExceptionDto,
    idempotencyKey?: string,
    actorUserId?: string,
  ) {
    this.validateDates(dto.validFrom, dto.validTo);

    const createdExceptions: unknown[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of dto.userIds) {
      const perUserKey = idempotencyKey ? `${idempotencyKey}:${userId}` : undefined;
      try {
        const created = await this.createException(
          {
            userId,
            roleId: dto.roleId,
            scopes: dto.scopes,
            validFrom: dto.validFrom,
            validTo: dto.validTo,
            justification: dto.justification,
            ticketReference: dto.ticketReference,
          },
          perUserKey,
          actorUserId,
        );
        createdExceptions.push(created);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "UNKNOWN_EXCEPTION_ERROR";
        errors.push({ userId, error: message });
      }
    }

    return {
      roleId: dto.roleId,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      totalRequested: dto.userIds.length,
      succeededCount: createdExceptions.length,
      failedCount: errors.length,
      createdExceptions,
      errors,
    };
  }

  /**
   * ==========================================================================
   * HU-61 (HU-018 / P-10, P-12 / DEC-12 / ZDP_ROL_0005):
   * Fusión Aditiva y Acumulativa de Múltiples Roles y Excepciones (Sin DENY).
   * Los permisos positivos de roles vigentes y excepciones vigentes se suman.
   * ==========================================================================
   */
  async effectivePermissions(userId: string, effectiveOn?: string) {
    const userRecord = await this.user(userId);
    const dateParam = effectiveOn || null;

    const [activeRoles, activeExceptions, unionPermissions, unionScopes] =
      await Promise.all([
        this.dataSource.query(
          `SELECT DISTINCT r.id, r.code, r.name
           FROM zd_security.user_role_assignment ura
           JOIN zd_security.role r ON r.id = ura.role_id AND r.status = 'ACTIVE'
           WHERE ura.user_id = $1
             AND ura.status <> 'REVOKED'
             AND ura.valid_from <= COALESCE($2::date, CURRENT_DATE)
             AND (ura.valid_to IS NULL OR ura.valid_to >= COALESCE($2::date, CURRENT_DATE))
           ORDER BY r.code`,
          [userId, dateParam],
        ),
        this.dataSource.query(
          `SELECT DISTINCT ure.id AS "exceptionId", r.id AS "roleId", r.code, r.name,
                  ure.valid_from AS "validFrom", ure.valid_to AS "validTo"
           FROM zd_security.user_role_exception ure
           JOIN zd_security.role r ON r.id = ure.role_id AND r.status = 'ACTIVE'
           WHERE ure.user_id = $1
             AND ure.status <> 'REVOKED'
             AND ure.valid_from <= COALESCE($2::date, CURRENT_DATE)
             AND (ure.valid_to IS NULL OR ure.valid_to >= COALESCE($2::date, CURRENT_DATE))
           ORDER BY r.code`,
          [userId, dateParam],
        ),
        this.dataSource.query(
          `SELECT DISTINCT p.code, p.name, p.module
           FROM (
             SELECT role_id FROM zd_security.user_role_assignment
             WHERE user_id = $1 AND status <> 'REVOKED'
               AND valid_from <= COALESCE($2::date, CURRENT_DATE)
               AND (valid_to IS NULL OR valid_to >= COALESCE($2::date, CURRENT_DATE))
             UNION
             SELECT role_id FROM zd_security.user_role_exception
             WHERE user_id = $1 AND status <> 'REVOKED'
               AND valid_from <= COALESCE($2::date, CURRENT_DATE)
               AND (valid_to IS NULL OR valid_to >= COALESCE($2::date, CURRENT_DATE))
           ) active_sources
           JOIN zd_security.role r ON r.id = active_sources.role_id AND r.status = 'ACTIVE'
           JOIN zd_security.role_permission rp ON rp.role_id = r.id
           JOIN zd_security.permission p ON p.id = rp.permission_id AND p.status = 'ACTIVE'
           ORDER BY p.code`,
          [userId, dateParam],
        ),
        this.dataSource.query(
          `SELECT DISTINCT a.id AS "accessScopeId", a.scope_type AS "scopeType",
                  a.structure_node_id AS "structureNodeId", a.display_name AS "displayName",
                  a.path, src.source_type AS "sourceType"
           FROM (
             SELECT asg.access_scope_id, 'ASSIGNMENT' AS source_type
             FROM zd_security.user_role_assignment ura
             JOIN zd_security.assignment_scope asg ON asg.user_role_assignment_id = ura.id
             WHERE ura.user_id = $1 AND ura.status <> 'REVOKED'
               AND ura.valid_from <= COALESCE($2::date, CURRENT_DATE)
               AND (ura.valid_to IS NULL OR ura.valid_to >= COALESCE($2::date, CURRENT_DATE))
             UNION
             SELECT es.access_scope_id, 'EXCEPTION' AS source_type
             FROM zd_security.user_role_exception ure
             JOIN zd_security.exception_scope es ON es.user_role_exception_id = ure.id
             WHERE ure.user_id = $1 AND ure.status <> 'REVOKED'
               AND ure.valid_from <= COALESCE($2::date, CURRENT_DATE)
               AND (ure.valid_to IS NULL OR ure.valid_to >= COALESCE($2::date, CURRENT_DATE))
           ) src
           JOIN zd_security.access_scope a ON a.id = src.access_scope_id AND a.status = 'ACTIVE'
           ORDER BY a.display_name`,
          [userId, dateParam],
        ),
      ]);

    return {
      user: userRecord,
      effectiveOn: effectiveOn ?? new Date().toISOString().slice(0, 10),
      resolutionModel: "ADDITIVE_UNION_NO_DENY",
      explicitDenySupported: false,
      activeRoles,
      activeExceptions,
      effectivePermissionCodes: unionPermissions.map(
        (row: DatabaseRow) => row.code,
      ),
      effectivePermissions: unionPermissions,
      effectiveScopes: unionScopes,
    };
  }
}

