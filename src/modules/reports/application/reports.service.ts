import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuditRepository } from "../../audit/infrastructure/audit.repository";
import {
  AuditAction,
  AuditActorType,
  AuditEventCategory,
  AuditResult,
} from "../../audit/domain/enums";
import { ColumnProjectionService } from "./column-projection.service";
import { ExportFormatterService } from "./export-formatter.service";
import {
  ReportCompensationsQueryDto,
  ReportExportQueryDto,
  ReportGeneralQueryDto,
  ReportRoleBasedQueryDto,
} from "../presentation/dto/report-query.dto";
import {
  EffectiveScopeSummaryDto,
  ReportPreviewResponseDto,
} from "../presentation/dto/report-response.dto";
import { AuthorizedFilterOptionsResponseDto } from "../presentation/dto/reports-metadata.dto";

interface PeriodRow {
  id: string;
  year: number;
  month: number;
  status: string;
  start_date: string;
  end_date: string;
}

interface SnapshotRow {
  id: string;
  effective_date: string;
  status: string;
}

interface RawReportDataRow {
  effectiveDate: string;
  zone: string;
  zoneId?: string;
  location: string;
  locationId?: string;
  centerCode: string;
  management: string;
  managementId?: string;
  department: string;
  departmentId?: string;
  group: string;
  groupId?: string;
  sectionId: string;
  sectionName: string;
  positionId: string;
  positionName: string;
  jobFunction: string;
  employeeId: string;
  employeeName: string;
  leaderName: string;
  isVacant: boolean;
  anchorSection: boolean;
  managedSections: number;
  assignmentOrigin: string;
  status: string;
}

