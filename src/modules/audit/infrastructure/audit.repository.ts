import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AppendAuditEvent } from "../domain/audit.types";
import { AuditEventEntity } from "./audit-event.entity";

@Injectable()
export class AuditRepository {
  async append(manager: EntityManager, input: AppendAuditEvent): Promise<void> {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // 1. Validar actorType conforme al check constraint ('USER', 'SYSTEM', 'INTEGRATION')
      let normalizedActorType = String(input.actorType || "SYSTEM").toUpperCase();
      if (!["USER", "SYSTEM", "INTEGRATION"].includes(normalizedActorType)) {
        normalizedActorType = "SYSTEM";
      }

      // 2. Validar userId contra FK zd_security.app_user
      let resolvedUserId: string | null = null;
      if (input.userId && uuidRegex.test(input.userId)) {
        const userExists = await manager.query(
          `SELECT 1 FROM zd_security.app_user WHERE id = $1 LIMIT 1`,
          [input.userId],
        );
        if (userExists && userExists.length > 0) {
          resolvedUserId = input.userId;
        }
      }

      // 3. Validar entityId para que solo reciba UUIDs válidos (columna tipo uuid)
      let resolvedEntityId: string | null = null;
      if (input.entityId && uuidRegex.test(input.entityId)) {
        resolvedEntityId = input.entityId;
      }

      const event = Object.assign(new AuditEventEntity(), {
        actorType: normalizedActorType,
        userId: resolvedUserId,
        technicalPrincipal: input.technicalPrincipal ?? null,
        eventCategory: input.eventCategory,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: resolvedEntityId,
        roleContext: input.roleContext ?? null,
        scopeContext: input.scopeContext ?? null,
        beforeValue: input.beforeValue ?? null,
        afterValue: input.afterValue ?? null,
        result: input.result,
        correlationId: input.correlationId ?? null,
      });

      await manager.save(event);
    } catch (err) {
      // Registrar en log pero no bloquear el flujo de la aplicación
      console.warn("No fue posible persistir el evento de auditoría:", (err as Error)?.message || err);
    }
  }
}
