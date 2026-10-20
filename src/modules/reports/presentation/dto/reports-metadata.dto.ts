import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReportColumnMetadataDto {
  @ApiProperty({ description: "Clave única de la columna", example: "location" })
  key!: string;

  @ApiProperty({ description: "Etiqueta visible para el usuario", example: "Tienda / Ubicación" })
  label!: string;

  @ApiProperty({
    description: "Categoría del campo (estructura, puestosPersonas, relaciones)",
    example: "estructura",
    enum: ["estructura", "puestosPersonas", "relaciones"],
  })
  category!: "estructura" | "puestosPersonas" | "relaciones";

  @ApiProperty({ description: "Descripción y regla de cálculo de la columna" })
  description!: string;

  @ApiProperty({ description: "Tipo de dato", example: "STRING" })
  type!: "STRING" | "NUMBER" | "DATE" | "BOOLEAN" | "ENUM";

  @ApiProperty({ description: "Indica si la columna contiene información sensible", example: false })
  sensitive!: boolean;

  @ApiPropertyOptional({ description: "Indica si es un campo técnico obligatorio en toda proyección (CA-03)", example: false })
  mandatoryTechnical?: boolean;
}

export class ReportsMetadataResponseDto {
  @ApiProperty({ description: "Categorías de columnas disponibles", example: ["estructura", "puestosPersonas", "relaciones"] })
  categories!: string[];

  @ApiProperty({ type: [ReportColumnMetadataDto], description: "Listado de columnas autorizadas según permisos y sensibilidad" })
  columns!: ReportColumnMetadataDto[];
}

export class AuthorizedFilterOptionDto {
  @ApiProperty({ example: "loc-001" })
  id!: string;

  @ApiProperty({ example: "0001" })
  code!: string;

  @ApiProperty({ example: "Liverpool Insurgentes" })
  name!: string;
}

export class AuthorizedFilterOptionsResponseDto {
  @ApiProperty({ description: "Indica si se autoseleccionó una única ubicación autorizada (FA-01)" })
  autoSelectedSingleLocation!: boolean;

  @ApiPropertyOptional({ description: "ID de la única ubicación autoseleccionada (FA-01)" })
  autoSelectedLocationId?: string;

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  locations!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  managements!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  departments!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  groups!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  sections!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  positions!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  jobFunctions!: AuthorizedFilterOptionDto[];

  @ApiProperty({ type: [AuthorizedFilterOptionDto] })
  centers!: AuthorizedFilterOptionDto[];
}
