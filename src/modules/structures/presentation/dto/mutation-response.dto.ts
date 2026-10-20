import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CommercialGroupCreatedResponseDto {
  @ApiProperty({
    description: "UUID del grupo recién creado",
    example: "6c8d990d-df90-4157-8396-da1d0e778e9e",
  })
  id!: string;

  @ApiProperty({
    description: "UUID de la estructura de negocio (zd_core.business_structure)",
    example: "d9ef730c-f2d8-54a0-abbe-30c9400dbe3f",
  })
  businessStructureId!: string;

  @ApiProperty({
    description: "UUID del departamento comercial padre",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  departmentNodeId!: string;

  @ApiProperty({
    description: "Número correlativo autogenerado por secuencia del departamento",
    example: 3,
  })
  sequenceNumber!: number;

  @ApiProperty({
    description: "Código de visualización autonumerado garantizado (Grupo 001, 002...)",
    example: "Grupo 003",
  })
  displayCode!: string;

  @ApiProperty({
    description: "Nombre descriptivo asignado al grupo",
    example: "Grupo Perfumería Especial",
  })
  name!: string;

  @ApiProperty({
    description: "Fecha de inicio de vigencia (vigencia temporal)",
    example: "2026-10-13",
  })
  effectiveStart!: string;

  @ApiPropertyOptional({
    description: "Fecha de fin de vigencia (null si está vigente)",
    example: null,
    nullable: true,
  })
  effectiveEnd!: string | null;

  @ApiProperty({
    description: "Estado operativo del grupo",
    example: "ACTIVE",
  })
  status!: string;

  @ApiProperty({
    description: "Versión de la entidad para control de concurrencia",
    example: "0",
  })
  version!: string;

  @ApiPropertyOptional({
    description: "UUID del usuario que creó el registro",
    example: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
    nullable: true,
  })
  createdBy!: string | null;

  @ApiProperty({
    description: "Marca temporal de creación en base de datos",
    example: "2026-10-13T19:34:56.074Z",
  })
  createdAt!: Date;
}

export class DeleteGroupResponseDto {
  @ApiProperty({
    description: "Mensaje de confirmación del borrado lógico",
    example: "Grupo Grupo 005 inactivado correctamente.",
  })
  message!: string;

  @ApiProperty({
    description: "Cantidad de secciones comerciales virtuales que fueron desvinculadas",
    example: 0,
  })
  releasedSectionsCount!: number;
}

export class MoveSectionResponseDto {
  @ApiProperty({
    description: "Mensaje confirmando la reubicación exitosa",
    example: "Sección reubicada exitosamente.",
  })
  message!: string;

  @ApiProperty({
    description: "UUID de la sección que fue movida",
    example: "244c4790-517c-5b2d-bd46-8e2ae2ae035f",
  })
  sectionId!: string;

  @ApiProperty({
    description: "UUID del nuevo grupo operativo al que quedó adscrita",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  newGroupId!: string;
}

export class AssignSectionResponseDto {
  @ApiProperty({
    description: "Mensaje de confirmación de asignación",
    example: "Sección asignada exitosamente al grupo operativo.",
  })
  message!: string;

  @ApiProperty({
    description: "UUID de la nueva asignación registrada",
    example: "e6f8b1c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
  })
  assignmentId!: string;

  @ApiProperty({
    description: "UUID del grupo receptor",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  groupId!: string;

  @ApiProperty({
    description: "UUID de la sección asignada",
    example: "53dd523e-c6fe-5e99-8f44-620acb432a62",
  })
  sectionId!: string;

  @ApiProperty({
    description: "Código externo de la sección asignada",
    example: "DEMO-SEC-041",
  })
  sectionCode!: string;

  @ApiProperty({
    description: "Origen asignado",
    example: "MANUAL",
  })
  assignmentOrigin!: string;

  @ApiProperty({
    description: "Nueva versión del departamento tras la mutación",
    example: 2,
  })
  newDepartmentVersion!: number;
}

export class UnassignSectionResponseDto {
  @ApiProperty({
    description: "Mensaje de confirmación de desasignación",
    example: "Sección desasignada exitosamente del grupo. Retornó al catálogo de disponibles.",
  })
  message!: string;

  @ApiProperty({
    description: "UUID del grupo del que se retiró la sección",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  groupId!: string;

  @ApiProperty({
    description: "UUID de la sección liberada",
    example: "53dd523e-c6fe-5e99-8f44-620acb432a62",
  })
  sectionId!: string;

  @ApiProperty({
    description: "Nueva versión del departamento tras la mutación",
    example: 3,
  })
  newDepartmentVersion!: number;
}

export class OperationalCutoffResponseDto {
  @ApiProperty({
    description: "Código del periodo operativo consultado (YYYY-MM)",
    example: "2026-10",
  })
  periodCode!: string;

  @ApiProperty({
    description: "Estado del periodo operativo",
    enum: ["OPEN", "HISTORICAL", "CLOSED"],
    example: "OPEN",
  })
  status!: string;

  @ApiProperty({
    description: "Fecha y hora de inicio de la ventana de edición",
    example: "2026-09-15T06:00:00.000Z",
  })
  editingStart!: string;

  @ApiProperty({
    description: "Fecha y hora límite de corte operativo",
    example: "2026-10-01T05:59:59.000Z",
  })
  editingEnd!: string;

  @ApiProperty({
    description: "Indica si el periodo admite ediciones de estructura actualmente",
    example: true,
  })
  isEditable!: boolean;

  @ApiProperty({
    description: "Días restantes antes del corte operativo (0 si ya cerró)",
    example: 12,
  })
  daysRemaining!: number;

  @ApiProperty({
    description: "Fecha límite de corte formateada",
    example: "2026-10-01",
  })
  cutoffDate!: string;
}

export class PublishDepartmentResponseDto {
  @ApiProperty({
    description: "Mensaje de confirmación de publicación de la estructura",
    example: "Estructura departamental publicada y confirmada exitosamente.",
  })
  message!: string;

  @ApiProperty({
    description: "UUID del departamento publicado",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  departmentId!: string;

  @ApiProperty({
    description: "Código del periodo operativo para el que se publicó",
    example: "2026-10",
  })
  periodCode!: string;

  @ApiProperty({
    description: "Versión confirmada de la estructura departamental",
    example: 4,
  })
  version!: number;

  @ApiProperty({
    description: "Marca temporal de la publicación",
    example: "2026-10-13T20:15:00.000Z",
  })
  publishedAt!: string;

  @ApiProperty({
    description: "Total de grupos operativos activos confirmados",
    example: 2,
  })
  totalGroups!: number;

  @ApiProperty({
    description: "Total de secciones comerciales adscritas confirmadas",
    example: 4,
  })
  totalSections!: number;
}
