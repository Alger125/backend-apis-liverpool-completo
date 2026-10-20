/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 03 — REPORTES DINÁMICOS, AUDITORÍA HISTÓRICA Y CARGAS MASIVAS
 * MÓDULO:   Batch Import (Plantilla Oficial y Procesamiento Masivo Transaccional)
 * HISTORIAS: HU-69 (HU-067 a HU-069) | CATÁLOGO DOMINIO 10
 * CASOS DE USO: CU-CIN-001 | MODOS: dryRun: true (Validación) / dryRun: false (Ejecución)
 * ============================================================================
 */
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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
import { BatchImportService } from "../application/batch-import.service";
import {
  BatchImportDto,
  BatchImportResultDto,
} from "./dto/batch-import.dto";
import { BatchImportLayoutResponseDto } from "./dto/batch-import-layout.dto";

@ApiTags("Feature 03: Cargas Masivas Iniciales y Layout (CU-CIN-001 / HU-69)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@UseGuards(ApiKeyGuard, PermissionsGuard)
@Controller("admin/batch-import")
export class BatchImportController {
  constructor(private readonly batchImportService: BatchImportService) {}

  @Get("layout")
  @RequirePermissions("BATCH_IMPORT_EXECUTE")
  @ApiOperation({
    summary:
      "Descargar especificación y plantilla de layout vigente (CU-CIN-001 / HU-068)",
    description:
      "Retorna el diccionario de columnas del layout oficial o la plantilla CSV descargable con cabeceras y filas de ejemplo.",
  })
  @ApiQuery({
    name: "format",
    required: false,
    enum: ["JSON", "CSV"],
    description: "Formato de respuesta deseado (JSON o CSV descargable)",
  })
  @ApiOkResponse({
    description: "Especificación de layout o archivo CSV",
    type: BatchImportLayoutResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Credencial temporal inválida" })
  @ApiForbiddenResponse({
    description: "Permiso BATCH_IMPORT_EXECUTE insuficiente",
  })
  getLayout(
    @Query("format") format: "JSON" | "CSV" = "JSON",
    @Res() res: Response,
  ): void {
    const spec = this.batchImportService.getLayoutSpecification(format);

    if (format === "CSV") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="plantilla_carga_masiva_zdeptos.csv"',
      );
      res.status(200).send(spec.templateCsv ?? "");
      return;
    }

    res.status(200).json(spec);
  }

  @Post()
  @RequirePermissions("BATCH_IMPORT_EXECUTE")
  @ApiOperation({
    summary:
      "Validar y ejecutar carga masiva inicial de grupos y secciones (HU-69 / HU-067, HU-068)",
    description:
      "Procesa la carga masiva en modo validación (dryRun=true) o aplicación transaccional ACID (dryRun=false). Valida existencia de tienda, departamento, sección en catálogo y unicidad (RN-010).",
  })
  @ApiBody({ type: BatchImportDto })
  @ApiOkResponse({
    description: "Resultado del procesamiento y reporte de validación",
    type: BatchImportResultDto,
  })
  @ApiBadRequestResponse({
    description:
      "Formato de archivo no admitido (solo .csv y .txt) o datos faltantes",
  })
  @ApiForbiddenResponse({
    description:
      "Periodo cerrado/histórico o permiso insuficiente",
  })
  async executeBatchImport(
    @Body() dto: BatchImportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<BatchImportResultDto> {
    return this.batchImportService.processBatchImport(dto, req.user?.id);
  }
}
