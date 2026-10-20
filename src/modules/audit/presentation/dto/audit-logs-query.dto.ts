import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class AuditLogsQueryDto {
  @ApiPropertyOptional({
    description: "Fecha inicial del rango de búsqueda (YYYY-MM-DD)",
    example: "2026-10-01",
  })
  @IsOptional()
  @IsDateString({}, { message: "startDate debe tener formato YYYY-MM-DD" })
  startDate?: string;

  @ApiPropertyOptional({
    description: "Fecha final del rango de búsqueda (YYYY-MM-DD)",
    example: "2026-10-31",
  })
  @IsOptional()
  @IsDateString({}, { message: "endDate debe tener formato YYYY-MM-DD" })
  endDate?: string;

  @ApiPropertyOptional({
    description: "ID de la ubicación/tienda para filtrar movimientos de su tramo",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @IsOptional()
  @IsUUID("all", { message: "locationId debe ser un UUID válido" })
  locationId?: string;

  @ApiPropertyOptional({
    description: "Acción de auditoría ejecutada",
    example: "SECTION_MOVED",
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: "Tipo de entidad afectada (GROUP, SECTION, DEPARTMENT, ROLE, etc.)",
    example: "SECTION",
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: "ID del usuario ejecutor",
    example: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
  })
  @IsOptional()
  @IsUUID("all", { message: "actorUserId debe ser un UUID válido" })
  actorUserId?: string;

  @ApiPropertyOptional({
    description: "Término de búsqueda por nombre o correo del usuario",
    example: "Edgar",
  })
  @IsOptional()
  @IsString()
  userSearch?: string;

  @ApiPropertyOptional({
    description: "Número de página (1-indexed)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page debe ser un número entero" })
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: "Cantidad de elementos por página",
    default: 20,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit debe ser un número entero" })
  @Min(1)
  @Max(200)
  limit: number = 20;
}
