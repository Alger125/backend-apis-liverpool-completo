import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogItemDto {
  @ApiProperty({ description: "UUID del evento de auditoría" })
  id!: string;

  @ApiProperty({ description: "Fecha y hora en que ocurrió el movimiento (ISO-8601)" })
  modifiedAt!: string;

  @ApiProperty({ description: "Nombre completo del usuario que realizó la acción" })
  actorFullName!: string;

  @ApiPropertyOptional({ description: "Identificador del usuario (UUID o null)" })
  actorUserId!: string | null;

  @ApiPropertyOptional({ description: "Nombre de usuario o identificador de red" })
  actorUsername!: string | null;

  @ApiProperty({ description: "Rol o contexto con el que se ejecutó la acción" })
  actorRole!: string;

  @ApiProperty({ description: "Acción de negocio ejecutada" })
  action!: string;

  @ApiPropertyOptional({ description: "Tipo de entidad modificada" })
  entityType!: string | null;

  @ApiProperty({ description: "Nombre visible del elemento afectado" })
  entityDisplayName!: string;

  @ApiProperty({ description: "Fecha efectiva del cambio (YYYY-MM-DD o ISO)" })
  effectiveDate!: string;

  @ApiProperty({ description: "Resultado de la operación (SUCCESS / FAILURE)" })
  result!: string;
}

export class AuditLogDetailDto extends AuditLogItemDto {
  @ApiPropertyOptional({ description: "Estado o valor previo a la modificación" })
  previousValue!: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: "Nuevo estado o valor posterior a la modificación" })
  newValue!: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: "Motivo, ticket o justificación de la acción" })
  reason!: string | null;

  @ApiPropertyOptional({ description: "Origen o canal técnico de la solicitud" })
  source!: string | null;

  @ApiPropertyOptional({ description: "Identificador de correlación distribuida" })
  correlationId!: string | null;
}

export class AuditLogsPaginatedResponseDto {
  @ApiProperty({ type: [AuditLogItemDto], description: "Listado de eventos de auditoría" })
  items!: AuditLogItemDto[];

  @ApiProperty({ description: "Total de registros encontrados" })
  total!: number;

  @ApiProperty({ description: "Página actual" })
  page!: number;

  @ApiProperty({ description: "Tamaño de página" })
  limit!: number;

  @ApiPropertyOptional({ description: "Mensaje informativo cuando no hay resultados" })
  message?: string;
}
