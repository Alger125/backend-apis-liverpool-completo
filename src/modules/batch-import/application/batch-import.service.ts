import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { AuditRepository } from "../../audit/infrastructure/audit.repository";
import {
  AuditAction,
  AuditActorType,
  AuditEventCategory,
  AuditResult,
} from "../../audit/domain/enums";
import {
  BatchImportDto,
  BatchImportResultDto,
  BatchImportValidationErrorDto,
} from "../presentation/dto/batch-import.dto";
import {
  BatchImportLayoutResponseDto,
  LayoutColumnSpecificationDto,
} from "../presentation/dto/batch-import-layout.dto";

interface NodeDbRow {
  id: string;
  external_code: string;
  business_structure_id: string;
  parent_id?: string | null;
  level_type?: string;
}

interface SectionDbRow {
  id: string;
  code: string;
  name: string;
}

interface AssignmentDbRow {
  section_id: string;
  section_code: string;
  department_node_id: string;
  commercial_group_id: string;
}

interface PeriodDbRow {
  id: string;
  year: number;
  month: number;
  status: string;
  start_date: string;
  end_date: string;
}

@Injectable()
export class BatchImportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditRepository: AuditRepository,
  ) {}

  getLayoutSpecification(format?: "JSON" | "CSV"): BatchImportLayoutResponseDto {
    const columns: LayoutColumnSpecificationDto[] = [
      {
        technicalName: "locationCode",
        functionalName: "Código de Tienda / Almacén",
        description: "Identificador oficial de la tienda en SAP (ej: LOC-001 o 0001)",
        dataType: "STRING",
        maxLength: 20,
        required: true,
        referenceCatalog: "zd_core.structure_node(level=LOCATION)",
        exampleValue: "LOC-001",
      },
      {
        technicalName: "parentDepartmentCode",
        functionalName: "Código de Departamento Padre",
        description: "Código del departamento comercial de 6to nivel al que pertenecerá el grupo",
        dataType: "STRING",
        maxLength: 50,
        required: true,
        referenceCatalog: "zd_core.structure_node(level=DEPARTMENT)",
        exampleValue: "DEP-001",
      },
      {
        technicalName: "groupName",
        functionalName: "Nombre del Grupo Comercial",
        description: "Nombre comercial del grupo (ej: Grupo Belleza 1)",
        dataType: "STRING",
        maxLength: 200,
        required: true,
        exampleValue: "Grupo Belleza 1",
      },
      {
        technicalName: "groupCode",
        functionalName: "Código de Grupo Sugerido",
        description: "Identificador numérico opcional (si se omite, se aplica autonumeración P-02)",
        dataType: "STRING",
        maxLength: 10,
        required: false,
        exampleValue: "01",
      },
      {
        technicalName: "sectionCode",
        functionalName: "Código de Sección",
        description: "Código de la sección en el catálogo maestro de Liverpool",
        dataType: "STRING",
        maxLength: 50,
        required: true,
        referenceCatalog: "zd_ref.section_reference",
        exampleValue: "SEC-001",
      },
      {
        technicalName: "assignmentOrigin",
        functionalName: "Origen de Asignación",
        description: "Indica si la sección entra como ancla fija o carga inicial",
        dataType: "ENUM",
        required: true,
        referenceCatalog: "INITIAL_LOAD, ANCHOR",
        exampleValue: "INITIAL_LOAD",
      },
      {
        technicalName: "effectivePeriod",
        functionalName: "Periodo Operativo Vigente",
        description: "Periodo mensual objetivo en formato YYYY-MM",
        dataType: "STRING",
        maxLength: 7,
        required: true,
        exampleValue: "2026-10",
      },
    ];

    const templateCsv = [
      "locationCode,parentDepartmentCode,groupName,groupCode,sectionCode,assignmentOrigin,effectivePeriod",
      "LOC-001,DEP-001,Grupo Belleza 1,01,SEC-001,ANCHOR,2026-10",
      "LOC-001,DEP-001,Grupo Belleza 1,01,SEC-002,INITIAL_LOAD,2026-10",
    ].join("\n");

    return {
      layoutVersion: "V2.1-LIVERPOOL",
      allowedExtensions: [".csv", ".txt"],
      delimiter: ",",
      columns,
      templateCsv: format === "CSV" ? templateCsv : undefined,
    };
  }

  async processBatchImport(
    dto: BatchImportDto,
    actorUserId?: string,
  ): Promise<BatchImportResultDto> {
    const lowerName = dto.fileName.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".txt")) {
      throw new BadRequestException(
        "El formato del archivo no es admitido. Solo se permiten extensiones .csv y .txt (CA-CIN-004).",
      );
    }

    const [yearStr, monthStr] = dto.period.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const periods = await this.dataSource.query<PeriodDbRow[]>(
      `SELECT id, year, month, status, start_date, end_date FROM zd_plan.operational_period WHERE year = $1 AND month = $2`,
      [year, month],
    );

    const periodRow = periods[0];
    if (periodRow && (periodRow.status === "HISTORICAL" || periodRow.status === "CLOSED" || periodRow.status === "IN_CALCULATION")) {
      throw new ForbiddenException(
        `El periodo operativo ${dto.period} no permite modificaciones masivas porque se encuentra en estado ${periodRow.status} (CU-ADM-007).`,
      );
    }

    const locationCodes = [...new Set(dto.rows.map((row) => row.locationCode.trim()))];
    const deptCodes = [...new Set(dto.rows.map((row) => row.parentDepartmentCode.trim()))];
    const sectionCodes = [...new Set(dto.rows.map((row) => row.sectionCode.trim()))];

    const [locations, departments, sections, existingAssignments] = await Promise.all([
      this.dataSource.query<NodeDbRow[]>(
        `SELECT n.id, n.external_code, n.business_structure_id
         FROM zd_core.structure_node n
         WHERE n.external_code = ANY($1::varchar[])`,
        [locationCodes],
      ),
      this.dataSource.query<NodeDbRow[]>(
        `SELECT n.id, n.external_code, n.business_structure_id, lt.code AS level_type
         FROM zd_core.structure_node n
         JOIN zd_config.level_type lt ON lt.id = n.level_type_id
         WHERE n.external_code = ANY($1::varchar[])`,
        [deptCodes],
      ),
      this.dataSource.query<SectionDbRow[]>(
        `SELECT id, external_code AS code, name FROM zd_ref.section_reference WHERE external_code = ANY($1::varchar[])`,
        [sectionCodes],
      ),
      this.dataSource.query<AssignmentDbRow[]>(
        `SELECT gsa.section_id, sr.external_code AS section_code, gsa.department_node_id, gsa.commercial_group_id
         FROM zd_core.group_section_assignment gsa
         JOIN zd_ref.section_reference sr ON sr.id = gsa.section_id
         WHERE gsa.status = 'ACTIVE' AND sr.external_code = ANY($1::varchar[])`,
        [sectionCodes],
      ),
    ]);

    const locationMap = new Map<string, NodeDbRow>(
      locations.map((location) => [location.external_code, location]),
    );
    const deptMap = new Map<string, NodeDbRow>(
      departments.map((department) => [department.external_code, department]),
    );
    const sectionMap = new Map<string, SectionDbRow>(
      sections.map((section) => [section.code, section]),
    );
    const existingAssignMap = new Map<string, AssignmentDbRow>(
      existingAssignments.map((assignment) => [assignment.section_code, assignment]),
    );

    const errors: BatchImportValidationErrorDto[] = [];
    const seenSectionsInPayload = new Set<string>();

    dto.rows.forEach((row, index) => {
      const rowNumber = index + 1;

      if (!locationMap.has(row.locationCode.trim())) {
        errors.push({
          rowNumber,
          field: "locationCode",
          value: row.locationCode,
          message: `La tienda/ubicación ${row.locationCode} no existe en el catálogo maestro.`,
        });
      }

      const dept = deptMap.get(row.parentDepartmentCode.trim());
      if (!dept) {
        errors.push({
          rowNumber,
          field: "parentDepartmentCode",
          value: row.parentDepartmentCode,
          message: `El departamento ${row.parentDepartmentCode} no existe en la estructura.`,
        });
      } else if (dept.level_type && dept.level_type !== "DEPARTMENT") {
        errors.push({
          rowNumber,
          field: "parentDepartmentCode",
          value: row.parentDepartmentCode,
          message: `El nodo ${row.parentDepartmentCode} no es de nivel DEPARTMENT (es ${dept.level_type}).`,
        });
      }

      const section = sectionMap.get(row.sectionCode.trim());
      if (!section) {
        errors.push({
          rowNumber,
          field: "sectionCode",
          value: row.sectionCode,
          message: `La sección ${row.sectionCode} no existe en el catálogo maestro de secciones.`,
        });
      }

      if (seenSectionsInPayload.has(row.sectionCode.trim())) {
        errors.push({
          rowNumber,
          field: "sectionCode",
          value: row.sectionCode,
          message: `La sección ${row.sectionCode} está duplicada dentro del archivo (RN-010).`,
        });
      } else {
        seenSectionsInPayload.add(row.sectionCode.trim());
      }

      if (existingAssignMap.has(row.sectionCode.trim())) {
        errors.push({
          rowNumber,
          field: "sectionCode",
          value: row.sectionCode,
          message: `La sección ${row.sectionCode} ya cuenta con una asignación activa en el sistema (RN-010).`,
        });
      }
    });

    const validRowsCount = dto.rows.length - errors.length;
    const invalidRowsCount = errors.length;

    if (dto.dryRun || errors.length > 0) {
      return {
        success: errors.length === 0,
        dryRun: true,
        period: dto.period,
        validRowsCount,
        invalidRowsCount,
        processedGroupsCount: 0,
        processedAssignmentsCount: 0,
        errors,
        summary:
          errors.length === 0
            ? "Validación de layout completada sin errores. Listo para aplicar."
            : `Validación con ${errors.length} error(es). No se aplicaron modificaciones en la estructura.`,
      };
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const groupsCreated = new Set<string>();
      let assignmentsCreatedCount = 0;

      const groupMap = new Map<string, string>();

      for (const row of dto.rows) {
        const dept = deptMap.get(row.parentDepartmentCode.trim())!;
        const groupKey = `${dept.id}__${row.groupName.trim()}`;

        let groupId = groupMap.get(groupKey);

        if (!groupId) {
          const existingGroups = await manager.query<{ id: string }[]>(
            `SELECT id FROM zd_core.commercial_group 
             WHERE department_node_id = $1 AND name = $2 AND status = 'ACTIVE' LIMIT 1`,
            [dept.id, row.groupName.trim()],
          );

          if (existingGroups[0]) {
            groupId = existingGroups[0].id;
          } else {
            const seqResult = await manager.query<{ next_seq: number }[]>(
              `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq 
               FROM zd_core.commercial_group 
               WHERE department_node_id = $1 FOR UPDATE`,
              [dept.id],
            );
            const sequenceNumber = Number(seqResult[0]?.next_seq ?? 1);
            const displayCode = String(sequenceNumber).padStart(2, "0");

            const insertResult = await manager.query<{ id: string }[]>(
              `INSERT INTO zd_core.commercial_group (
                business_structure_id, department_node_id, sequence_number, display_code, name, effective_start, status, version, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6::date, 'ACTIVE', 0, $7) RETURNING id`,
              [
                dept.business_structure_id,
                dept.id,
                sequenceNumber,
                displayCode,
                row.groupName.trim(),
                `${dto.period}-01`,
                actorUserId ?? null,
              ],
            );

            groupId = insertResult[0].id;
            groupsCreated.add(groupId);
          }
          groupMap.set(groupKey, groupId);
        }

        const section = sectionMap.get(row.sectionCode.trim())!;

        await manager.query(
          `INSERT INTO zd_core.group_section_assignment (
            business_structure_id, department_node_id, commercial_group_id, section_id, assignment_origin, effective_start, status, version, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6::date, 'ACTIVE', 0, $7)`,
          [
            dept.business_structure_id,
            dept.id,
            groupId,
            section.id,
            row.assignmentOrigin,
            `${dto.period}-01`,
            actorUserId ?? null,
          ],
        );
        assignmentsCreatedCount++;

        await manager.query(
          `UPDATE zd_core.department_structure_state 
           SET version = version + 1, updated_at = NOW() 
           WHERE department_node_id = $1`,
          [dept.id],
        );
      }

      await this.auditRepository.append(manager, {
        actorType: AuditActorType.USER,
        userId: actorUserId ?? null,
        technicalPrincipal: "batch-import.service",
        eventCategory: AuditEventCategory.INTEGRATION,
        action: AuditAction.BATCH_IMPORT_EXECUTED,
        entityType: "BATCH_IMPORT",
        entityId: null,
        roleContext: { service: "BatchImportService", period: dto.period },
        scopeContext: { fileName: dto.fileName, period: dto.period },
        beforeValue: null,
        afterValue: {
          fileName: dto.fileName,
          period: dto.period,
          totalRows: dto.rows.length,
          groupsAffected: groupMap.size,
          assignmentsCreated: assignmentsCreatedCount,
        },
        result: AuditResult.SUCCESS,
        correlationId: `batch-${Date.now()}`,
      });

      return {
        success: true,
        dryRun: false,
        period: dto.period,
        validRowsCount: dto.rows.length,
        invalidRowsCount: 0,
        processedGroupsCount: groupMap.size,
        processedAssignmentsCount: assignmentsCreatedCount,
        errors: [],
        summary: `Carga masiva aplicada exitosamente. Se crearon/asignaron ${assignmentsCreatedCount} secciones en ${groupMap.size} grupos comerciales para el periodo ${dto.period}.`,
      };
    });
  }
}
