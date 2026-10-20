import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/**
 * HU-48 / HU-49 (HU-047 / H06): Inicialización / derivación copy-on-write de estructura futura (mes + 1)
 */
export class InitFutureDraftDto {
  @ApiProperty({
    description: "Periodo futuro objetivo a derivar (formato YYYY-MM, ej. 2026-11)",
    example: "2026-11",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "targetPeriod debe tener formato YYYY-MM (ej. 2026-11)" })
  targetPeriod!: string;

  @ApiPropertyOptional({
    description: "Periodo origen desde el cual clonar la estructura (por defecto el periodo vigente OPEN)",
    example: "2026-10",
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "sourcePeriod debe tener formato YYYY-MM (ej. 2026-10)" })
  sourcePeriod?: string;
}

/**
 * HU-049 (CU-ADM-006 A5): Programación y edición de cambios programados antes de su entrada en vigor
 */
export class CreateScheduledChangeDto {
  @ApiProperty({
    description: "UUID del departamento comercial donde aplica el cambio programado",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({
    description: "Periodo futuro objetivo (YYYY-MM)",
    example: "2026-11",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "targetPeriod debe tener formato YYYY-MM" })
  targetPeriod!: string;

  @ApiProperty({
    description: "Fecha efectiva de entrada en vigor (YYYY-MM-DD)",
    example: "2026-11-01",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "effectiveDate debe tener formato YYYY-MM-DD" })
  effectiveDate!: string;

  @ApiProperty({
    description: "Tipo de cambio estructural programado",
    enum: ["GROUP_CREATE", "GROUP_RENAME", "SECTION_MOVE", "SECTION_ASSIGN", "SECTION_UNASSIGN"],
    example: "SECTION_MOVE",
  })
  @IsString()
  @IsIn(["GROUP_CREATE", "GROUP_RENAME", "SECTION_MOVE", "SECTION_ASSIGN", "SECTION_UNASSIGN"])
  changeType!: "GROUP_CREATE" | "GROUP_RENAME" | "SECTION_MOVE" | "SECTION_ASSIGN" | "SECTION_UNASSIGN";

  @ApiPropertyOptional({
    description: "UUID de la sección comercial involucrada (si aplica)",
    example: "244c4790-517c-5b2d-bd46-8e2ae2ae035f",
  })
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({
    description: "UUID del grupo comercial destino (si aplica)",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @IsUUID()
  @IsOptional()
  targetGroupId?: string;

  @ApiPropertyOptional({
    description: "Nombre propuesto de grupo (para GROUP_CREATE o GROUP_RENAME)",
    example: "Grupo Temporada Navideña",
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  proposedGroupName?: string;
}

export class UpdateScheduledChangeDto {
  @ApiPropertyOptional({
    description: "Nueva fecha efectiva de entrada en vigor (YYYY-MM-DD, antes de su vigencia)",
    example: "2026-11-05",
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "effectiveDate debe tener formato YYYY-MM-DD" })
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Nuevo UUID del grupo comercial destino",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @IsUUID()
  @IsOptional()
  targetGroupId?: string;

  @ApiPropertyOptional({
    description: "Nuevo nombre propuesto de grupo",
    example: "Grupo Especial Fin de Año",
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  proposedGroupName?: string;
}

/**
 * HU-050 (CU-ADM-006 A6): Cancelación de cambio programado antes de su fecha de vigencia
 */
export class CancelScheduledChangeDto {
  @ApiPropertyOptional({
    description: "Motivo de cancelación del cambio programado para bitácora de auditoría",
    example: "Ajuste de estrategia comercial previo al inicio de mes",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

/**
 * HU-051: Activación de estructura planificada al llegar su fecha de vigencia
 */
export class ActivatePeriodDto {
  @ApiPropertyOptional({
    description: "Indica si se debe disparar el recálculo y sincronización de secciones administradas",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  recalculateManagedSections?: boolean = true;

  @ApiPropertyOptional({
    description: "Notas de activación del periodo operativo",
    example: "Activación automática de inicio de mes operativo",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * HU-052 (ERF §7): Configuración del calendario operativo de corte (días naturales y bloqueo por cálculo)
 */
export class UpdateOperationalCutoffConfigDto {
  @ApiProperty({
    description: "Periodo operativo a configurar (YYYY-MM)",
    example: "2026-10",
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "period debe tener formato YYYY-MM" })
  period!: string;

  @ApiProperty({
    description: "Ventana permitida en días naturales previos al cierre para edición y programación (1 a 31)",
    example: 15,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  editingWindowDays!: number;

  @ApiProperty({
    description: "Día del mes de corte operativo (1 a 31)",
    example: 25,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  cutoffDayOfMonth!: number;

  @ApiPropertyOptional({
    description: "Bandera de bloqueo durante el cálculo de planes (true = bloquea edición con 423 Locked)",
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isLockedByCalculation?: boolean = false;
}
