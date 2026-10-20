import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";

export class BatchImportRowDto {
  @ApiProperty({ description: "Código de tienda o ubicación", example: "LOC-001" })
  @IsString()
  @IsNotEmpty({ message: "locationCode es requerido" })
  locationCode!: string;

  @ApiProperty({ description: "Código del departamento padre", example: "DEP-001" })
  @IsString()
  @IsNotEmpty({ message: "parentDepartmentCode es requerido" })
  parentDepartmentCode!: string;

  @ApiProperty({ description: "Nombre del grupo comercial", example: "Grupo Belleza 1" })
  @IsString()
  @IsNotEmpty({ message: "groupName es requerido" })
  groupName!: string;

  @ApiPropertyOptional({ description: "Código de grupo sugerido o autonumerado", example: "01" })
  @IsOptional()
  @IsString()
  groupCode?: string;

  @ApiProperty({ description: "Código de sección del catálogo maestro", example: "SEC-001" })
  @IsString()
  @IsNotEmpty({ message: "sectionCode es requerido" })
  sectionCode!: string;

  @ApiProperty({
    description: "Origen de la asignación (INITIAL_LOAD o ANCHOR)",
    example: "INITIAL_LOAD",
    enum: ["INITIAL_LOAD", "ANCHOR"],
  })
  @IsString()
  @IsIn(["INITIAL_LOAD", "ANCHOR"], {
    message: "assignmentOrigin debe ser INITIAL_LOAD o ANCHOR",
  })
  assignmentOrigin!: "INITIAL_LOAD" | "ANCHOR";
}

export class BatchImportDto {
  @ApiProperty({
    description: "Nombre del archivo de origen (.csv o .txt admitidos - CA-CIN-004)",
    example: "carga_inicial_tiendas_2026_10.csv",
  })
  @IsString()
  @IsNotEmpty({ message: "fileName es requerido" })
  fileName!: string;

  @ApiProperty({
    description: "Si es true, valida todas las reglas sin persistir cambios en la base de datos",
    example: true,
  })
  @IsBoolean()
  dryRun!: boolean;

  @ApiProperty({
    description: "Periodo operativo objetivo (YYYY-MM)",
    example: "2026-10",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: "period debe tener el formato YYYY-MM",
  })
  period!: string;

  @ApiProperty({
    description: "Filas de asignación a cargar",
    type: [BatchImportRowDto],
  })
  @IsArray()
  @ArrayNotEmpty({ message: "El archivo o conjunto de filas no puede estar vacío" })
  @ValidateNested({ each: true })
  @Type(() => BatchImportRowDto)
  rows!: BatchImportRowDto[];
}

export class BatchImportValidationErrorDto {
  @ApiProperty({ description: "Número de fila en el archivo (1-indexed)", example: 2 })
  rowNumber!: number;

  @ApiProperty({ description: "Campo con error", example: "sectionCode" })
  field!: string;

  @ApiPropertyOptional({ description: "Valor rechazado", example: "SEC-INVALID" })
  value?: unknown;

  @ApiProperty({ description: "Descripción del error", example: "La sección no existe en el catálogo maestro." })
  message!: string;
}

export class BatchImportResultDto {
  @ApiProperty({ description: "Indica si la operación fue exitosa", example: true })
  success!: boolean;

  @ApiProperty({ description: "Indica si fue una corrida de prueba (dryRun)", example: false })
  dryRun!: boolean;

  @ApiProperty({ description: "Periodo objetivo", example: "2026-10" })
  period!: string;

  @ApiProperty({ description: "Cantidad de filas válidas procesadas", example: 15 })
  validRowsCount!: number;

  @ApiProperty({ description: "Cantidad de filas con error", example: 0 })
  invalidRowsCount!: number;

  @ApiProperty({ description: "Cantidad de grupos creados o actualizados", example: 3 })
  processedGroupsCount!: number;

  @ApiProperty({ description: "Cantidad de asignaciones de sección generadas", example: 15 })
  processedAssignmentsCount!: number;

  @ApiProperty({
    type: [BatchImportValidationErrorDto],
    description: "Lista de errores detallados por fila",
  })
  errors!: BatchImportValidationErrorDto[];

  @ApiProperty({ description: "Resumen textual del resultado" })
  summary!: string;
}
