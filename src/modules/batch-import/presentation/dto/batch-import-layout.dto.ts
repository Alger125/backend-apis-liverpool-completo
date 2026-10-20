import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LayoutColumnSpecificationDto {
  @ApiProperty({ description: "Nombre técnico de la columna", example: "locationCode" })
  technicalName!: string;

  @ApiProperty({ description: "Nombre funcional para el negocio", example: "Código de Tienda" })
  functionalName!: string;

  @ApiProperty({ description: "Descripción y propósito del campo", example: "Identificador de la tienda en SAP/ECC" })
  description!: string;

  @ApiProperty({ description: "Tipo de dato esperado (STRING, ENUM, DATE)", example: "STRING" })
  dataType!: string;

  @ApiPropertyOptional({ description: "Longitud máxima de caracteres", example: 20 })
  maxLength?: number;

  @ApiProperty({ description: "Indica si la columna es obligatoria", example: true })
  required!: boolean;

  @ApiPropertyOptional({ description: "Catálogo maestro de validación", example: "zd_core.structure_node" })
  referenceCatalog?: string;

  @ApiProperty({ description: "Valor de ejemplo válido", example: "LOC-001" })
  exampleValue!: string;
}

export class BatchImportLayoutResponseDto {
  @ApiProperty({ description: "Versión de la especificación de layout", example: "V2.1-LIVERPOOL" })
  layoutVersion!: string;

  @ApiProperty({ description: "Extensiones de archivo admitidas", example: [".csv", ".txt"] })
  allowedExtensions!: string[];

  @ApiProperty({ description: "Delimitador sugerido", example: "," })
  delimiter!: string;

  @ApiProperty({ type: [LayoutColumnSpecificationDto], description: "Especificación de columnas" })
  columns!: LayoutColumnSpecificationDto[];

  @ApiPropertyOptional({ description: "Contenido de plantilla CSV descargable" })
  templateCsv?: string;
}
