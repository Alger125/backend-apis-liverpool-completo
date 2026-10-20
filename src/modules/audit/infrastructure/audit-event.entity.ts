import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { AuditJson } from "../domain/audit.types";

@Entity({
  schema: "zd_audit",
  name: "audit_event",
})
export class AuditEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({
    name: "occurred_at",
    type: "timestamptz",
  })
  occurredAt!: Date;

  @Column({
    name: "actor_type",
    type: "varchar",
  })
  actorType!: string;

  @Column({
    name: "event_category",
    type: "varchar",
  })
  eventCategory!: string;

  @Column({
    name: "user_id",
    type: "uuid",
    nullable: true,
  })
  userId!: string | null;

  @Column({
    name: "technical_principal",
    type: "varchar",
    nullable: true,
  })
  technicalPrincipal!: string | null;

  @Column({
    name: "action",
    type: "varchar",
  })
  action!: string;

  @Column({
    name: "entity_type",
    type: "varchar",
    nullable: true,
  })
  entityType!: string | null;

  @Column({
    name: "entity_id",
    type: "uuid",
    nullable: true,
  })
  entityId!: string | null;

  @Column({
    name: "role_context",
    type: "jsonb",
    nullable: true,
  })
  roleContext!: AuditJson;

  @Column({
    name: "scope_context",
    type: "jsonb",
    nullable: true,
  })
  scopeContext!: AuditJson;

  @Column({
    name: "before_value",
    type: "jsonb",
    nullable: true,
  })
  beforeValue!: AuditJson;

  @Column({
    name: "after_value",
    type: "jsonb",
    nullable: true,
  })
  afterValue!: AuditJson;

  @Column({
    name: "result",
    type: "varchar",
  })
  result!: string;

  @Column({
    name: "correlation_id",
    type: "varchar",
    nullable: true,
  })
  correlationId!: string | null;
}
