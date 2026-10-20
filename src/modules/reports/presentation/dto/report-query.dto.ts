import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";

export class ReportRoleBasedQueryDto {
  @ApiPropertyOptional({
    description: "Fecha inicial del rango de consulta (YYYY-MM-DD)",
    example: "2026-10-01",
  })
  @IsOptional()
  @IsDateString({}, { message: "startDate debe tener formato YYYY-MM-DD" })
  startDate?: string;

  @ApiPropertyOptional({
    description: "Fecha final del rango de consulta (YYYY-MM-DD)",
    example: "2026-10-31",
  })
  @IsOptional()
  @IsDateString({}, { message: "endDate debe tener formato YYYY-MM-DD" })
  endDate?: string;

  @ApiPropertyOptional({
    description: "Periodo mensual específico (YYYY-MM)",
    example: "2026-10",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "period debe tener formato YYYY-MM" })
  period?: string;

  @ApiPropertyOptional({ description: "ID de la Zona geográfica" })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ description: "ID o código de la Ubicación / Tienda / Almacén" })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: "ID o código de la Gerencia comercial" })
  @IsOptional()
  @IsString()
  managementId?: string;

  @ApiPropertyOptional({ description: "ID o código del Departamento comercial" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: "ID o código del Grupo comercial" })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: "ID o código de la Sección comercial" })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ description: "Centro de costos / Centro operativo (CU-EST-002 Pantalla)" })
  @IsOptional()
  @IsString()
  centerCode?: string;

  @ApiPropertyOptional({ description: "Número de empleado o ID de colaborador (CU-EST-002 Pantalla)" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Alias de número de empleado (CU-EST-002 Pantalla)" })
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @ApiPropertyOptional({ description: "ID o código de la Posición / Puesto (CU-EST-002 Pantalla)", example: "POS-001" })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ description: "Función del puesto (CU-EST-002 Pantalla)", example: "COMERCIAL" })
  @IsOptional()
  @IsString()
  jobFunction?: string;

  @ApiPropertyOptional({ description: "Nombre o búsqueda de Colaborador (CU-EST-002 Pantalla)" })
  @IsOptional()
  @IsString()
  collaborator?: string;

  @ApiPropertyOptional({
    description: "Columnas seleccionadas separadas por coma",
    example: "location,department,group,sectionName,employeeName",
  })
  @IsOptional()
  @IsString()
  columns?: string;

  @ApiPropertyOptional({
    description: "Seleccionar todas las columnas autorizadas dentro del alcance (CA-02)",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  selectAll?: boolean;

  @ApiPropertyOptional({
    description: "Exigir selección explícita de al menos una columna (CA-10)",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  requireColumnSelection?: boolean;

  @ApiPropertyOptional({ description: "Número de página (1-indexed)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: "Elementos por página", default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}

export class ReportGeneralQueryDto extends ReportRoleBasedQueryDto {
  @ApiPropertyOptional({
    description: "División o formato comercial (LIVERPOOL, SUBURBIA, COMPRAS, PAC)",
    example: "LIVERPOOL",
    enum: ["LIVERPOOL", "SUBURBIA", "COMPRAS", "PAC"],
  })
  @IsOptional()
  @IsIn(["LIVERPOOL", "SUBURBIA", "COMPRAS", "PAC"], {
    message: "division debe ser LIVERPOOL, SUBURBIA, COMPRAS o PAC",
  })
  division?: "LIVERPOOL" | "SUBURBIA" | "COMPRAS" | "PAC";
}

export class ReportCompensationsQueryDto {
  @ApiProperty({
    description: "Periodo mensual obligatorio (YYYY-MM)",
    example: "2026-10",
  })
  @IsNotEmpty({ message: "period es requerido" })
  @Matches(/^\d{4}-\d{2}$/, { message: "period debe tener formato YYYY-MM" })
  period!: string;

  @ApiProperty({
    description: "Variante de layout especializada para compensaciones y productividad",
    example: "JEFES_CON_SECCION",
    enum: [
      "JEFES_CON_SECCION",
      "GERENTES",
      "JEFES",
      "PRODUCTIVIDAD_10_COL",
      "PRODUCTIVIDAD_FILA",
      "OPERACIONES_ZDEPTOS",
    ],
  })
  @IsNotEmpty({ message: "variant es requerido" })
  @IsIn(
    [
      "JEFES_CON_SECCION",
      "GERENTES",
      "JEFES",
      "PRODUCTIVIDAD_10_COL",
      "PRODUCTIVIDAD_FILA",
      "OPERACIONES_ZDEPTOS",
    ],
    {
      message: "variant debe ser una de las variantes oficiales admitidas",
    },
  )
  variant!:
    | "JEFES_CON_SECCION"
    | "GERENTES"
    | "JEFES"
    | "PRODUCTIVIDAD_10_COL"
    | "PRODUCTIVIDAD_FILA"
    | "OPERACIONES_ZDEPTOS";

  @ApiPropertyOptional({ description: "ID de la Tienda / Almacén (opcional)" })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: "Número de página", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: "Elementos por página", default: 50, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 50;
}

export class ReportExportQueryDto extends ReportRoleBasedQueryDto {
  @ApiProperty({
    description: "Tipo de reporte a exportar",
    example: "ROLE_BASED",
    enum: ["ROLE_BASED", "GENERAL", "COMPENSATIONS"],
  })
  @IsNotEmpty({ message: "reportType es requerido" })
  @IsIn(["ROLE_BASED", "GENERAL", "COMPENSATIONS"], {
    message: "reportType debe ser ROLE_BASED, GENERAL o COMPENSATIONS",
  })
  reportType!: "ROLE_BASED" | "GENERAL" | "COMPENSATIONS";

  @ApiPropertyOptional({ description: "Variante para reporte de compensaciones" })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ description: "División comercial para reporte general" })
  @IsOptional()
  @IsString()
  division?: "LIVERPOOL" | "SUBURBIA" | "COMPRAS" | "PAC";
}
