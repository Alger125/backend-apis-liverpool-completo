import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SectionResponseDto {
  @ApiProperty({
    description: "UUID de la sección en catálogo de referencia (zd_ref.section_reference)",
    example: "39a5a133-10f6-59a6-bccc-fb193f12b2eb",
  })
  id!: string;

  @ApiProperty({
    description: "Código externo oficial de la sección (external_code)",
    example: "DEMO-SEC-001",
  })
  code!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la sección comercial",
    example: "Perfumería Fina y Cosméticos",
  })
  name!: string;

  @ApiProperty({
    description:
      "Origen de la adscripción comercial: ANCHOR (Fija/Contractual de vendedor) o INITIAL_LOAD / MANUAL / SCHEDULED (Virtuales reubicables)",
    enum: ["ANCHOR", "MANUAL", "INITIAL_LOAD", "SCHEDULED"],
    example: "ANCHOR",
  })
  assignmentOrigin!: string;

  @ApiProperty({
    description:
      "Bandera visual: true indica que la sección es un ancla fija con candado 🔒 y no puede ser arrastrada por Drag & Drop.",
    example: true,
  })
  isAnchor!: boolean;
}

export class GroupCollaboratorDto {
  @ApiProperty({
    description: "UUID del colaborador (zd_ref.employee_reference)",
    example: "6c4b435d-78bd-5e6b-9d92-413779ba0f17",
  })
  employeeId!: string;

  @ApiProperty({
    description: "Código externo de nómina / asignación de Employee Central",
    example: "DEMO-ASG-001",
  })
  assignmentIdExternal!: string;

  @ApiProperty({
    description: "Nombre completo del colaborador",
    example: "Andrea Alvarado Demo 01",
  })
  fullName!: string;

  @ApiProperty({
    description: "UUID de la posición / plaza en la estructura",
    example: "eeff7d71-24e6-581c-900b-ed6c1b20c2ef",
  })
  positionId!: string;

  @ApiProperty({
    description: "Nombre o descripción de la posición",
    example: "Posición Demo 001",
  })
  positionTitle!: string;

  @ApiProperty({
    description: "UUID de la sección ancla asociada al contrato",
    example: "39a5a133-10f6-59a6-bccc-fb193f12b2eb",
  })
  anchorSectionId!: string;

  @ApiProperty({
    description: "Código visible de la sección ancla",
    example: "DEMO-SEC-001",
  })
  anchorSectionCode!: string;

  @ApiProperty({
    description: "Nombre visible de la sección ancla",
    example: "Perfumería Fina y Cosméticos",
  })
  anchorSectionName!: string;
}

export class CommercialGroupResponseDto {
  @ApiProperty({
    description: "UUID del grupo comercial operativo",
    example: "bcaa1780-4754-5a53-ad59-08d51b541b2b",
  })
  id!: string;

  @ApiProperty({
    description: "Número secuencial correlativo dentro del departamento comercial (1, 2, 3...)",
    example: 1,
  })
  sequenceNumber!: number;

  @ApiProperty({
    description: "Código de visualización autonumerado (Grupo 001, Grupo 002...)",
    example: "DEMO-GRP-01-01",
  })
  displayCode!: string;

  @ApiProperty({
    description: "Nombre descriptivo asignado al grupo",
    example: "Grupo Belleza 1 Demo",
  })
  name!: string;

  @ApiProperty({
    description: "Lista de secciones comerciales asociadas actualmente a este grupo operativo",
    type: [SectionResponseDto],
  })
  sections!: SectionResponseDto[];

  @ApiProperty({
    description: "Colaboradores adscritos operativamente al grupo a través de sus secciones ancla",
    type: [GroupCollaboratorDto],
  })
  collaborators!: GroupCollaboratorDto[];
}

export class NodeLeaderDto {
  @ApiPropertyOptional({
    description: "UUID del colaborador líder (null si vacante)",
    example: "6c4b435d-78bd-5e6b-9d92-413779ba0f17",
    nullable: true,
  })
  employeeId?: string | null;

  @ApiProperty({
    description: "Nombre del responsable / titular del nodo",
    example: "Andrea Alvarado Demo 01",
  })
  name!: string;

  @ApiProperty({
    description: "Título oficial del puesto en la estructura",
    example: "Gerente Comercial de Zona Centro",
  })
  positionTitle!: string;

  @ApiPropertyOptional({
    description: "URL del avatar del líder",
    example: "https://ui-avatars.com/api/?name=Andrea+Alvarado",
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({
    description: "Indica si la plaza se encuentra vacante",
    example: false,
  })
  isVacant!: boolean;
}

export class TreeNodeResponseDto {
  @ApiProperty({
    description: "UUID único del nodo estructural (zd_core.structure_node)",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  id!: string;

  @ApiPropertyOptional({
    description: "Código externo de nómina / ERP (external_code)",
    example: "DEMO-LOC-001",
    nullable: true,
  })
  externalCode!: string | null;

  @ApiProperty({
    description: "Nombre descriptivo de la unidad organizacional",
    example: "Liverpool Demo Insurgentes",
  })
  displayName!: string;

  @ApiProperty({
    description: "Tipo de nivel en la jerarquía estándar de 6 niveles",
    enum: ["LOCATION", "MANAGEMENT", "DEPARTMENT", "GROUP", "SECTION"],
    example: "LOCATION",
  })
  levelType!: string;

  @ApiProperty({
    description: "Profundidad jerárquica (1 = Tienda, 2 = Gerencia, 3 = Departamento...)",
    example: 1,
  })
  depth!: number;

  @ApiPropertyOptional({
    description: "UUID del nodo padre (null para el nodo raíz consultado)",
    example: null,
    nullable: true,
  })
  parentId!: string | null;

  @ApiPropertyOptional({
    description: "Responsable titular de la unidad organizativa (compatibilidad)",
    type: NodeLeaderDto,
    nullable: true,
  })
  leader?: NodeLeaderDto | null;

  @ApiPropertyOptional({
    description: "Lista de líderes / mancuernas de la unidad organizativa (cardinalidad 0..2)",
    type: [NodeLeaderDto],
  })
  leaders?: NodeLeaderDto[];

  @ApiPropertyOptional({
    description:
      "Token de versión de concurrencia optimista para nodos tipo DEPARTMENT (CU-ADM-008 / DEC-06). Requerido en If-Match al modificar secciones.",
    example: 1,
    nullable: true,
  })
  departmentVersion?: number | null;

  @ApiPropertyOptional({
    description: "Total acumulado de secciones asociadas (anclas y virtuales) en departamentos y gerencias",
    example: 4,
  })
  aggregatedSectionsCount?: number;

  @ApiPropertyOptional({
    description: "Indica si la estructura está en modo solo lectura (periodo cerrado o histórico)",
    example: false,
  })
  isReadOnly?: boolean;

  @ApiPropertyOptional({
    description: "Código del periodo operativo consultado (ej. 2026-10)",
    example: "2026-10",
  })
  periodCode?: string;

  @ApiPropertyOptional({
    description: "Estado del periodo operativo consultado (OPEN, HISTORICAL, CLOSED)",
    example: "OPEN",
  })
  periodStatus?: string;

  @ApiPropertyOptional({
    description:
      "Contenedores de Grupos Comerciales Operativos adscritos (exclusivo para nivel DEPARTMENT)",
    type: [CommercialGroupResponseDto],
  })
  groups?: CommercialGroupResponseDto[];

  @ApiProperty({
    description: "Hijos subordinados directos en el árbol jerárquico",
    type: () => [TreeNodeResponseDto],
  })
  children!: TreeNodeResponseDto[];
}
