import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AppendAuditEvent } from "../domain/audit.types";
import { AuditEventEntity } from "./audit-event.entity";

@Injectable()
export class AuditRepository {
  async append(manager: EntityManager, input: AppendAuditEvent): Promise<void> {
    const event = Object.assign(new AuditEventEntity(), {
      actorType: input.actorType,
      userId: input.userId,
      technicalPrincipal: input.technicalPrincipal,
      eventCategory: input.eventCategory,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      roleContext: input.roleContext,
      scopeContext: input.scopeContext,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      result: input.result,
      correlationId: input.correlationId,
    });

    await manager.save(event);
  }
}
