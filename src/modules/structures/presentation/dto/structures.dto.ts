import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

/**
 * HU-020, HU-021, HU-023 (DEC-01): Consulta de Estructura Compras y PAC con exclusión de áreas no comerciales
 */
export class GetComprasPacTreeQueryDto {
  @ApiProperty({
    description: "Tipo de estructura corporativa a consultar (COMPRAS o PAC)",
    enum: ["COMPRAS", "PAC"],
    example: "COMPRAS",
  })
  @IsString()
  @IsIn(["COMPRAS", "PAC"])
  structureType!: "COMPRAS" | "PAC";

  @ApiPropertyOptional({
    description: "Código o ID del departamento base configurado (DEC-15 / HU-022)",
    example: "DEPT-COMPRAS-HL",
  })
  @IsString()
  @IsOptional()
  baseDepartmentCode?: string;

  @ApiPropertyOptional({
    description: "Excluir unidades administrativas o de RH no comerciales (HU-023, por defecto true)",
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return true;
    if (typeof value === "boolean") return value;
    return String(value).toLowerCase() !== "false";
  })
  @IsBoolean()
  excludeNonCommercial?: boolean = true;
}

/**
 * HU-022 (DEC-15): Configuración parametrizable de departamentos base para Compras y PAC
 */
export class BaseDepartmentConfigItemDto {
  @ApiProperty({
    description: "Código externo del departamento raíz en Employee Central",
    example: "DEPT-COMPRAS-HL",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  departmentCode!: string;

  @ApiProperty({
    description: "Nombre descriptivo del departamento base",
    example: "Dirección de Compras Hardline",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName!: string;

  @ApiProperty({
    description: "Tipo de estructura a la que pertenece el departamento base",
    enum: ["COMPRAS", "PAC"],
    example: "COMPRAS",
  })
  @IsString()
  @IsIn(["COMPRAS", "PAC"])
  structureType!: "COMPRAS" | "PAC";

  @ApiPropertyOptional({
    description: "División comercial opcional (HARDLINE, SOFTLINE, OMNICANAL)",
    example: "HARDLINE",
  })
  @IsString()
  @IsOptional()
  division?: string;

  @ApiPropertyOptional({
    description: "Indica si el departamento base está activo para navegación",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateBaseDepartmentsConfigDto {
  @ApiProperty({
    description: "Lista de departamentos base configurados para Compras y PAC (DEC-15 / HU-022)",
    type: [BaseDepartmentConfigItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BaseDepartmentConfigItemDto)
  baseDepartments!: BaseDepartmentConfigItemDto[];
}

/**
 * HU-19 (HU-028 / DEC-16): Consulta de nodo intermedio Suburbia 70051507 (Asesor Especializado Experiencia Cliente)
 */
export class SuburbiaAdvisorsQueryDto {
  @ApiPropertyOptional({
    description: "UUID de la tienda Suburbia (Location) opcional",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({
    description: "UUID del departamento Suburbia opcional",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}

/**
 * HU-45 (HU-044): Evento entrante desde SuccessFactors Employee Central (Altas, Bajas, Transferencias, Cambios de Líder y Ancla)
 */
export class EcInboundEventDto {
  @ApiProperty({
    description: "Tipo de evento organizacional o de personal proveniente de Employee Central",
    enum: ["HIRE", "TERMINATION", "TRANSFER", "HEAD_OF_UNIT_CHANGE", "ANCHOR_SECTION_CHANGE"],
    example: "TRANSFER",
  })
  @IsString()
  @IsIn(["HIRE", "TERMINATION", "TRANSFER", "HEAD_OF_UNIT_CHANGE", "ANCHOR_SECTION_CHANGE"])
  eventType!: "HIRE" | "TERMINATION" | "TRANSFER" | "HEAD_OF_UNIT_CHANGE" | "ANCHOR_SECTION_CHANGE";

  @ApiProperty({
    description: "Identificador del colaborador en Employee Central o UUID interno",
    example: "EMP-900101",
  })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({
    description: "Fecha efectiva del movimiento en formato YYYY-MM-DD",
    example: "2026-10-19",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "effectiveDate debe tener formato YYYY-MM-DD" })
  effectiveDate!: string;

  @ApiPropertyOptional({
    description: "Código o UUID de la unidad organizativa / departamento destino",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @IsString()
  @IsOptional()
  organizationalUnitId?: string;

  @ApiPropertyOptional({
    description: "Código de sección ancla contractual asignada en EC",
    example: "SEC-001",
  })
  @IsString()
  @IsOptional()
  anchorSectionCode?: string;

  @ApiPropertyOptional({
    description: "ID de correlación externo enviado por CPI / Employee Central",
    example: "CPI-MSG-20261019-001",
  })
  @IsString()
  @IsOptional()
  externalEventId?: string;
}

/**
 * HU-44 (HU-045 / P-01): Sincronización de salida hacia Employee Central (Secciones que administra)
 */
export class SyncManagedSectionsRequestDto {
  @ApiProperty({
    description: "Identificador del colaborador a sincronizar con Employee Central",
    example: "EMP-900101",
  })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiPropertyOptional({
    description: "Fecha efectiva de sincronización (YYYY-MM-DD, por defecto hoy)",
    example: "2026-10-19",
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "effectiveDate debe tener formato YYYY-MM-DD" })
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Lista opcional de códigos de secciones administradas (si se omite, se calcula automáticamente desde grupos/liderazgo)",
    type: [String],
    example: ["0129", "0130", "0201"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  managedSections?: string[];
}
