import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

export class GetTreeQueryDto {
  @ApiProperty({
    description: "UUID de la tienda física (Location) a consultar en el árbol",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  @IsUUID()
  @IsNotEmpty()
  locationId!: string;

  @ApiPropertyOptional({
    description: "Periodo operativo (opcional, formato YYYY-MM, por defecto el periodo vigente OPEN)",
    example: "2026-10",
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "El formato del periodo debe ser YYYY-MM (ej. 2026-10)" })
  period?: string;
}

export class CreateGroupDto {
  @ApiProperty({
    description: "Nombre descriptivo del nuevo Grupo Comercial Operativo",
    example: "Grupo Perfumería Especial",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class UpdateGroupNameDto {
  @ApiProperty({
    description: "Nuevo nombre descriptivo para el Grupo Comercial",
    example: "Grupo Perfumería y Fragancias",
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class MoveSectionDto {
  @ApiProperty({
    description: "UUID de la Sección a reubicar (Debe ser virtual, origen distinto de ANCHOR)",
    example: "244c4790-517c-5b2d-bd46-8e2ae2ae035f",
  })
  @IsUUID()
  @IsNotEmpty()
  sectionId!: string;

  @ApiProperty({
    description: "UUID del Grupo Comercial destino (debe pertenecer al mismo departamento)",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @IsUUID()
  @IsNotEmpty()
  targetGroupId!: string;
}

export class AssignSectionDto {
  @ApiProperty({
    description: "UUID de la Sección disponible del catálogo de referencia a asignar",
    example: "53dd523e-c6fe-5e99-8f44-620acb432a62",
  })
  @IsUUID()
  @IsNotEmpty()
  sectionId!: string;
}

export class OperationalCutoffQueryDto {
  @ApiPropertyOptional({
    description: "Periodo operativo a consultar (formato YYYY-MM, ej. 2026-10)",
    example: "2026-10",
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "El formato del periodo debe ser YYYY-MM (ej. 2026-10)" })
  period?: string;
}

export class PublishDepartmentDto {
  @ApiPropertyOptional({
    description: "Periodo operativo a publicar (formato YYYY-MM, por defecto periodo OPEN)",
    example: "2026-10",
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "El formato del periodo debe ser YYYY-MM (ej. 2026-10)" })
  period?: string;

  @ApiPropertyOptional({
    description: "Notas o comentarios opcionales para la publicación de la estructura",
    example: "Publicación aprobada por Gerencia Comercial para temporada otoño",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
