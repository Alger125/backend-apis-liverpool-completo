import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EffectiveScopeSummaryDto {
  @ApiProperty({ description: "Indica si el usuario tiene alcance global", example: false })
  isGlobal!: boolean;

  @ApiProperty({ description: "IDs de ubicaciones/nodos autorizados (roles + excepciones vigentes)", type: [String] })
  authorizedNodeIds!: string[];

  @ApiProperty({ description: "Indica si se autoseleccionó una única ubicación autorizada (FA-01)", example: false })
  autoSelectedSingleLocation!: boolean;

  @ApiPropertyOptional({ description: "Ubicación autoseleccionada o aplicada (FA-01)" })
  appliedLocationId?: string;

  @ApiProperty({ description: "Cantidad de excepciones individuales vigentes incorporadas", example: 0 })
  activeExceptionsCount!: number;
}

export class ReportExportCapabilitiesDto {
  @ApiProperty({ description: "Indica si el usuario tiene permiso para descargar en CSV (CA-06, CA-08)" })
  canDownloadCsv!: boolean;

  @ApiProperty({ description: "Indica si el usuario tiene permiso para descargar en TXT (CA-07, CA-08)" })
  canDownloadTxt!: boolean;
}

export class ReportMetadataInfoDto {
  @ApiProperty({ description: "Tipo de reporte generado", example: "ROLE_BASED" })
  reportType!: string;

  @ApiProperty({ description: "Periodo evaluado", example: "2026-10" })
  period!: string;

  @ApiPropertyOptional({ description: "Fecha inicial aplicada (YYYY-MM-DD)" })
  startDate?: string;

  @ApiPropertyOptional({ description: "Fecha final aplicada (YYYY-MM-DD)" })
  endDate?: string;

  @ApiProperty({ description: "Indica si los datos provienen de una fotografía histórica", example: false })
  isHistorical!: boolean;

  @ApiProperty({ description: "Indica si los datos corresponden a una proyección futura (DEC-17)", example: false })
  isProjection!: boolean;

  @ApiProperty({ description: "Fecha y hora de generación (ISO-8601)" })
  generatedAt!: string;

  @ApiProperty({ description: "Columnas proyectadas en la salida", example: ["location", "department", "group", "sectionName"] })
  appliedColumns!: string[];

  @ApiPropertyOptional({ type: EffectiveScopeSummaryDto, description: "Resumen del alcance efectivo aplicado (CU-EST-002 Flujo Principal paso 8)" })
  effectiveScope?: EffectiveScopeSummaryDto;

  @ApiPropertyOptional({ type: ReportExportCapabilitiesDto, description: "Formatos de exportación habilitados según permisos del usuario (CU-EST-002 paso 24)" })
  exportCapabilities?: ReportExportCapabilitiesDto;
}

export class ReportPreviewResponseDto {
  @ApiProperty({ type: ReportMetadataInfoDto, description: "Metadatos contextuales de la consulta" })
  metadata!: ReportMetadataInfoDto;

  @ApiProperty({
    description: "Filas de resultados con columnas proyectadas dinámicamente",
    type: "array",
    items: { type: "object" },
  })
  items!: Record<string, unknown>[];

  @ApiProperty({ description: "Total de registros coincidentes" })
  total!: number;

  @ApiProperty({ description: "Página actual" })
  page!: number;

  @ApiProperty({ description: "Tamaño de página" })
  limit!: number;

  @ApiPropertyOptional({ description: "Mensaje informativo en caso de no existir resultados (FE-03)" })
  message?: string;
}
