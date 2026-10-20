import { AuditAction, AuditActorType, AuditEventCategory, AuditResult } from './enums';

export type AuditJson =
  string | number | boolean | null | AuditJson[] | { [key: string]: AuditJson };

export interface AuditSnapshot {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  protected: boolean;
  version: number;
  permissionCodes: string[];
}

export interface AppendAuditEvent {
  actorType: AuditActorType;
  userId: string | null;
  technicalPrincipal: string | null;
  eventCategory: AuditEventCategory;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  roleContext: AuditJson | null;
  scopeContext: AuditJson | null;
  beforeValue: AuditValue | null;
  afterValue: AuditValue | null;
  result: AuditResult;
  correlationId: string | null;
}

export type AuditActor =
  | {
      actorType: AuditActorType.USER;
      userId: string;
      technicalPrincipal: null;
    }
  | {
      actorType: AuditActorType.TECHNICAL;
      userId: null;
      technicalPrincipal: string;
    };

export interface RoleUpdatedAuditSnapshot extends AuditSnapshot {
  addedPermissionCodes: string[];
  removedPermissionCodes: string[];
}

export interface RoleDeletedAuditSnapshot extends AuditSnapshot {
  reason: string;
  revokedAssignments: number;
  revokedExceptions: number;
}

export type AuditValue =
  | AuditSnapshot
  | RoleUpdatedAuditSnapshot
  | RoleDeletedAuditSnapshot
  | Record<string, any>;

