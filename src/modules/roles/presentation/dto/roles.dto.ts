import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { RoleStatus } from "../../domain/role.entity";

export class SearchRolesQuery {
  @IsOptional() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(RoleStatus) status?: RoleStatus;
  @Type(() => Number) @IsInt() @Min(0) page = 0;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @Matches(/^(code|name|status|updatedAt),(asc|desc)$/) sort = "name,asc";
}

export class CreateRoleRequest {
  @IsString() @MinLength(3) @MaxLength(150) name!: string;
  @IsString() @MinLength(1) @MaxLength(500) description!: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() permissionCodes!: string[];
}

export class UpdateRoleRequest extends CreateRoleRequest {
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}

export class DeleteRoleRequest {
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}

/**
 * HU-009 (CU-SEC-002 FA-03): Crear un rol a partir de otro (Clonar rol)
 */
export class CloneRoleRequest {
  @ApiProperty({
    description: "Nombre único para el nuevo rol clonado",
    example: "Administrador Regional Norte",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    description: "Descripción funcional opcional (si se omite, reutiliza la del rol base)",
    example: "Perfil derivado del rol base para supervisión regional",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: "Códigos de permisos adicionales a agregar sobre la plantilla del rol base",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  additionalPermissionCodes?: string[];

  @ApiPropertyOptional({
    description: "Códigos de permisos a excluir respecto al rol base",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  excludedPermissionCodes?: string[];
}

export const SEGMENTATION_ATTRIBUTES = [
  "JOB_POSITION",
  "LOCATION",
  "ZONE",
  "DEPARTMENT",
  "JOB_LEVEL",
  "FUNCTION",
  "BUSINESS_DIVISION",
  "USER_EMAIL",
] as const;

export type SegmentationAttribute = (typeof SEGMENTATION_ATTRIBUTES)[number];

export const SEGMENTATION_OPERATORS = ["EQUALS", "IN", "CONTAINS"] as const;
export type SegmentationOperator = (typeof SEGMENTATION_OPERATORS)[number];

/**
 * HU-55 (HU-010 / RN-054): Regla de condición de segmentación organizacional
 */
export class SegmentationRuleItemDto {
  @ApiProperty({
    enum: SEGMENTATION_ATTRIBUTES,
    example: "JOB_POSITION",
    description: "Atributo organizacional o corporativo sobre el cual segmentar",
  })
  @IsIn(SEGMENTATION_ATTRIBUTES)
  attribute!: SegmentationAttribute;

  @ApiProperty({
    enum: SEGMENTATION_OPERATORS,
    example: "EQUALS",
  })
  @IsIn(SEGMENTATION_OPERATORS)
  operator!: SegmentationOperator;

  @ApiProperty({
    type: [String],
    example: ["Gerente de Tienda"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  values!: string[];
}

export class UpdateRoleSegmentationRequest {
  @ApiProperty({
    type: [SegmentationRuleItemDto],
    description: "Reglas de condición aplicables a la segmentación del rol (HU-55 / HU-010)",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SegmentationRuleItemDto)
  rules!: SegmentationRuleItemDto[];

  @ApiProperty({
    enum: ["GLOBAL", "DIVISION", "ZONE", "LOCATION", "DEPARTMENT", "GROUP"],
    example: "LOCATION",
    description: "Nivel de alcance operativo máximo autorizado para el rol",
  })
  @IsIn(["GLOBAL", "DIVISION", "ZONE", "LOCATION", "DEPARTMENT", "GROUP"])
  scopeLevel!: "GLOBAL" | "DIVISION" | "ZONE" | "LOCATION" | "DEPARTMENT" | "GROUP";
}
