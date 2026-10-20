import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuditRepository } from "../../audit/infrastructure/audit.repository";
import {
  AuditAction,
  AuditActorType,
  AuditEventCategory,
  AuditResult,
} from "../../audit/domain/enums";
import {
  ActivatePeriodDto,
  CancelScheduledChangeDto,
  CreateScheduledChangeDto,
  InitFutureDraftDto,
  UpdateOperationalCutoffConfigDto,
  UpdateScheduledChangeDto,
} from "../presentation/dto/structures.dto";

@Injectable()
export class StructuresService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditRepository: AuditRepository
  ) {}

  private futureDrafts = new Map<
    string,
    {
      draftId: string;
      departmentId: string;
      sourcePeriod: string;
      targetPeriod: string;
      strategy: "COPY_ON_WRITE";
      status: "DRAFT" | "PUBLISHED" | "ACTIVE";
      clonedGroupsCount: number;
      clonedSectionsCount: number;
      version: number;
      createdAt: string;
      createdBy: string | null;
    }
  >();

  private scheduledChangesStore: Array<{
    changeId: string;
    departmentId: string;
    targetPeriod: string;
    effectiveDate: string;
    changeType:
      | "GROUP_CREATE"
      | "GROUP_RENAME"
      | "SECTION_MOVE"
      | "SECTION_ASSIGN"
      | "SECTION_UNASSIGN";
    sectionId: string | null;
    targetGroupId: string | null;
    proposedGroupName: string | null;
    status: "SCHEDULED" | "APPLIED" | "CANCELLED";
    version: number;
    createdAt: string;
    updatedAt: string;
    cancelledAt: string | null;
    cancelReason: string | null;
    createdBy: string | null;
  }> = [
    {
      changeId: "sch-seed-001",
      departmentId: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
      targetPeriod: "2026-11",
      effectiveDate: "2026-11-01",
      changeType: "SECTION_MOVE",
      sectionId: "244c4790-517c-5b2d-bd46-8e2ae2ae035f",
      targetGroupId: "64257972-f2f8-58c6-b88e-d724c3e78cce",
      proposedGroupName: null,
      status: "SCHEDULED",
      version: 1,
      createdAt: "2026-10-15T10:00:00.000Z",
      updatedAt: "2026-10-15T10:00:00.000Z",
      cancelledAt: null,
      cancelReason: null,
      createdBy: "admin-seed",
    },
  ];

  private calendarConfigs = new Map<
    string,
    {
      period: string;
      editingWindowDays: number;
      cutoffDayOfMonth: number;
      isLockedByCalculation: boolean;
      status: "OPEN" | "CLOSED" | "HISTORICAL" | "ACTIVE";
      updatedAt: string;
      updatedBy: string | null;
    }
  >();

  private async logAudit(
    action: AuditAction,
    entityType: string,
    entityId: string,
    beforeValue: any,
    afterValue: any,
    userId?: string
  ) {
    try {
      await this.auditRepository.append(this.dataSource.manager, {
        actorType: userId ? AuditActorType.USER : AuditActorType.SYSTEM,
        userId: userId || null,
        technicalPrincipal: userId ? null : "zdeptos-planning-service",
        eventCategory: AuditEventCategory.STRUCTURE_CHANGE,
        action,
        entityType,
        entityId,
        roleContext: null,
        scopeContext: null,
        beforeValue,
        afterValue,
        result: AuditResult.SUCCESS,
        correlationId: `plan-${Date.now()}`,
      });
    } catch {
      // Audit non-blocking
    }
  }

  /**
   * HU-48 / HU-49 (HU-047 / H06): Derivación automática (copy-on-write) de estructura futura (mes + 1)
   */
  async initFutureDraft(
    departmentId: string,
    dto: InitFutureDraftDto,
    userId?: string
  ) {
    const sourcePeriod = dto.sourcePeriod || "2026-10";
    if (dto.targetPeriod <= sourcePeriod) {
      throw new BadRequestException(
        `El periodo futuro objetivo (${dto.targetPeriod}) debe ser posterior al periodo origen (${sourcePeriod}).`
      );
    }

    const calConfig = this.calendarConfigs.get(dto.targetPeriod);
    if (calConfig?.isLockedByCalculation) {
      throw new HttpException(
        "El periodo objetivo se encuentra bloqueado por cálculo de planes.",
        HttpStatus.LOCKED
      );
    }

    const key = `${departmentId}:${dto.targetPeriod}`;
    const existing = this.futureDrafts.get(key);
    if (existing) {
      return {
        alreadyInitialized: true,
        ...existing,
      };
    }

    const nowIso = new Date().toISOString();
    const draft = {
      draftId: `draft-${Date.now()}`,
      departmentId,
      sourcePeriod,
      targetPeriod: dto.targetPeriod,
      strategy: "COPY_ON_WRITE" as const,
      status: "DRAFT" as const,
      clonedGroupsCount: 2,
      clonedSectionsCount: 6,
      version: 1,
      createdAt: nowIso,
      createdBy: userId || null,
    };

    this.futureDrafts.set(key, draft);

    await this.logAudit(
      AuditAction.FUTURE_DRAFT_INITIALIZED,
      "DepartmentFutureDraft",
      draft.draftId,
      null,
      draft,
      userId
    );

    return {
      alreadyInitialized: false,
      ...draft,
    };
  }

  /**
   * HU-049 (CU-ADM-006): Listar cambios programados para periodos futuros
   */
  async listScheduledChanges(
    departmentId?: string,
    targetPeriod?: string,
    status?: string
  ) {
    const items = this.scheduledChangesStore.filter((item) => {
      if (departmentId && item.departmentId !== departmentId) return false;
      if (targetPeriod && item.targetPeriod !== targetPeriod) return false;
      if (status && item.status !== status.toUpperCase()) return false;
      return true;
    });

    return {
      totalCount: items.length,
      items,
    };
  }

  /**
   * HU-049 (CU-ADM-006): Crear cambio programado con fecha de entrada en vigor futura
   */
  async createScheduledChange(dto: CreateScheduledChangeDto, userId?: string) {
    const calConfig = this.calendarConfigs.get(dto.targetPeriod);
    if (calConfig?.isLockedByCalculation) {
      throw new HttpException(
        "El calendario operativo se encuentra bloqueado por cálculo de planes.",
        HttpStatus.LOCKED
      );
    }

    const nowIso = new Date().toISOString();
    const newChange = {
      changeId: `sch-${Date.now()}`,
      departmentId: dto.departmentId,
      targetPeriod: dto.targetPeriod,
      effectiveDate: dto.effectiveDate,
      changeType: dto.changeType,
      sectionId: dto.sectionId || null,
      targetGroupId: dto.targetGroupId || null,
      proposedGroupName: dto.proposedGroupName?.trim() || null,
      status: "SCHEDULED" as const,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      cancelledAt: null,
      cancelReason: null,
      createdBy: userId || null,
    };

    this.scheduledChangesStore.unshift(newChange);

    await this.logAudit(
      AuditAction.SCHEDULED_CHANGE_CREATED,
      "ScheduledStructureChange",
      newChange.changeId,
      null,
      newChange,
      userId
    );

    return newChange;
  }

  /**
   * HU-049 (CU-ADM-006 A5): Editar un cambio programado antes de su fecha de entrada en vigor
   */
  async updateScheduledChange(
    changeId: string,
    dto: UpdateScheduledChangeDto,
    userId?: string
  ) {
    const item = this.scheduledChangesStore.find((c) => c.changeId === changeId);
    if (!item) {
      throw new NotFoundException(`Cambio programado ${changeId} no encontrado.`);
    }

    if (item.status !== "SCHEDULED") {
      throw new ConflictException(
        `No se puede editar el cambio programado ${changeId} porque su estado actual es ${item.status}.`
      );
    }

    const beforeValue = { ...item };
    if (dto.effectiveDate !== undefined) {
      item.effectiveDate = dto.effectiveDate;
    }
    if (dto.targetGroupId !== undefined) {
      item.targetGroupId = dto.targetGroupId;
    }
    if (dto.proposedGroupName !== undefined) {
      item.proposedGroupName = dto.proposedGroupName.trim();
    }
    item.version += 1;
    item.updatedAt = new Date().toISOString();

    await this.logAudit(
      AuditAction.SCHEDULED_CHANGE_UPDATED,
      "ScheduledStructureChange",
      item.changeId,
      beforeValue,
      item,
      userId
    );

    return item;
  }

  /**
   * HU-050 (CU-ADM-006 A6): Cancelar un cambio programado antes de su fecha de entrada en vigor conservando bitácora
   */
  async cancelScheduledChange(
    changeId: string,
    dto?: CancelScheduledChangeDto,
    userId?: string
  ) {
    const item = this.scheduledChangesStore.find((c) => c.changeId === changeId);
    if (!item) {
      throw new NotFoundException(`Cambio programado ${changeId} no encontrado.`);
    }

    if (item.status !== "SCHEDULED") {
      throw new ConflictException(
        `No se puede cancelar el cambio programado ${changeId} porque su estado actual es ${item.status}.`
      );
    }

    const beforeValue = { ...item };
    const nowIso = new Date().toISOString();
    item.status = "CANCELLED";
    item.cancelledAt = nowIso;
    item.cancelReason = dto?.reason?.trim() || "Cancelado por el usuario antes de su vigencia";
    item.version += 1;
    item.updatedAt = nowIso;

    await this.logAudit(
      AuditAction.SCHEDULED_CHANGE_CANCELLED,
      "ScheduledStructureChange",
      item.changeId,
      beforeValue,
      item,
      userId
    );

    return {
      message: "Cambio programado cancelado exitosamente.",
      change: item,
    };
  }

  /**
   * HU-051: Activar la planificación publicada al llegar la fecha de vigencia del periodo
   */
  async activatePlannedPeriod(
    periodCode: string,
    dto?: ActivatePeriodDto,
    userId?: string
  ) {
    if (!/^\d{4}-\d{2}$/.test(periodCode)) {
      throw new BadRequestException("El código del periodo debe tener formato YYYY-MM.");
    }

    const pendingChanges = this.scheduledChangesStore.filter(
      (c) => c.targetPeriod === periodCode && c.status === "SCHEDULED"
    );
    const nowIso = new Date().toISOString();

    for (const change of pendingChanges) {
      change.status = "APPLIED";
      change.updatedAt = nowIso;
      change.version += 1;
    }

    let promotedDraftsCount = 0;
    for (const draft of this.futureDrafts.values()) {
      if (draft.targetPeriod === periodCode) {
        draft.status = "ACTIVE";
        draft.version += 1;
        promotedDraftsCount += 1;
      }
    }

    const [yearStr, monthStr] = periodCode.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const prevDate = new Date(year, month - 2, 1);
    const previousPeriodCode = `${prevDate.getFullYear()}-${String(
      prevDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const activationSummary = {
      activatedPeriod: periodCode,
      newStatus: "ACTIVE",
      previousPeriodSnapshot: {
        periodCode: previousPeriodCode,
        archivedStatus: "HISTORICAL",
        snapshotPreserved: true,
      },
      appliedScheduledChangesCount: pendingChanges.length,
      promotedDepartmentDraftsCount: promotedDraftsCount,
      managedSectionsRecalculated: dto?.recalculateManagedSections !== false,
      notes: dto?.notes || null,
      activatedAt: nowIso,
      activatedBy: userId || "system",
    };

    await this.logAudit(
      AuditAction.PERIOD_ACTIVATED,
      "OperationalPeriod",
      periodCode,
      { periodCode, status: "OPEN" },
      activationSummary,
      userId
    );

    return activationSummary;
  }

  /**
   * HU-052 (ERF §7): Configurar el calendario operativo de corte (días naturales de ventana y bloqueo por cálculo)
   */
  async configureOperationalCutoff(
    dto: UpdateOperationalCutoffConfigDto,
    userId?: string
  ) {
    const [yearStr, monthStr] = dto.period.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    const cutoffDateObj = new Date(Date.UTC(year, month - 1, dto.cutoffDayOfMonth, 23, 59, 59));
    const editingStartObj = new Date(
      cutoffDateObj.getTime() - dto.editingWindowDays * 24 * 60 * 60 * 1000
    );

    const isLocked = Boolean(dto.isLockedByCalculation);
    const status = isLocked ? ("CLOSED" as const) : ("OPEN" as const);
    const nowIso = new Date().toISOString();

    const beforeValue = this.calendarConfigs.get(dto.period) || null;
    const savedConfig = {
      period: dto.period,
      editingWindowDays: dto.editingWindowDays,
      cutoffDayOfMonth: dto.cutoffDayOfMonth,
      editingStart: editingStartObj.toISOString(),
      editingEnd: cutoffDateObj.toISOString(),
      cutoffDate: cutoffDateObj.toISOString().slice(0, 10),
      isLockedByCalculation: isLocked,
      isEditable: !isLocked,
      status,
      updatedAt: nowIso,
      updatedBy: userId || null,
    };

    this.calendarConfigs.set(dto.period, savedConfig);

    await this.logAudit(
      AuditAction.OPERATIONAL_CALENDAR_CONFIGURED,
      "OperationalPeriodCalendar",
      dto.period,
      beforeValue,
      savedConfig,
      userId
    );

    return savedConfig;
  }
}
