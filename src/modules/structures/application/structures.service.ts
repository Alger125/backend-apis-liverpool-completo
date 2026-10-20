import {
  BadRequestException,
  ConflictException,
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
  BaseDepartmentConfigItemDto,
  EcInboundEventDto,
  GetComprasPacTreeQueryDto,
  SuburbiaAdvisorsQueryDto,
  SyncManagedSectionsRequestDto,
  UpdateBaseDepartmentsConfigDto,
} from "../presentation/dto/structures.dto";

@Injectable()
export class StructuresService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditRepository: AuditRepository
  ) {}

  private baseDepartmentsConfig: Array<{
    departmentCode: string;
    displayName: string;
    structureType: "COMPRAS" | "PAC";
    division: string;
    isActive: boolean;
    updatedAt: string;
  }> = [
    {
      departmentCode: "DEPT-COMPRAS-HL",
      displayName: "Dirección de Compras Hardline (Muebles, Electrónica y Hogar)",
      structureType: "COMPRAS",
      division: "HARDLINE",
      isActive: true,
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      departmentCode: "DEPT-COMPRAS-SL",
      displayName: "Dirección de Compras Softline (Moda, Calzado y Perfumería)",
      structureType: "COMPRAS",
      division: "SOFTLINE",
      isActive: true,
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      departmentCode: "DEPT-PAC-OMNI",
      displayName: "Coordinación General PAC y Atención Omnicanal",
      structureType: "PAC",
      division: "OMNICANAL",
      isActive: true,
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  ];

  private ecOutboxQueue: Array<{
    outboxId: string;
    employeeId: string;
    effectiveDate: string;
    managedSections: string[];
    status: "QUEUED" | "SENT";
    createdAt: string;
    sentAt: string | null;
    correlationId: string;
  }> = [
    {
      outboxId: "outbox-seed-001",
      employeeId: "EMP-900101",
      effectiveDate: "2026-10-01",
      managedSections: ["0129", "0130", "0131"],
      status: "SENT",
      createdAt: "2026-10-01T08:00:00.000Z",
      sentAt: "2026-10-01T08:00:05.000Z",
      correlationId: "ec-sync-seed-001",
    },
  ];

  private ecInboundEventsLog: Array<{
    eventId: string;
    externalEventId: string;
    eventType: string;
    employeeId: string;
    effectiveDate: string;
    organizationalUnitId: string | null;
    anchorSectionCode: string | null;
    processedAt: string;
    outboxTriggered: boolean;
  }> = [];

  /**
   * HU-022 (DEC-15): Consultar configuración parametrizable de departamentos base para Compras y PAC
   */
  async getBaseDepartmentsConfig(structureType?: "COMPRAS" | "PAC") {
    const items = structureType
      ? this.baseDepartmentsConfig.filter((d) => d.structureType === structureType)
      : this.baseDepartmentsConfig;

    return {
      decisionRef: "DEC-15",
      totalCount: items.length,
      baseDepartments: items,
    };
  }

  /**
   * HU-022 (DEC-15): Actualizar configuración de departamentos base de Compras y PAC sin cambios de código
   */
  async updateBaseDepartmentsConfig(
    dto: UpdateBaseDepartmentsConfigDto,
    userId?: string
  ) {
    const seen = new Set<string>();
    for (const item of dto.baseDepartments) {
      const code = item.departmentCode.trim().toUpperCase();
      if (seen.has(code)) {
        throw new ConflictException(
          `El código de departamento base '${code}' está duplicado en la solicitud.`
        );
      }
      seen.add(code);
    }

    const beforeValue = [...this.baseDepartmentsConfig];
    const nowIso = new Date().toISOString();

    this.baseDepartmentsConfig = dto.baseDepartments.map((item: BaseDepartmentConfigItemDto) => ({
      departmentCode: item.departmentCode.trim().toUpperCase(),
      displayName: item.displayName.trim(),
      structureType: item.structureType,
      division: item.division?.trim().toUpperCase() || "GENERAL",
      isActive: item.isActive ?? true,
      updatedAt: nowIso,
    }));

    try {
      await this.auditRepository.append(this.dataSource.manager, {
        actorType: userId ? AuditActorType.USER : AuditActorType.SYSTEM,
        userId: userId || null,
        technicalPrincipal: userId ? null : "zdeptos-structures-service",
        eventCategory: AuditEventCategory.STRUCTURE_CHANGE,
        action: AuditAction.BASE_DEPARTMENTS_CONFIG_UPDATED,
        entityType: "BaseDepartmentsConfig",
        entityId: "COMPRAS_PAC_BASE_DEPTS",
        roleContext: null,
        scopeContext: null,
        beforeValue,
        afterValue: this.baseDepartmentsConfig,
        result: AuditResult.SUCCESS,
        correlationId: `base-depts-${Date.now()}`,
      });
    } catch {
      // Audit non-blocking
    }

    return {
      decisionRef: "DEC-15",
      updatedAt: nowIso,
      updatedBy: userId || "system",
      totalCount: this.baseDepartmentsConfig.length,
      baseDepartments: this.baseDepartmentsConfig,
    };
  }

  /**
   * HU-020, HU-021, HU-023 (DEC-01):
   * - HU-020: Navegación de estructura Compras (Hardline/Softline) sin requerir grupos operativos (DEC-01).
   * - HU-021: Navegación de estructura PAC.
   * - HU-023: Exclusión automática de unidades administrativas/RH no comerciales.
   */
  async getComprasPacTree(query: GetComprasPacTreeQueryDto) {
    const excludeNonCommercial = query.excludeNonCommercial !== false;
    const activeBaseDepts = this.baseDepartmentsConfig.filter(
      (d) =>
        d.isActive &&
        d.structureType === query.structureType &&
        (!query.baseDepartmentCode ||
          d.departmentCode.toUpperCase() === query.baseDepartmentCode.trim().toUpperCase())
    );

    if (activeBaseDepts.length === 0) {
      throw new NotFoundException(
        `No se encontraron departamentos base activos para la estructura ${query.structureType}${
          query.baseDepartmentCode ? ` con código ${query.baseDepartmentCode}` : ""
        }.`
      );
    }

    const rawUnits = [
      {
        unitCode: "DEPT-COMPRAS-HL",
        displayName: "Dirección de Compras Hardline",
        structureType: "COMPRAS",
        isCommercial: true,
        leader: {
          employeeId: "EMP-COMP-001",
          name: "Roberto Méndez Vega",
          positionTitle: "Director de Compras Hardline",
        },
        directSections: [
          { code: "0129", name: "Electrónica y Pantallas", buyerName: "Laura Gómez", isAnchor: true },
          { code: "0130", name: "Cómputo y Telefonía", buyerName: "Laura Gómez", isAnchor: false },
          { code: "0131", name: "Línea Blanca y Enseres", buyerName: "Carlos Ruiz", isAnchor: true },
        ],
      },
      {
        unitCode: "DEPT-COMPRAS-SL",
        displayName: "Dirección de Compras Softline",
        structureType: "COMPRAS",
        isCommercial: true,
        leader: {
          employeeId: "EMP-COMP-002",
          name: "Sofía Hernández Lara",
          positionTitle: "Directora de Compras Softline",
        },
        directSections: [
          { code: "0201", name: "Damas y Moda Contemporánea", buyerName: "Elena Torres", isAnchor: true },
          { code: "0202", name: "Perfumería y Cosméticos", buyerName: "Elena Torres", isAnchor: false },
        ],
      },
      {
        unitCode: "DEPT-COMPRAS-RH-ADM",
        displayName: "Coordinación Administrativa y RH Compras",
        structureType: "COMPRAS",
        isCommercial: false,
        leader: {
          employeeId: "EMP-ADM-999",
          name: "Jorge Pineda",
          positionTitle: "Coordinador Administrativo RH",
        },
        directSections: [],
      },
      {
        unitCode: "DEPT-PAC-OMNI",
        displayName: "Coordinación General PAC y Atención Omnicanal",
        structureType: "PAC",
        isCommercial: true,
        leader: {
          employeeId: "EMP-PAC-001",
          name: "Mariana Vázquez",
          positionTitle: "Gerente Nacional PAC",
        },
        directSections: [
          { code: "0901", name: "Módulo PAC Atención Clientes", buyerName: "Mónica Silva", isAnchor: true },
          { code: "0902", name: "Módulo Click & Collect / Omnicanal", buyerName: "Mónica Silva", isAnchor: false },
        ],
      },
      {
        unitCode: "DEPT-PAC-SOPORTE-ADM",
        displayName: "Soporte Administrativo Interno PAC",
        structureType: "PAC",
        isCommercial: false,
        leader: {
          employeeId: "EMP-PAC-999",
          name: "Arturo Nava",
          positionTitle: "Analista Administrativo",
        },
        directSections: [],
      },
    ];

    const allowedCodes = new Set(activeBaseDepts.map((d) => d.departmentCode));
    const filteredUnits = rawUnits.filter((unit) => {
      if (unit.structureType !== query.structureType) return false;
      if (excludeNonCommercial && !unit.isCommercial) return false;
      if (query.baseDepartmentCode) {
        return unit.unitCode === query.baseDepartmentCode.trim().toUpperCase();
      }
      return allowedCodes.has(unit.unitCode) || (!excludeNonCommercial && !unit.isCommercial);
    });

    const excludedNonCommercialCount = rawUnits.filter(
      (u) => u.structureType === query.structureType && !u.isCommercial
    ).length;

    return {
      structureType: query.structureType,
      decisionRef: "DEC-01",
      requiresOperationalGroups: false,
      excludeNonCommercial,
      excludedNonCommercialUnitsCount: excludeNonCommercial ? excludedNonCommercialCount : 0,
      baseDepartmentsApplied: activeBaseDepts.map((d) => d.departmentCode),
      nodes: filteredUnits.map((unit) => ({
        unitCode: unit.unitCode,
        displayName: unit.displayName,
        structureType: unit.structureType,
        isCommercial: unit.isCommercial,
        requiresGroups: false,
        leader: unit.leader,
        directSectionsCount: unit.directSections.length,
        directSections: unit.directSections,
      })),
    };
  }

  /**
   * HU-19 (HU-028 / DEC-16): Soporte al nodo intermedio Suburbia 70051507
   * ("Asesor Especializado Experiencia Cliente") entre Jefatura de Departamento (70051506) y colaboradores de piso.
   */
  async getSuburbiaAdvisors(query: SuburbiaAdvisorsQueryDto) {
    return {
      format: "SUBURBIA",
      decisionRef: "DEC-16",
      intermediatePositionCode: "70051507",
      intermediatePositionTitle: "Asesor Especializado Experiencia Cliente",
      parentPositionCode: "70051506",
      parentPositionTitle: "Jefe de Departamento Suburbia",
      locationId: query.locationId || "f62b081e-4cc2-518a-b840-a7afa915cd3d",
      departmentId: query.departmentId || "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
      intermediateNodes: [
        {
          nodeId: "sub-node-70051507-01",
          positionCode: "70051507",
          positionTitle: "Asesor Especializado Experiencia Cliente",
          holder: {
            employeeId: "EMP-SUB-701",
            fullName: "Diana Patricia Morales",
            anchorSectionCode: "0410",
            anchorSectionName: "Ropa Casual Suburbia",
          },
          supervisedGroups: [
            {
              groupCode: "Grupo 001",
              groupName: "Piso Moda Suburbia Norte",
              sections: ["0410", "0411", "0412"],
              collaboratorsCount: 6,
            },
          ],
        },
      ],
    };
  }

  /**
   * HU-41 (HU-029 / HU-041): Consultar "Secciones que administra" (managedSections) de un colaborador
   */
  async getCollaboratorManagedSections(employeeId: string) {
    const normalizedId = employeeId.trim();
    if (!normalizedId) {
      throw new BadRequestException("El identificador del colaborador es obligatorio.");
    }

    return {
      employeeId: normalizedId,
      fullName: "Colaborador Comercial Asignado",
      anchorSection: {
        code: "0129",
        name: "Electrónica y Pantallas",
        isAnchor: true,
      },
      group: {
        id: "64257972-f2f8-58c6-b88e-d724c3e78cce",
        displayCode: "Grupo 001",
        name: "Grupo Tecnología e Imagen",
      },
      managedSectionsCount: 3,
      managedSections: [
        {
          code: "0129",
          name: "Electrónica y Pantallas",
          isAnchor: true,
          inheritanceSource: "ANCHOR_CONTRACT",
        },
        {
          code: "0130",
          name: "Cómputo y Telefonía",
          isAnchor: false,
          inheritanceSource: "GROUP_MEMBERSHIP",
        },
        {
          code: "0131",
          name: "Audio y Accesorios",
          isAnchor: false,
          inheritanceSource: "GROUP_MEMBERSHIP",
        },
      ],
    };
  }

  /**
   * HU-45 (HU-044): Procesar evento entrante de Employee Central
   */
  async processEcInboundEvent(dto: EcInboundEventDto, userId?: string) {
    const eventId = `ec-evt-${Date.now()}`;
    const externalEventId = dto.externalEventId || `CPI-${Date.now()}`;
    const processedAt = new Date().toISOString();

    const managed = await this.getCollaboratorManagedSections(dto.employeeId);
    const recalculatedSections =
      dto.eventType === "TERMINATION"
        ? []
        : dto.anchorSectionCode
        ? Array.from(
            new Set([
              dto.anchorSectionCode,
              ...managed.managedSections.map((s) => s.code),
            ])
          )
        : managed.managedSections.map((s) => s.code);

    const outboxEntry = {
      outboxId: `outbox-${Date.now()}`,
      employeeId: dto.employeeId,
      effectiveDate: dto.effectiveDate,
      managedSections: recalculatedSections,
      status: "QUEUED" as const,
      createdAt: processedAt,
      sentAt: null,
      correlationId: externalEventId,
    };

    this.ecOutboxQueue.unshift(outboxEntry);

    const logItem = {
      eventId,
      externalEventId,
      eventType: dto.eventType,
      employeeId: dto.employeeId,
      effectiveDate: dto.effectiveDate,
      organizationalUnitId: dto.organizationalUnitId || null,
      anchorSectionCode: dto.anchorSectionCode || null,
      processedAt,
      outboxTriggered: true,
    };
    this.ecInboundEventsLog.unshift(logItem);

    try {
      await this.auditRepository.append(this.dataSource.manager, {
        actorType: userId ? AuditActorType.USER : AuditActorType.SYSTEM,
        userId: userId || null,
        technicalPrincipal: userId ? null : "ec-inbound-webhook",
        eventCategory: AuditEventCategory.STRUCTURE_CHANGE,
        action: AuditAction.EC_EVENT_PROCESSED,
        entityType: "EmployeeCentralEvent",
        entityId: eventId,
        roleContext: null,
        scopeContext: null,
        beforeValue: null,
        afterValue: logItem,
        result: AuditResult.SUCCESS,
        correlationId: externalEventId,
      });
    } catch {
      // Audit non-blocking
    }

    return {
      status: "PROCESSED",
      eventId,
      externalEventId,
      eventType: dto.eventType,
      employeeId: dto.employeeId,
      effectiveDate: dto.effectiveDate,
      recalculatedManagedSections: recalculatedSections,
      outboxItemId: outboxEntry.outboxId,
      processedAt,
    };
  }

  /**
   * HU-44 (HU-045 / P-01): Sincronizar "Secciones que administra" hacia Employee Central (Outbox P-01)
   */
  async syncManagedSectionsToEc(dto: SyncManagedSectionsRequestDto, userId?: string) {
    const effectiveDate = dto.effectiveDate || new Date().toISOString().slice(0, 10);
    let managedSections = dto.managedSections;

    if (!managedSections || managedSections.length === 0) {
      const resolved = await this.getCollaboratorManagedSections(dto.employeeId);
      managedSections = resolved.managedSections.map((s) => s.code);
    }

    const nowIso = new Date().toISOString();
    const correlationId = `ec-p01-${Date.now()}`;
    const outboxItem = {
      outboxId: `outbox-${Date.now()}`,
      employeeId: dto.employeeId,
      effectiveDate,
      managedSections,
      status: "SENT" as const,
      createdAt: nowIso,
      sentAt: nowIso,
      correlationId,
    };

    this.ecOutboxQueue.unshift(outboxItem);

    try {
      await this.auditRepository.append(this.dataSource.manager, {
        actorType: userId ? AuditActorType.USER : AuditActorType.SYSTEM,
        userId: userId || null,
        technicalPrincipal: userId ? null : "ec-outbound-sync",
        eventCategory: AuditEventCategory.STRUCTURE_CHANGE,
        action: AuditAction.EC_MANAGED_SECTIONS_SYNCED,
        entityType: "EmployeeCentralOutbox",
        entityId: outboxItem.outboxId,
        roleContext: null,
        scopeContext: null,
        beforeValue: null,
        afterValue: {
          employeeId: outboxItem.employeeId,
          effectiveDate: outboxItem.effectiveDate,
          managedSections: outboxItem.managedSections,
        },
        result: AuditResult.SUCCESS,
        correlationId,
      });
    } catch {
      // Audit non-blocking
    }

    return {
      contractRef: "P-01",
      outboxId: outboxItem.outboxId,
      status: outboxItem.status,
      sentAt: outboxItem.sentAt,
      payload: {
        employeeId: outboxItem.employeeId,
        effectiveDate: outboxItem.effectiveDate,
        managedSections: outboxItem.managedSections,
      },
    };
  }

  /**
   * HU-44 (HU-045 / P-01): Consultar bandeja de salida (Outbox) de sincronización hacia Employee Central
   */
  async getEcOutbox(employeeId?: string) {
    const items = employeeId
      ? this.ecOutboxQueue.filter((i) => i.employeeId === employeeId.trim())
      : this.ecOutboxQueue;

    return {
      contractRef: "P-01",
      totalCount: items.length,
      items,
    };
  }
}
