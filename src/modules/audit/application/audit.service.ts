import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuditLogsQueryDto } from "../presentation/dto/audit-logs-query.dto";
import {
  AuditLogDetailDto,
  AuditLogItemDto,
  AuditLogsPaginatedResponseDto,
} from "../presentation/dto/audit-log-response.dto";

interface AuditEventDbRow {
  id: string;
  occurred_at: Date;
  actor_type: string;
  event_category: string;
  user_id: string | null;
  technical_principal: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  role_context: Record<string, unknown> | null;
  scope_context: Record<string, unknown> | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  result: string;
  correlation_id: string | null;
  user_display_name?: string | null;
  user_email?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly dataSource: DataSource) {}

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }
  }

  async findLogs(
    query: AuditLogsQueryDto,
    _actorUserId?: string,
  ): Promise<AuditLogsPaginatedResponseDto> {
    this.validateDateRange(query.startDate, query.endDate);

    const conditions: string[] = [];
    const parameters: unknown[] = [];
    let paramIndex = 1;

    if (query.startDate) {
      conditions.push(`e.occurred_at >= $${paramIndex}::timestamptz`);
      parameters.push(`${query.startDate}T00:00:00Z`);
      paramIndex++;
    }

    if (query.endDate) {
      conditions.push(`e.occurred_at <= $${paramIndex}::timestamptz`);
      parameters.push(`${query.endDate}T23:59:59.999Z`);
      paramIndex++;
    }

    if (query.action) {
      conditions.push(`e.action = $${paramIndex}`);
      parameters.push(query.action.trim());
      paramIndex++;
    }

    if (query.entityType) {
      conditions.push(`e.entity_type = $${paramIndex}`);
      parameters.push(query.entityType.trim());
      paramIndex++;
    }

    if (query.actorUserId) {
      conditions.push(`e.user_id = $${paramIndex}::uuid`);
      parameters.push(query.actorUserId);
      paramIndex++;
    }

    if (query.userSearch) {
      conditions.push(
        `(u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR e.technical_principal ILIKE $${paramIndex})`,
      );
      parameters.push(`%${query.userSearch.trim()}%`);
      paramIndex++;
    }

    if (query.locationId) {
      conditions.push(
        `(e.scope_context->>'locationId' = $${paramIndex} OR e.after_value->>'locationId' = $${paramIndex} OR e.before_value->>'locationId' = $${paramIndex})`,
      );
      parameters.push(query.locationId);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM zd_audit.audit_event e
      LEFT JOIN zd_security.app_user u ON u.id = e.user_id
      ${whereClause}
    `;

    const countResult = await this.dataSource.query<{ total: number }[]>(
      countSql,
      parameters,
    );
    const total = Number(countResult[0]?.total ?? 0);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        message: "No se encontraron movimientos para los filtros seleccionados.",
      };
    }

    const dataSql = `
      SELECT 
        e.id,
        e.occurred_at,
        e.actor_type,
        e.event_category,
        e.user_id,
        e.technical_principal,
        e.action,
        e.entity_type,
        e.entity_id,
        e.role_context,
        e.scope_context,
        e.before_value,
        e.after_value,
        e.result,
        e.correlation_id,
        u.display_name AS user_display_name,
        u.email AS user_email
      FROM zd_audit.audit_event e
      LEFT JOIN zd_security.app_user u ON u.id = e.user_id
      ${whereClause}
      ORDER BY e.occurred_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...parameters, limit, offset];
    const rows = await this.dataSource.query<AuditEventDbRow[]>(
      dataSql,
      dataParams,
    );

    const items: AuditLogItemDto[] = rows.map((row) => this.mapToItemDto(row));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findLogById(
    eventId: string,
    _actorUserId?: string,
  ): Promise<AuditLogDetailDto> {
    const sql = `
      SELECT 
        e.id,
        e.occurred_at,
        e.actor_type,
        e.event_category,
        e.user_id,
        e.technical_principal,
        e.action,
        e.entity_type,
        e.entity_id,
        e.role_context,
        e.scope_context,
        e.before_value,
        e.after_value,
        e.result,
        e.correlation_id,
        u.display_name AS user_display_name,
        u.email AS user_email
      FROM zd_audit.audit_event e
      LEFT JOIN zd_security.app_user u ON u.id = e.user_id
      WHERE e.id = $1::uuid
    `;

    const rows = await this.dataSource.query<AuditEventDbRow[]>(sql, [eventId]);
    const row = rows[0];

    if (!row) {
      throw new NotFoundException("Movimiento de auditoría no encontrado.");
    }

    const itemDto = this.mapToItemDto(row);

    const reason =
      typeof row.after_value?.["reason"] === "string"
        ? (row.after_value["reason"] as string)
        : typeof row.role_context?.["reason"] === "string"
          ? (row.role_context["reason"] as string)
          : null;

    const source =
      row.technical_principal ?? row.actor_type ?? "No disponible";

    return {
      ...itemDto,
      previousValue: row.before_value ?? null,
      newValue: row.after_value ?? null,
      reason: reason ?? "No disponible",
      source,
      correlationId: row.correlation_id ?? "No disponible",
    };
  }

  private mapToItemDto(row: AuditEventDbRow): AuditLogItemDto {
    const actorFullName =
      row.user_display_name ??
      row.technical_principal ??
      "Sistema de ZDeptos";

    const actorUsername =
      row.user_email ?? row.technical_principal ?? null;

    const roleContextName =
      typeof row.role_context?.["roleName"] === "string"
        ? (row.role_context["roleName"] as string)
        : typeof row.role_context?.["code"] === "string"
          ? (row.role_context["code"] as string)
          : "Operativo / Administrador";

    const entityDisplayName =
      typeof row.after_value?.["name"] === "string"
        ? (row.after_value["name"] as string)
        : typeof row.after_value?.["displayName"] === "string"
          ? (row.after_value["displayName"] as string)
          : typeof row.before_value?.["name"] === "string"
            ? (row.before_value["name"] as string)
            : row.entity_type
              ? `${row.entity_type} ${row.entity_id ?? ""}`.trim()
              : "Elemento";

    const effectiveDate =
      typeof row.after_value?.["effectiveDate"] === "string"
        ? (row.after_value["effectiveDate"] as string)
        : typeof row.scope_context?.["period"] === "string"
          ? (row.scope_context["period"] as string)
          : row.occurred_at instanceof Date
            ? row.occurred_at.toISOString().slice(0, 10)
            : new Date(row.occurred_at).toISOString().slice(0, 10);

    return {
      id: row.id,
      modifiedAt:
        row.occurred_at instanceof Date
          ? row.occurred_at.toISOString()
          : new Date(row.occurred_at).toISOString(),
      actorFullName,
      actorUserId: row.user_id ?? null,
      actorUsername,
      actorRole: roleContextName,
      action: row.action,
      entityType: row.entity_type ?? null,
      entityDisplayName,
      effectiveDate,
      result: row.result,
    };
  }
}