interface ReportFilterCriteria {
  zoneId?: string;
  locationId?: string;
  managementId?: string;
  departmentId?: string;
  groupId?: string;
  sectionId?: string;
  centerCode?: string;
  employeeId?: string;
  employeeNumber?: string;
  positionId?: string;
  jobFunction?: string;
  collaborator?: string;
  authorizedNodeIds?: string[];
  isGlobalScope?: boolean;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly columnProjection: ColumnProjectionService,
    private readonly exportFormatter: ExportFormatterService,
    private readonly auditRepository: AuditRepository,
  ) {}

  private validateDates(startDate?: string, endDate?: string): void {
    // CU-EST-002 Flujo Principal paso 11: Validar que el rango esté completo cuando se envía una de las dos fechas
    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new BadRequestException(
        "El rango de fechas está incompleto. Debe especificar tanto la fecha inicial como la fecha final.",
      );
    }

    // FE-02: La fecha inicial es mayor que la fecha final
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }
  }

  private async resolvePeriodInfo(
    startDate?: string,
    endDate?: string,
    periodParam?: string,
  ): Promise<{
    period: string;
    startDate?: string;
    endDate?: string;
    isHistorical: boolean;
    isProjection: boolean;
    periodId?: string;
  }> {
    this.validateDates(startDate, endDate);

    let period = periodParam;
    if (!period && startDate) {
      period = startDate.slice(0, 7);
    }
    // FA-02: Si no especifica un rango de fechas, utiliza el período vigente por defecto
    if (!period) {
      period = "2026-10";
    }

    const [yearStr, monthStr] = period.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // CA-04 / FE-05: Ventana histórica máxima de 5 años previos respecto al año vigente (2026 -> 2021)
    if (year < 2021) {
      throw new NotFoundException(
        "No existe información histórica para el rango de fechas seleccionado.",
      );
    }

    const periods = await this.dataSource.query<PeriodRow[]>(
      `SELECT id, year, month, status, start_date, end_date 
       FROM zd_plan.operational_period 
       WHERE year = $1 AND month = $2`,
      [year, month],
    );

    const periodRow = periods[0];
    const isHistorical = periodRow
      ? periodRow.status === "HISTORICAL" || periodRow.status === "CLOSED"
      : period < "2026-10";

    const isProjection = periodRow
      ? periodRow.status === "PUBLISHED" || period > "2026-10"
      : period > "2026-10";

    return {
      period,
      startDate,
      endDate,
      isHistorical,
      isProjection,
      periodId: periodRow?.id,
    };
  }

  /**
   * CU-EST-002: Verifica el estado de sincronización con Employee Central (FE-06).
   */
  private async verifyEmployeeCentralSync(userId?: string): Promise<void> {
    try {
      const failedSyncRows = await this.dataSource.query<{ critical_failure: boolean }[]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_schema = 'zd_integration' AND table_name = 'ec_sync_status'
         ) AS has_table`,
      );
      if (failedSyncRows[0] && (failedSyncRows[0] as unknown as { has_table: boolean }).has_table) {
        const statusRows = await this.dataSource.query<{ status: string }[]>(
          `SELECT status FROM zd_integration.ec_sync_status WHERE status = 'CRITICAL_FAILURE' LIMIT 1`,
        );
        if (statusRows.length > 0) {
          await this.auditRepository.append(this.dataSource.manager, {
            actorType: AuditActorType.USER,
            userId: userId ?? null,
            technicalPrincipal: "reports.service",
            eventCategory: AuditEventCategory.REPORTING,
            action: AuditAction.REPORT_EXPORTED,
            entityType: "REPORT",
            entityId: null,
            roleContext: { error: "EC_SYNC_FAILURE" },
            scopeContext: {},
            beforeValue: null,
            afterValue: null,
            result: AuditResult.FAILURE,
            correlationId: `rep-ec-err-${Date.now()}`,
          });
          throw new ServiceUnavailableException(
            "La información más reciente no se encuentra disponible por una falla de sincronización.",
          );
        }
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      // Si la tabla opcional de estado de EC no existe en este esquema, continuar normalmente
    }
  }

  /**
   * CU-EST-002 (Flujo Principal pasos 5-8, FA-01, FA-05, CA-05, CA-09, Asignación por excepción y Múltiples roles):
   * Calcula el alcance efectivo uniendo los roles activos y las excepciones individuales vigentes del usuario.
   */
  private async resolveEffectiveScope(
    userId: string | undefined,
    requestedLocationId?: string,
  ): Promise<EffectiveScopeSummaryDto> {
    if (!userId) {
      return {
        isGlobal: true,
        authorizedNodeIds: [],
        autoSelectedSingleLocation: false,
        appliedLocationId: requestedLocationId,
        activeExceptionsCount: 0,
      };
    }

    const scopes = await this.dataSource.query<{ scope_type: string; structure_node_id: string }[]>(
      `SELECT s.scope_type, s.structure_node_id 
       FROM zd_security.user_role_assignment ura
       JOIN zd_security.assignment_scope asg ON asg.user_role_assignment_id = ura.id
       JOIN zd_security.access_scope s ON s.id = asg.access_scope_id
       WHERE ura.user_id = $1::uuid AND ura.status = 'ACTIVE'`,
      [userId],
    );

    let activeExceptionsCount = 0;
    try {
      const exceptionScopes = await this.dataSource.query<{ structure_node_id: string | null }[]>(
        `SELECT s.structure_node_id
         FROM zd_security.user_permission_exception upe
         LEFT JOIN zd_security.access_scope s ON s.id = upe.access_scope_id
         WHERE upe.user_id = $1::uuid
           AND upe.status = 'ACTIVE'
           AND (upe.expires_at IS NULL OR upe.expires_at > NOW())`,
        [userId],
      );
      activeExceptionsCount = exceptionScopes.length;
      for (const exc of exceptionScopes) {
        if (exc.structure_node_id) {
          scopes.push({
            scope_type: "EXCEPTION_NODE",
            structure_node_id: exc.structure_node_id,
          });
        }
      }
    } catch {
      // Fallback silencioso si la tabla opcional de alcance de excepción no aplica en este entorno
    }

    if (scopes.length === 0) {
      return {
        isGlobal: true,
        authorizedNodeIds: [],
        autoSelectedSingleLocation: false,
        appliedLocationId: requestedLocationId,
        activeExceptionsCount,
      };
    }

    const hasGlobal = scopes.some((s) => s.scope_type === "GLOBAL");
    if (hasGlobal) {
      return {
        isGlobal: true,
        authorizedNodeIds: [],
        autoSelectedSingleLocation: false,
        appliedLocationId: requestedLocationId,
        activeExceptionsCount,
      };
    }

    const authorizedNodeIds = Array.from(
      new Set(
        scopes
          .filter((s) => Boolean(s.structure_node_id))
          .map((s) => s.structure_node_id),
      ),
    );

    // CA-09: Si el usuario solicita un nodo fuera de su alcance, rechazar con 403
    if (requestedLocationId && !authorizedNodeIds.includes(requestedLocationId)) {
      throw new ForbiddenException(
        "Ubicación fuera de su tramo de control autorizado.",
      );
    }

    // FA-01: Si el usuario tiene acceso a una única ubicación y no especificó locationId, autoseleccionarla
    const autoSelectedSingleLocation =
      !requestedLocationId && authorizedNodeIds.length === 1;
    const appliedLocationId =
      requestedLocationId ??
      (autoSelectedSingleLocation ? authorizedNodeIds[0] : undefined);

    return {
      isGlobal: false,
      authorizedNodeIds,
      autoSelectedSingleLocation,
      appliedLocationId,
      activeExceptionsCount,
    };
  }

  /**
   * CU-EST-002 (Regla "Opciones acotadas" y FA-01):
   * Devuelve únicamente los valores de filtros autorizados dentro del alcance efectivo del usuario.
   */
  async getAuthorizedFilterOptions(
    userId?: string,
  ): Promise<AuthorizedFilterOptionsResponseDto> {
    const scope = await this.resolveEffectiveScope(userId);
    const rows = await this.fetchActiveStructureData(
      { period: "2026-10", isProjection: false },
      {
        locationId: scope.appliedLocationId,
        authorizedNodeIds: scope.authorizedNodeIds,
        isGlobalScope: scope.isGlobal,
      },
    );

    const uniqueBy = (
      items: { id: string; code: string; name: string }[],
    ): { id: string; code: string; name: string }[] => {
      const seen = new Map<string, { id: string; code: string; name: string }>();
      for (const item of items) {
        if (item.id && !seen.has(item.id)) {
          seen.set(item.id, item);
        }
      }
      return Array.from(seen.values());
    };

    return {
      autoSelectedSingleLocation: scope.autoSelectedSingleLocation,
      autoSelectedLocationId: scope.appliedLocationId,
      locations: uniqueBy(
        rows.map((r) => ({
          id: r.locationId ?? r.location,
          code: r.centerCode ?? "0001",
          name: r.location,
        })),
      ),
      managements: uniqueBy(
        rows.map((r) => ({
          id: r.managementId ?? r.management,
          code: r.management,
          name: r.management,
        })),
      ),
      departments: uniqueBy(
        rows.map((r) => ({
          id: r.departmentId ?? r.department,
          code: r.department,
          name: r.department,
        })),
      ),
      groups: uniqueBy(
        rows.map((r) => ({
          id: r.groupId ?? r.group,
          code: r.group,
          name: r.group,
        })),
      ),
      sections: uniqueBy(
        rows.map((r) => ({
          id: r.sectionId,
          code: r.sectionId,
          name: r.sectionName,
        })),
      ),
      positions: uniqueBy(
        rows.map((r) => ({
          id: r.positionId,
          code: r.positionId,
          name: r.positionName,
        })),
      ),
      jobFunctions: uniqueBy(
        rows.map((r) => ({
          id: r.jobFunction,
          code: r.jobFunction,
          name: r.jobFunction,
        })),
      ),
      centers: uniqueBy(
        rows.map((r) => ({
          id: r.centerCode,
          code: r.centerCode,
          name: `Centro ${r.centerCode} - ${r.location}`,
        })),
      ),
    };
  }

  async getRoleBasedReport(
    query: ReportRoleBasedQueryDto,
    userPermissions: string[],
    userId?: string,
  ): Promise<ReportPreviewResponseDto> {
    // FE-01: Validar permiso de visualización de reporte por rol
    const canViewRoleReport =
      userPermissions.includes("REPORTS_VIEW") ||
      userPermissions.includes("REPORTS_ROLE_VIEW");
    if (userPermissions.length > 0 && !canViewRoleReport) {
      throw new ForbiddenException(
        "No cuenta con permisos para generar este reporte.",
      );
    }

    // FE-06: Verificar estado de sincronización con Employee Central
    await this.verifyEmployeeCentralSync(userId);

    // Flujo Principal pasos 5-8, FA-01, CA-09: Calcular alcance efectivo
    const effectiveScope = await this.resolveEffectiveScope(
      userId,
      query.locationId,
    );

    const periodInfo = await this.resolvePeriodInfo(
      query.startDate,
      query.endDate,
      query.period,
    );

    // CA-02, CA-03, CA-10: Resolver columnas autorizadas según permisos y sensibilidad
    const selectedColumns = this.columnProjection.resolveColumns(
      query.columns,
      query.selectAll,
      userPermissions,
      query.requireColumnSelection,
    );

    const rawRows = await this.fetchRawReportData(periodInfo, {
      ...query,
      locationId: effectiveScope.appliedLocationId,
      authorizedNodeIds: effectiveScope.authorizedNodeIds,
      isGlobalScope: effectiveScope.isGlobal,
    });

    const total = rawRows.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const pagedRaw = rawRows.slice(offset, offset + limit);
    const items = pagedRaw.map((row) =>
      this.columnProjection.projectRow(
        row as unknown as Record<string, unknown>,
        selectedColumns,
      ),
    );

    const canExport =
      userPermissions.includes("REPORTS_EXPORT") ||
      userPermissions.includes("REPORTS_DOWNLOAD_CSV");

    return {
      metadata: {
        reportType: "ROLE_BASED",
        period: periodInfo.period,
        startDate: periodInfo.startDate,
        endDate: periodInfo.endDate,
        isHistorical: periodInfo.isHistorical,
        isProjection: periodInfo.isProjection,
        generatedAt: new Date().toISOString(),
        appliedColumns: selectedColumns,
        effectiveScope,
        exportCapabilities: {
          canDownloadCsv:
            canExport || userPermissions.includes("REPORTS_DOWNLOAD_CSV"),
          canDownloadTxt:
            canExport || userPermissions.includes("REPORTS_DOWNLOAD_TXT"),
        },
      },
      items,
      total,
      page,
      limit,
      // FE-03: Mensaje exacto requerido por CU-EST-002 cuando no existen datos
      message:
        total === 0
          ? "No se encontraron datos para los filtros seleccionados."
          : undefined,
    };
  }

  async getGeneralReport(
    query: ReportGeneralQueryDto,
    userPermissions: string[],
    userId?: string,
  ): Promise<ReportPreviewResponseDto> {
    if (!userPermissions.includes("REPORTS_GLOBAL_VIEW")) {
      throw new ForbiddenException(
        "No cuentas con permiso para generar el Reporte General.",
      );
    }

    await this.verifyEmployeeCentralSync(userId);
    const effectiveScope = await this.resolveEffectiveScope(
      userId,
      query.locationId,
    );

    const periodInfo = await this.resolvePeriodInfo(
      query.startDate,
      query.endDate,
      query.period,
    );

    const selectedColumns = this.columnProjection.resolveColumns(
      query.columns,
      query.selectAll,
      userPermissions,
      query.requireColumnSelection,
    );

    const rawRows = await this.fetchRawReportData(periodInfo, {
      ...query,
      locationId: effectiveScope.appliedLocationId,
      authorizedNodeIds: effectiveScope.authorizedNodeIds,
      isGlobalScope: effectiveScope.isGlobal,
    });

    const total = rawRows.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const pagedRaw = rawRows.slice(offset, offset + limit);
    const items = pagedRaw.map((row) =>
      this.columnProjection.projectRow(
        row as unknown as Record<string, unknown>,
        selectedColumns,
      ),
    );

    const canExport =
      userPermissions.includes("REPORTS_EXPORT") ||
      userPermissions.includes("REPORTS_DOWNLOAD_CSV");

    return {
      metadata: {
        reportType: "GENERAL",
        period: periodInfo.period,
        startDate: periodInfo.startDate,
        endDate: periodInfo.endDate,
        isHistorical: periodInfo.isHistorical,
        isProjection: periodInfo.isProjection,
        generatedAt: new Date().toISOString(),
        appliedColumns: selectedColumns,
        effectiveScope,
        exportCapabilities: {
          canDownloadCsv: canExport,
          canDownloadTxt: canExport,
        },
      },
      items,
      total,
      page,
      limit,
      message:
        total === 0
          ? "No se encontraron datos para los filtros seleccionados."
          : undefined,
    };
  }

  async getCompensationsReport(
    query: ReportCompensationsQueryDto,
    userPermissions: string[],
    userId?: string,
  ): Promise<ReportPreviewResponseDto> {
    const hasGlobal = userPermissions.includes("REPORTS_GLOBAL_VIEW");
    const hasComp = userPermissions.includes("REPORTS_COMPENSATIONS_VIEW");
    if (!hasGlobal && !hasComp) {
      throw new ForbiddenException(
        "No cuentas con permiso para generar el Reporte de Compensaciones.",
      );
    }

    const effectiveScope = await this.resolveEffectiveScope(
      userId,
      query.locationId,
    );

    const periodInfo = await this.resolvePeriodInfo(
      undefined,
      undefined,
      query.period,
    );

    const rawRows = await this.fetchRawReportData(periodInfo, {
      locationId: effectiveScope.appliedLocationId,
      authorizedNodeIds: effectiveScope.authorizedNodeIds,
      isGlobalScope: effectiveScope.isGlobal,
    });

    const compensationsColumns = [
      "effectiveDate",
      "location",
      "department",
      "positionId",
      "positionName",
      "employeeId",
      "employeeName",
      "leaderName",
      "sectionId",
      "sectionName",
      "anchorSection",
      "managedSections",
      "assignmentOrigin",
      "status",
    ];

    const total = rawRows.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const pagedRaw = rawRows.slice(offset, offset + limit);
    const items = pagedRaw.map((row) =>
      this.columnProjection.projectRow(
        row as unknown as Record<string, unknown>,
        compensationsColumns,
      ),
    );

    return {
      metadata: {
        reportType: `COMPENSATIONS_${query.variant}`,
        period: periodInfo.period,
        isHistorical: periodInfo.isHistorical,
        isProjection: periodInfo.isProjection,
        generatedAt: new Date().toISOString(),
        appliedColumns: compensationsColumns,
        effectiveScope,
      },
      items,
      total,
      page,
      limit,
    };
  }

  async exportReport(
    query: ReportExportQueryDto,
    format: "CSV" | "TXT",
    userPermissions: string[],
    userId?: string,
  ): Promise<{ filename: string; content: string; contentType: string }> {
    const hasExport =
      userPermissions.includes("REPORTS_EXPORT") ||
      userPermissions.includes("REPORTS_DOWNLOAD_CSV") ||
      (format === "TXT" && userPermissions.includes("REPORTS_DOWNLOAD_TXT"));

    // CA-08 / FE-01: Bloquear descarga si solo tiene permiso de visualización
    if (!hasExport) {
      throw new ForbiddenException(
        "Puedes visualizar el reporte, pero no tienes permiso para descargarlo.",
      );
    }

    if (
      query.reportType === "GENERAL" &&
      !userPermissions.includes("REPORTS_GLOBAL_VIEW")
    ) {
      throw new ForbiddenException(
        "No cuentas con permiso para generar el Reporte General.",
      );
    }

    await this.verifyEmployeeCentralSync(userId);

    const effectiveScope = await this.resolveEffectiveScope(
      userId,
      query.locationId,
    );

    const periodInfo = await this.resolvePeriodInfo(
      query.startDate,
      query.endDate,
      query.period,
    );

    // Consistencia de exportación: aplicar exactamente el mismo alcance, fechas, filtros y columnas autorizadas
    const columns = this.columnProjection.resolveColumns(
      query.columns,
      query.selectAll,
      userPermissions,
      query.requireColumnSelection,
    );

    const rawRows = await this.fetchRawReportData(periodInfo, {
      ...query,
      locationId: effectiveScope.appliedLocationId,
      authorizedNodeIds: effectiveScope.authorizedNodeIds,
      isGlobalScope: effectiveScope.isGlobal,
    });

    try {
      const projectedRows = rawRows.map((rawRow) =>
        this.columnProjection.projectRow(
          rawRow as unknown as Record<string, unknown>,
          columns,
        ),
      );

      const extension = format === "CSV" ? "csv" : "txt";
      const filename = `zdeptos_reporte_${query.reportType.toLowerCase()}_${periodInfo.period}.${extension}`;

      const content =
        format === "CSV"
          ? this.exportFormatter.toCsv(projectedRows, columns)
          : this.exportFormatter.toPipeDelimitedTxt(projectedRows, columns);

      const contentType =
        format === "CSV"
          ? "text/csv; charset=utf-8"
          : "text/plain; charset=utf-8";

      // Registrar descarga en bitácora de auditoría (CU-EST-002 paso 29)
      await this.auditRepository.append(this.dataSource.manager, {
        actorType: AuditActorType.USER,
        userId: userId ?? null,
        technicalPrincipal: "reports.service",
        eventCategory: AuditEventCategory.REPORTING,
        action: AuditAction.REPORT_EXPORTED,
        entityType: "REPORT",
        entityId: null,
        roleContext: { reportType: query.reportType, format },
        scopeContext: {
          period: periodInfo.period,
          startDate: periodInfo.startDate ?? null,
          endDate: periodInfo.endDate ?? null,
          locationId: effectiveScope.appliedLocationId ?? null,
          autoSelectedSingleLocation: effectiveScope.autoSelectedSingleLocation,
        },
        beforeValue: null,
        afterValue: {
          reportType: query.reportType,
          format,
          period: periodInfo.period,
          rowsExported: projectedRows.length,
          columnsCount: columns.length,
        },
        result: AuditResult.SUCCESS,
        correlationId: `rep-exp-${Date.now()}`,
      });

      return {
        filename,
        content,
        contentType,
      };
    } catch (error) {
      // FE-04: Error durante la generación del archivo -> registrar incidente y lanzar mensaje oficial
      await this.auditRepository.append(this.dataSource.manager, {
        actorType: AuditActorType.USER,
        userId: userId ?? null,
        technicalPrincipal: "reports.service",
        eventCategory: AuditEventCategory.REPORTING,
        action: AuditAction.REPORT_EXPORTED,
        entityType: "REPORT",
        entityId: null,
        roleContext: { reportType: query.reportType, format },
        scopeContext: {
          period: periodInfo.period,
          locationId: effectiveScope.appliedLocationId ?? null,
        },
        beforeValue: null,
        afterValue: null,
        result: AuditResult.FAILURE,
        correlationId: `rep-exp-err-${Date.now()}`,
      });

      throw new InternalServerErrorException(
        "No fue posible generar el reporte. Intente nuevamente.",
      );
    }
  }

  /**
   * Aplica en memoria la intersección obligatoria de todos los filtros de pantalla de CU-EST-002:
   * Ubicación, Gerencia, Departamento, Grupo, Sección, Centro, Número de empleado, Posición, Función y Colaborador,
   * además del recorte por alcance efectivo (FA-05).
   */
  private applyScreenFilters(
    rows: RawReportDataRow[],
    filter: ReportFilterCriteria,
  ): RawReportDataRow[] {
    const empFilter = (filter.employeeNumber ?? filter.employeeId)?.trim().toLowerCase();
    const collabFilter = filter.collaborator?.trim().toLowerCase();
    const posFilter = filter.positionId?.trim().toLowerCase();
    const funcFilter = filter.jobFunction?.trim().toLowerCase();
    const centerFilter = filter.centerCode?.trim().toLowerCase();
    const groupFilter = filter.groupId?.trim().toLowerCase();
    const sectionFilter = filter.sectionId?.trim().toLowerCase();
    const mgtFilter = filter.managementId?.trim().toLowerCase();
    const zoneFilter = filter.zoneId?.trim().toLowerCase();

    return rows.filter((row) => {
      // FA-05: Excluir registros fuera del alcance autorizado cuando el usuario no es global
      if (
        filter.isGlobalScope === false &&
        filter.authorizedNodeIds &&
        filter.authorizedNodeIds.length > 0
      ) {
        const nodeMatches =
          (row.locationId && filter.authorizedNodeIds.includes(row.locationId)) ||
          (row.departmentId && filter.authorizedNodeIds.includes(row.departmentId)) ||
          filter.authorizedNodeIds.includes(row.location);
        if (!nodeMatches) {
          return false;
        }
      }

      if (
        zoneFilter &&
        row.zoneId?.toLowerCase() !== zoneFilter &&
        !row.zone.toLowerCase().includes(zoneFilter)
      ) {
        return false;
      }

      if (
        mgtFilter &&
        row.managementId?.toLowerCase() !== mgtFilter &&
        !row.management.toLowerCase().includes(mgtFilter)
      ) {
        return false;
      }

      if (
        groupFilter &&
        row.groupId?.toLowerCase() !== groupFilter &&
        !row.group.toLowerCase().includes(groupFilter)
      ) {
        return false;
      }

      if (
        sectionFilter &&
        row.sectionId.toLowerCase() !== sectionFilter &&
        !row.sectionName.toLowerCase().includes(sectionFilter)
      ) {
        return false;
      }

      if (centerFilter && row.centerCode?.toLowerCase() !== centerFilter) {
        return false;
      }

      if (empFilter && !row.employeeId.toLowerCase().includes(empFilter)) {
        return false;
      }

      if (
        posFilter &&
        row.positionId.toLowerCase() !== posFilter &&
        !row.positionName.toLowerCase().includes(posFilter)
      ) {
        return false;
      }

      if (funcFilter && row.jobFunction?.toLowerCase() !== funcFilter) {
        return false;
      }

      if (
        collabFilter &&
        !row.employeeName.toLowerCase().includes(collabFilter) &&
        !row.employeeId.toLowerCase().includes(collabFilter) &&
        !row.leaderName.toLowerCase().includes(collabFilter)
      ) {
        return false;
      }

      return true;
    });
  }

  private async fetchRawReportData(
    periodInfo: {
      period: string;
      isHistorical: boolean;
      isProjection: boolean;
      periodId?: string;
    },
    filter: ReportFilterCriteria,
  ): Promise<RawReportDataRow[]> {
    const rows = periodInfo.isHistorical
      ? await this.fetchHistoricalSnapshotData(periodInfo, filter)
      : await this.fetchActiveStructureData(periodInfo, filter);

    return this.applyScreenFilters(rows, filter);
  }

  private async fetchHistoricalSnapshotData(
    periodInfo: { period: string; periodId?: string },
    filter: ReportFilterCriteria,
  ): Promise<RawReportDataRow[]> {
    if (!periodInfo.periodId) {
      throw new NotFoundException(
        "No existe información histórica para el rango de fechas seleccionado.",
      );
    }

    const snapshots = await this.dataSource.query<SnapshotRow[]>(
      `SELECT id, effective_date, status 
       FROM zd_reporting.structure_snapshot 
       WHERE operational_period_id = $1 AND status = 'AVAILABLE'`,
      [periodInfo.periodId],
    );

    const snapshot = snapshots[0];
    if (!snapshot) {
      // HU-060 / FE-05: NUNCA sustituir silenciosamente por actual.
      throw new NotFoundException(
        "No existe información histórica para el rango de fechas seleccionado.",
      );
    }

    const conditions: string[] = ["sa.snapshot_id = $1::uuid"];
    const params: unknown[] = [snapshot.id];
    let paramIndex = 2;

    if (filter.departmentId) {
      conditions.push(`sa.department_code = $${paramIndex}`);
      params.push(filter.departmentId);
      paramIndex++;
    }

    const sql = `
      SELECT 
        sa.id,
        $${paramIndex}::varchar AS "effectiveDate",
        'Zona Histórica' AS "zone",
        COALESCE(sn.display_name, 'Almacén Liverpool') AS "location",
        '0001' AS "centerCode",
        'Gerencia General' AS "management",
        COALESCE(sa.department_name, sa.department_code) AS "department",
        COALESCE(sa.group_name, sa.group_code) AS "group",
        sa.section_code AS "sectionId",
        sa.section_name AS "sectionName",
        sa.position_code AS "positionId",
        sa.position_name AS "positionName",
        'COMERCIAL' AS "jobFunction",
        sa.employee_number AS "employeeId",
        sa.employee_name AS "employeeName",
        'Líder Titular' AS "leaderName",
        sa.is_vacant AS "isVacant",
        sa.anchor_section AS "anchorSection",
        1 AS "managedSections",
        sa.origin_type AS "assignmentOrigin",
        'ACTIVE' AS "status"
      FROM zd_reporting.snapshot_assignment sa
      LEFT JOIN zd_reporting.snapshot_node sn ON sn.id = sa.snapshot_node_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY sa.department_name, sa.group_name, sa.section_name
    `;

    params.push(snapshot.effective_date);

    return this.dataSource.query<RawReportDataRow[]>(sql, params);
  }

  private async fetchActiveStructureData(
    periodInfo: { period: string; isProjection: boolean },
    filter: ReportFilterCriteria,
  ): Promise<RawReportDataRow[]> {
    const conditions: string[] = ["gsa.status = 'ACTIVE'", "cg.status = 'ACTIVE'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.locationId) {
      conditions.push(`loc.id = $${paramIndex}::uuid`);
      params.push(filter.locationId);
      paramIndex++;
    }

    if (filter.departmentId) {
      conditions.push(`dep.id = $${paramIndex}::uuid`);
      params.push(filter.departmentId);
      paramIndex++;
    }

    const sql = `
      SELECT 
        $${paramIndex}::varchar AS "effectiveDate",
        COALESCE(z.display_name, 'Zona Centro') AS "zone",
        z.id AS "zoneId",
        COALESCE(loc.display_name, 'Almacén Liverpool') AS "location",
        loc.id AS "locationId",
        COALESCE(loc.external_code, '0001') AS "centerCode",
        COALESCE(mgt.display_name, 'Gerencia General') AS "management",
        mgt.id AS "managementId",
        dep.display_name AS "department",
        dep.id AS "departmentId",
        cg.name AS "group",
        cg.id AS "groupId",
        sr.external_code AS "sectionId",
        sr.name AS "sectionName",
        'POS-001' AS "positionId",
        'Vendedor Especializado' AS "positionName",
        'COMERCIAL' AS "jobFunction",
        'EMP-001' AS "employeeId",
        'Colaborador Asignado' AS "employeeName",
        'Jefe de Departamento' AS "leaderName",
        false AS "isVacant",
        (gsa.assignment_origin = 'ANCHOR') AS "anchorSection",
        1 AS "managedSections",
        gsa.assignment_origin AS "assignmentOrigin",
        gsa.status AS "status"
      FROM zd_core.group_section_assignment gsa
      JOIN zd_core.commercial_group cg ON cg.id = gsa.commercial_group_id
      JOIN zd_core.structure_node dep ON dep.id = cg.department_node_id
      JOIN zd_ref.section_reference sr ON sr.id = gsa.section_id
      LEFT JOIN zd_core.structure_node_relation rel_dep ON rel_dep.child_node_id = dep.id AND rel_dep.status = 'ACTIVE'
      LEFT JOIN zd_core.structure_node mgt ON mgt.id = rel_dep.parent_node_id
      LEFT JOIN zd_core.structure_node_relation rel_mgt ON rel_mgt.child_node_id = mgt.id AND rel_mgt.status = 'ACTIVE'
      LEFT JOIN zd_core.structure_node loc ON loc.id = COALESCE(rel_mgt.parent_node_id, mgt.id)
      LEFT JOIN zd_core.structure_node_relation rel_loc ON rel_loc.child_node_id = loc.id AND rel_loc.status = 'ACTIVE'
      LEFT JOIN zd_core.structure_node z ON z.id = rel_loc.parent_node_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY dep.display_name, cg.name, sr.name
    `;

    params.push(`${periodInfo.period}-01`);

    return this.dataSource.query<RawReportDataRow[]>(sql, params);
  }
}
