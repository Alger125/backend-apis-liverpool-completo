/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 03 — REPORTES DINÁMICOS, AUDITORÍA HISTÓRICA Y CARGAS MASIVAS
 * MÓDULO:   Reports (Reportes Dinámicos por Rol/General y Exportación CSV / TXT)
 * HISTORIAS: HU-62 a HU-67 (HU-055 a HU-063) | CATÁLOGO DOMINIO 10
 * CASOS DE USO: CU-EST-002, CU-EST-003 | DECISIONES: DEC-10, DEC-17
 * ============================================================================
 */
import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import {
  ApiKeyGuard,
  PermissionsGuard,
  RequirePermissions,
} from "../../../shared/security/security";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { ReportsService } from "../application/reports.service";
import { ColumnProjectionService } from "../application/column-projection.service";
import {
  ReportCompensationsQueryDto,
  ReportExportQueryDto,
  ReportGeneralQueryDto,
  ReportRoleBasedQueryDto,
} from "./dto/report-query.dto";
import {
  AuthorizedFilterOptionsResponseDto,
  ReportsMetadataResponseDto,
} from "./dto/reports-metadata.dto";
import { ReportPreviewResponseDto } from "./dto/report-response.dto";

@ApiTags("Feature 03: Reportes Dinámicos y Exportación CSV / TXT (CU-EST-002, CU-EST-003 / HU-62..67)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@UseGuards(ApiKeyGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly columnProjectionService: ColumnProjectionService,
  ) {}

  @Get("metadata/columns")
  @RequirePermissions("REPORTS_VIEW")
  @ApiOperation({
    summary:
      "Catálogo de Columnas y Metadatos de Reportes (CU-EST-002 / HU-62 / HU-057)",
    description:
      "Retorna el catálogo de campos seleccionables organizados en las 3 categorías funcionales (estructura, puestosPersonas y relaciones), filtrando campos sensibles según los permisos del usuario.",
  })
  @ApiOkResponse({
    description: "Catálogo de metadatos de columnas autorizadas",
    type: ReportsMetadataResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Credencial temporal inválida" })
  @ApiForbiddenResponse({ description: "Permiso REPORTS_VIEW insuficiente" })
  getMetadataColumns(
    @Req() req?: AuthenticatedRequest,
  ): ReportsMetadataResponseDto {
    return this.columnProjectionService.getMetadataCatalog(
      req?.user?.permissions,
    );
  }

  @Get("metadata/filter-options")
  @RequirePermissions("REPORTS_VIEW")
  @ApiOperation({
    summary:
      "Catálogo de Opciones de Filtros Acotadas al Alcance del Usuario (CU-EST-002 / FA-01)",
    description:
      "Retorna exclusivamente los valores autorizados de Ubicación, Gerencia, Departamento, Grupo, Sección, Posición, Función y Centro según el alcance efectivo del usuario, e indica si se autoseleccionó una única ubicación (FA-01).",
  })
  @ApiOkResponse({
    description: "Opciones de filtros acotadas al alcance del usuario",
    type: AuthorizedFilterOptionsResponseDto,
  })
  async getAuthorizedFilterOptions(
    @Req() req?: AuthenticatedRequest,
  ): Promise<AuthorizedFilterOptionsResponseDto> {
    return this.reportsService.getAuthorizedFilterOptions(req?.user?.id);
  }

  @Get("role-based")
  @RequirePermissions("REPORTS_VIEW")
  @ApiOperation({
    summary:
      "Generar Vista Previa de Reporte por Rol (CU-EST-002 / HU-63 / HU-055)",
    description:
      "Genera la vista previa paginada del reporte por rol con proyección dinámica de columnas, validando tramo de control, excepciones vigentes, autoselección de única ubicación (FA-01) y fotografías históricas sin sustitución silenciosa (FE-05).",
  })
  @ApiOkResponse({
    description: "Vista previa paginada del reporte por rol",
    type: ReportPreviewResponseDto,
  })
  @ApiBadRequestResponse({
    description: "La fecha inicial no puede ser posterior a la fecha final o falta selección de columnas.",
  })
  @ApiNotFoundResponse({
    description:
      "No existe información histórica para el rango de fechas seleccionado.",
  })
  @ApiForbiddenResponse({
    description: "Ubicación fuera de su tramo de control autorizado.",
  })
  async getRoleBasedReport(
    @Query() query: ReportRoleBasedQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReportPreviewResponseDto> {
    return this.reportsService.getRoleBasedReport(
      query,
      req.user?.permissions ?? [],
      req.user?.id,
    );
  }

  @Get("general")
  @RequirePermissions("REPORTS_GLOBAL_VIEW")
  @ApiOperation({
    summary:
      "Generar Vista Previa de Reporte General (CU-EST-003 / HU-64 / HU-056)",
    description:
      "Consulta consolidada general de la estructura comercial sobre todo el universo autorizado. Exige permiso explícito REPORTS_GLOBAL_VIEW.",
  })
  @ApiOkResponse({
    description: "Vista previa del reporte general",
    type: ReportPreviewResponseDto,
  })
  @ApiBadRequestResponse({
    description: "La fecha inicial no puede ser posterior a la fecha final.",
  })
  @ApiForbiddenResponse({
    description: "No cuentas con permiso para generar el Reporte General.",
  })
  async getGeneralReport(
    @Query() query: ReportGeneralQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReportPreviewResponseDto> {
    return this.reportsService.getGeneralReport(
      query,
      req.user?.permissions ?? [],
      req.user?.id,
    );
  }

  @Get("compensations")
  @RequirePermissions("REPORTS_VIEW")
  @ApiOperation({
    summary:
      "Reportes Especializados para Modelos de Compensaciones y Productividad (HU-67 / HU-061..063)",
    description:
      "Genera consolidado mensual de secciones ancla y gestionadas por colaborador, líder, jefe y gerente para interfaces de comisiones y productividad.",
  })
  @ApiOkResponse({
    description: "Vista previa de reporte de compensaciones",
    type: ReportPreviewResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      "No cuentas con permiso para generar el Reporte de Compensaciones.",
  })
  async getCompensationsReport(
    @Query() query: ReportCompensationsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReportPreviewResponseDto> {
    return this.reportsService.getCompensationsReport(
      query,
      req.user?.permissions ?? [],
      req.user?.id,
    );
  }

  @Get("export/csv")
  @RequirePermissions("REPORTS_VIEW")
  @ApiOperation({
    summary:
      "Exportación de Reporte en formato CSV (CU-EST-002, CU-EST-003 / HU-66 / HU-058 / DEC-10)",
    description:
      "Descarga el reporte en formato CSV delimitado por comas, preservando ceros a la izquierda para códigos SAP. Exige permiso REPORTS_EXPORT o REPORTS_DOWNLOAD_CSV.",
  })
  @ApiForbiddenResponse({
    description:
      "Puedes visualizar el reporte, pero no tienes permiso para descargarlo.",
  })
  async exportCsv(
    @Query() query: ReportExportQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportReport(
      query,
      "CSV",
      req.user?.permissions ?? [],
      req.user?.id,
    );

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.content);
  }

  @Get("export/txt")
  @RequirePermissions("REPORTS_VIEW")
  @ApiOperation({
    summary:
      "Exportación de Reporte en formato TXT delimitado por Pipes (HU-66 / HU-059 / DEC-10 / PROP-04)",
    description:
      "Descarga el archivo plano delimitado por barras (|) compatible con interfaces de SAP HCM, Productividad y Nómina.",
  })
  @ApiForbiddenResponse({
    description:
      "Puedes visualizar el reporte, pero no tienes permiso para descargarlo.",
  })
  async exportTxt(
    @Query() query: ReportExportQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportReport(
      query,
      "TXT",
      req.user?.permissions ?? [],
      req.user?.id,
    );

    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.content);
  }
}
