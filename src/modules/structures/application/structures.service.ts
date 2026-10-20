import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { AuditRepository } from "../../audit/infrastructure/audit.repository";
import {
  AuditAction,
  AuditActorType,
  AuditEventCategory,
  AuditResult,
} from "../../audit/domain/enums";
import {
  CommercialGroupEntity,
  DepartmentStructureStateEntity,
  GroupSectionAssignmentEntity,
  SectionReferenceEntity,
  StructureNodeEntity,
} from "../domain/entities";
import { PublishDepartmentDto } from "../presentation/dto/structures.dto";

export interface TreeNode {
  id: string;
  externalCode: string | null;
  displayName: string;
  levelType: string;
  depth: number;
  parentId: string | null;
  leader?: {
    employeeId?: string | null;
    name: string;
    positionTitle: string;
    avatarUrl?: string | null;
    isVacant: boolean;
  } | null;
  leaders?: Array<{
    employeeId?: string | null;
    name: string;
    positionTitle: string;
    avatarUrl?: string | null;
    isVacant: boolean;
  }>;
  departmentVersion?: number | null;
  aggregatedSectionsCount?: number;
  isReadOnly?: boolean;
  periodCode?: string;
  periodStatus?: string;
  groups?: Array<{
    id: string;
    sequenceNumber: number;
    displayCode: string;
    name: string;
    sections: Array<{
      id: string;
      code: string;
      name: string;
      assignmentOrigin: string;
      isAnchor: boolean;
    }>;
    collaborators: Array<{
      employeeId: string;
      assignmentIdExternal: string;
      fullName: string;
      positionId: string;
      positionTitle: string;
      anchorSectionId: string;
      anchorSectionCode: string;
      anchorSectionName: string;
    }>;
  }>;
  children: TreeNode[];
}

@Injectable()
export class StructuresService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditRepository: AuditRepository
  ) {}

  /**
   * =====================================================================================
   * CASO DE USO: CU-EST-001 / UC-006 / HU-14 a HU-20
   * ÁRBOL JERÁRQUICO COMERCIAL COMPLETO (6 NIVELES) CON LÍDERES, GRUPOS Y COLABORADORES
   * =====================================================================================
   */
  async getTree(locationId: string, period?: string): Promise<TreeNode> {
    // 1. Resolver el periodo operativo (HU-52 / CU-EST-001)
    const { periodId, periodCode, periodStatus, isReadOnly } =
      await this.resolveOperationalPeriod(period);

    // 2. Ejecutar consulta recursiva CTE para obtener todos los nodos bajo la ubicación
    const rawHierarchy: Array<{
      node_id: string;
      external_code: string | null;
      display_name: string;
      level_type: string;
      parent_id: string | null;
      depth: number;
    }> = await this.dataSource.query(
      `
      WITH RECURSIVE tree_hierarchy AS (
        SELECT 
          sn.id AS node_id,
          sn.external_code,
          sn.display_name,
          lt.code AS level_type,
          NULL::uuid AS parent_id,
          1 AS depth
        FROM zd_core.structure_node sn
        JOIN zd_config.level_type lt ON lt.id = sn.level_type_id
        WHERE sn.id = $1 AND sn.status = 'ACTIVE'

        UNION ALL

        SELECT 
          child.id AS node_id,
          child.external_code,
          child.display_name,
          lt.code AS level_type,
          rel.parent_node_id AS parent_id,
          th.depth + 1
        FROM zd_core.structure_node_relation rel
        JOIN zd_core.structure_node child ON child.id = rel.child_node_id
        JOIN zd_config.level_type lt ON lt.id = child.level_type_id
        JOIN tree_hierarchy th ON th.node_id = rel.parent_node_id
        WHERE rel.status = 'ACTIVE' AND child.status = 'ACTIVE'
      )
      SELECT * FROM tree_hierarchy ORDER BY depth, display_name;
      `,
      [locationId]
    );

    if (!rawHierarchy || rawHierarchy.length === 0) {
      throw new NotFoundException(`No se encontró la estructura para la ubicación ${locationId}`);
    }

    const nodeIds = rawHierarchy.map((node) => node.node_id);

    // 3. Obtener líderes y responsables para los nodos (ERF 3.1, 5.4 / CU-EST-001)
    const leadersRaw: Array<{
      node_id: string;
      employee_id: string | null;
      full_name: string | null;
      position_id: string | null;
      position_title: string | null;
      is_vacant: boolean;
    }> = await this.dataSource.query(
      `
      SELECT 
        sn.id AS node_id,
        emp.id AS employee_id,
        emp.display_name AS full_name,
        pr.id AS position_id,
        COALESCE(pr.name, 'Titular de Unidad') AS position_title,
        CASE WHEN emp.id IS NULL THEN true ELSE false END AS is_vacant
      FROM zd_core.structure_node sn
      LEFT JOIN zd_core.structure_node_binding snb ON snb.structure_node_id = sn.id
      LEFT JOIN zd_ref.ec_organizational_node eon ON eon.id = snb.organizational_node_id
      LEFT JOIN zd_ref.employee_reference emp 
        ON emp.person_id_external = REPLACE(eon.head_of_unit_external_id, 'DEMO-EMP-', 'DEMO-PER-')
        OR emp.person_id_external = eon.head_of_unit_external_id
        OR emp.assignment_id_external = eon.head_of_unit_external_id
      LEFT JOIN zd_ref.position_occupancy po ON po.employee_id = emp.id AND po.status = 'OCCUPIED'
      LEFT JOIN zd_ref.position_reference pr ON pr.id = po.position_id AND pr.status = 'ACTIVE'
      WHERE sn.id = ANY($1::uuid[]);
      `,
      [nodeIds]
    );

    const leadersByNode = new Map<
      string,
      Array<{
        employeeId: string | null;
        name: string;
        positionTitle: string;
        avatarUrl?: string | null;
        isVacant: boolean;
      }>
    >();

    for (const leader of leadersRaw) {
      if (!leadersByNode.has(leader.node_id)) {
        leadersByNode.set(leader.node_id, []);
      }
      if (leader.full_name) {
        leadersByNode.get(leader.node_id)!.push({
          employeeId: leader.employee_id,
          name: leader.full_name,
          positionTitle: leader.position_title ?? "Titular de Unidad",
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(leader.full_name)}&background=0D8ABC&color=fff`,
          isVacant: leader.is_vacant,
        });
      }
    }

    // 4. Obtener grupos comerciales y sus secciones asociadas
    const groupsRaw: Array<{
      group_id: string;
      department_node_id: string;
      sequence_number: number;
      display_code: string;
      group_name: string;
      assignment_id: string | null;
      section_id: string | null;
      section_code: string | null;
      section_name: string | null;
      assignment_origin: string | null;
    }> = await this.dataSource.query(
      `
      SELECT 
        cg.id AS group_id,
        cg.department_node_id,
        cg.sequence_number,
        cg.display_code,
        cg.name AS group_name,
        gsa.id AS assignment_id,
        sr.id AS section_id,
        sr.external_code AS section_code,
        sr.name AS section_name,
        gsa.assignment_origin
      FROM zd_core.commercial_group cg
      LEFT JOIN zd_core.group_section_assignment gsa 
        ON gsa.commercial_group_id = cg.id AND gsa.status = 'ACTIVE'
      LEFT JOIN zd_ref.section_reference sr 
        ON sr.id = gsa.section_id
      WHERE cg.department_node_id = ANY($1::uuid[]) AND cg.status = 'ACTIVE'
      ORDER BY cg.sequence_number, sr.external_code;
      `,
      [nodeIds]
    );

    // 5. Obtener colaboradores adscritos por sección ancla (CU-ADM-001)
    const collaboratorsRaw: Array<{
      group_id: string;
      employee_id: string;
      assignment_id_external: string;
      full_name: string;
      position_id: string;
      position_title: string;
      anchor_section_id: string;
      anchor_section_code: string;
      anchor_section_name: string;
    }> = await this.dataSource.query(
      `
      SELECT 
        cg.id AS group_id,
        emp.id AS employee_id,
        emp.assignment_id_external,
        emp.display_name AS full_name,
        pr.id AS position_id,
        COALESCE(pr.name, 'Vendedor de Piso') AS position_title,
        sr.id AS anchor_section_id,
        sr.external_code AS anchor_section_code,
        sr.name AS anchor_section_name
      FROM zd_core.commercial_group cg
      JOIN zd_core.group_section_assignment gsa 
        ON gsa.commercial_group_id = cg.id AND gsa.status = 'ACTIVE' AND gsa.assignment_origin = 'ANCHOR'
      JOIN zd_ref.section_reference sr 
        ON sr.id = gsa.section_id
      JOIN zd_ref.position_reference pr 
        ON pr.anchor_section_id = sr.id AND pr.status = 'ACTIVE'
      JOIN zd_ref.position_occupancy po 
        ON po.position_id = pr.id AND po.status = 'OCCUPIED'
      JOIN zd_ref.employee_reference emp 
        ON emp.id = po.employee_id AND emp.status = 'ACTIVE'
      WHERE cg.department_node_id = ANY($1::uuid[])
      ORDER BY emp.display_name;
      `,
      [nodeIds]
    );

    const collaboratorsByGroup = new Map<string, any[]>();
    for (const collaborator of collaboratorsRaw) {
      if (!collaboratorsByGroup.has(collaborator.group_id)) {
        collaboratorsByGroup.set(collaborator.group_id, []);
      }
      collaboratorsByGroup.get(collaborator.group_id)!.push({
        employeeId: collaborator.employee_id,
        assignmentIdExternal: collaborator.assignment_id_external,
        fullName: collaborator.full_name,
        positionId: collaborator.position_id,
        positionTitle: collaborator.position_title,
        anchorSectionId: collaborator.anchor_section_id,
        anchorSectionCode: collaborator.anchor_section_code,
        anchorSectionName: collaborator.anchor_section_name,
      });
    }

    // Mapear grupos por departamento
    const groupsByDept = new Map<string, Map<string, any>>();
    for (const groupRow of groupsRaw) {
      if (!groupsByDept.has(groupRow.department_node_id)) {
        groupsByDept.set(groupRow.department_node_id, new Map());
      }
      const deptGroups = groupsByDept.get(groupRow.department_node_id)!;
      if (!deptGroups.has(groupRow.group_id)) {
        deptGroups.set(groupRow.group_id, {
          id: groupRow.group_id,
          sequenceNumber: groupRow.sequence_number,
          displayCode: groupRow.display_code,
          name: groupRow.group_name,
          sections: [],
          collaborators: collaboratorsByGroup.get(groupRow.group_id) ?? [],
        });
      }
      if (groupRow.section_id) {
        deptGroups.get(groupRow.group_id).sections.push({
          id: groupRow.section_id,
          code: groupRow.section_code,
          name: groupRow.section_name,
          assignmentOrigin: groupRow.assignment_origin,
          isAnchor: groupRow.assignment_origin === "ANCHOR",
        });
      }
    }

    // 6. Obtener versiones de departamento para concurrencia optimista
    const versionsRaw: Array<{
      department_node_id: string;
      version: string;
    }> = await this.dataSource.query(
      `
      SELECT department_node_id, version 
      FROM zd_core.department_structure_state 
      WHERE department_node_id = ANY($1::uuid[])
        AND operational_period_id = $2;
      `,
      [nodeIds, periodId]
    );
    const versionsByDept = new Map<string, number>();
    for (const versionRow of versionsRaw) {
      versionsByDept.set(versionRow.department_node_id, Number(versionRow.version));
    }

    // 7. Construir los nodos en memoria y computar agregación ascendente (ERF 4.1)
    const nodeMap = new Map<string, TreeNode>();
    for (const row of rawHierarchy) {
      const deptGroupsMap = groupsByDept.get(row.node_id);
      const groupsList = deptGroupsMap ? Array.from(deptGroupsMap.values()) : [];
      const leadersList = leadersByNode.get(row.node_id) ?? [];

      let totalSectionsCount = 0;
      if (groupsList.length > 0) {
        for (const groupItem of groupsList) {
          totalSectionsCount += groupItem.sections.length;
        }
      }

      nodeMap.set(row.node_id, {
        id: row.node_id,
        externalCode: row.external_code,
        displayName: row.display_name,
        levelType: row.level_type,
        depth: row.depth,
        parentId: row.parent_id,
        leader: leadersList.length > 0 ? leadersList[0] : null,
        leaders: leadersList,
        departmentVersion:
          row.level_type === "DEPARTMENT"
            ? (versionsByDept.get(row.node_id) ?? 0)
            : null,
        aggregatedSectionsCount:
          row.level_type === "DEPARTMENT" ? totalSectionsCount : undefined,
        groups: groupsList.length > 0 ? groupsList : undefined,
        children: [],
      });
    }

    // 8. Ensamblar jerarquía padre-hijo y sumar aggregatedSectionsCount en MANAGEMENT
    let rootNode: TreeNode | null = null;
    for (const row of rawHierarchy) {
      const node = nodeMap.get(row.node_id)!;
      if (row.parent_id && nodeMap.has(row.parent_id)) {
        nodeMap.get(row.parent_id)!.children.push(node);
      } else if (!row.parent_id) {
        rootNode = node;
      }
    }

    if (!rootNode) {
      rootNode = nodeMap.get(rawHierarchy[0].node_id)!;
    }

    // Calcular agregación para MANAGEMENT sumando secciones de departamentos hijos
    this.computeAggregatedSectionsUpward(rootNode);

    // Adjuntar metadatos del periodo y solo lectura al nodo raíz
    rootNode.isReadOnly = isReadOnly;
    rootNode.periodCode = periodCode;
    rootNode.periodStatus = periodStatus;

    return rootNode;
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-15 / CU-ADM-001
   * RESUMEN DE TIENDA Y ENCABEZADO COMERCIAL
   * =====================================================================================
   */
  async getLocationSummary(locationId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT 
        loc.id AS location_id,
        loc.external_code AS location_code,
        loc.display_name AS location_name,
        zone.id AS zone_id,
        zone.display_name AS zone_name,
        bs.name AS business_structure_name
      FROM zd_core.structure_node loc
      JOIN zd_core.business_structure bs ON bs.id = loc.business_structure_id
      LEFT JOIN zd_core.structure_node_relation rel ON rel.child_node_id = loc.id AND rel.status = 'ACTIVE'
      LEFT JOIN zd_core.structure_node zone ON zone.id = rel.parent_node_id
      WHERE loc.id = $1 AND loc.status = 'ACTIVE';
      `,
      [locationId]
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`No se encontró la tienda física con ID ${locationId}`);
    }

    const row = rows[0];

    // Contar departamentos comerciales activos subordinados
    const deptCountRows = await this.dataSource.query(
      `
      WITH RECURSIVE loc_tree AS (
        SELECT sn.id, sn.level_type_id
        FROM zd_core.structure_node sn
        WHERE sn.id = $1 AND sn.status = 'ACTIVE'
        UNION ALL
        SELECT child.id, child.level_type_id
        FROM zd_core.structure_node_relation rel
        JOIN zd_core.structure_node child ON child.id = rel.child_node_id
        JOIN loc_tree lt ON lt.id = rel.parent_node_id
        WHERE rel.status = 'ACTIVE' AND child.status = 'ACTIVE'
      )
      SELECT COUNT(*) AS total_departments
      FROM loc_tree t
      JOIN zd_config.level_type lt ON lt.id = t.level_type_id
      WHERE lt.code = 'DEPARTMENT';
      `,
      [locationId]
    );

    const totalDepartments = Number(deptCountRows[0]?.total_departments ?? 0);

    return {
      id: row.location_id,
      externalCode: row.location_code ?? "",
      displayName: row.location_name,
      headerTitle: `${row.location_code ?? ""} - ${row.location_name}`.trim(),
      zoneId: row.zone_id ?? "",
      zoneName: row.zone_name ?? "Zona General",
      formatName: "Liverpool",
      totalDepartments,
    };
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-20 / CU-ADM-001
   * LISTADO DE GRUPOS DE UN DEPARTAMENTO
   * =====================================================================================
   */
  async getDepartmentGroups(departmentId: string) {
    const dept = await this.dataSource.getRepository(StructureNodeEntity).findOne({
      where: { id: departmentId, status: "ACTIVE" },
    });
    if (!dept) {
      throw new NotFoundException(`Departamento comercial ${departmentId} no encontrado`);
    }

    const groupsRaw: Array<{
      group_id: string;
      sequence_number: number;
      display_code: string;
      group_name: string;
      section_id: string | null;
      section_code: string | null;
      section_name: string | null;
      assignment_origin: string | null;
    }> = await this.dataSource.query(
      `
      SELECT 
        cg.id AS group_id,
        cg.sequence_number,
        cg.display_code,
        cg.name AS group_name,
        sr.id AS section_id,
        sr.external_code AS section_code,
        sr.name AS section_name,
        gsa.assignment_origin
      FROM zd_core.commercial_group cg
      LEFT JOIN zd_core.group_section_assignment gsa 
        ON gsa.commercial_group_id = cg.id AND gsa.status = 'ACTIVE'
      LEFT JOIN zd_ref.section_reference sr 
        ON sr.id = gsa.section_id
      WHERE cg.department_node_id = $1 AND cg.status = 'ACTIVE'
      ORDER BY cg.sequence_number, sr.external_code;
      `,
      [departmentId]
    );

    // Obtener colaboradores para los grupos de este departamento
    const collaboratorsRaw = await this.dataSource.query(
      `
      SELECT 
        cg.id AS group_id,
        emp.id AS employee_id,
        emp.assignment_id_external,
        emp.display_name AS full_name,
        pr.id AS position_id,
        COALESCE(pr.name, 'Vendedor de Piso') AS position_title,
        sr.id AS anchor_section_id,
        sr.external_code AS anchor_section_code,
        sr.name AS anchor_section_name
      FROM zd_core.commercial_group cg
      JOIN zd_core.group_section_assignment gsa 
        ON gsa.commercial_group_id = cg.id AND gsa.status = 'ACTIVE' AND gsa.assignment_origin = 'ANCHOR'
      JOIN zd_ref.section_reference sr 
        ON sr.id = gsa.section_id
      JOIN zd_ref.position_reference pr 
        ON pr.anchor_section_id = sr.id AND pr.status = 'ACTIVE'
      JOIN zd_ref.position_occupancy po 
        ON po.position_id = pr.id AND po.status = 'OCCUPIED'
      JOIN zd_ref.employee_reference emp 
        ON emp.id = po.employee_id AND emp.status = 'ACTIVE'
      WHERE cg.department_node_id = $1 AND cg.status = 'ACTIVE'
      ORDER BY emp.display_name;
      `,
      [departmentId]
    );

    const collaboratorsByGroup = new Map<string, any[]>();
    for (const collaborator of collaboratorsRaw) {
      if (!collaboratorsByGroup.has(collaborator.group_id)) {
        collaboratorsByGroup.set(collaborator.group_id, []);
      }
      collaboratorsByGroup.get(collaborator.group_id)!.push({
        employeeId: collaborator.employee_id,
        assignmentIdExternal: collaborator.assignment_id_external,
        fullName: collaborator.full_name,
        positionId: collaborator.position_id,
        positionTitle: collaborator.position_title,
        anchorSectionId: collaborator.anchor_section_id,
        anchorSectionCode: collaborator.anchor_section_code,
        anchorSectionName: collaborator.anchor_section_name,
      });
    }

    const groupsMap = new Map<string, any>();
    for (const groupRow of groupsRaw) {
      if (!groupsMap.has(groupRow.group_id)) {
        groupsMap.set(groupRow.group_id, {
          id: groupRow.group_id,
          sequenceNumber: groupRow.sequence_number,
          displayCode: groupRow.display_code,
          name: groupRow.group_name,
          sections: [],
          collaborators: collaboratorsByGroup.get(groupRow.group_id) ?? [],
        });
      }
      if (groupRow.section_id) {
        groupsMap.get(groupRow.group_id).sections.push({
          id: groupRow.section_id,
          code: groupRow.section_code,
          name: groupRow.section_name,
          assignmentOrigin: groupRow.assignment_origin,
          isAnchor: groupRow.assignment_origin === "ANCHOR",
        });
      }
    }

    return Array.from(groupsMap.values());
  }

  /**
   * =====================================================================================
   * CASO DE USO: ERF 4.1 / CU-EST-001
   * SECCIONES AGREGADAS / CONSOLIDADO ASCENDENTE DE DEPARTAMENTO
   * =====================================================================================
   */
  async getAggregatedSections(departmentId: string) {
    const dept = await this.dataSource.getRepository(StructureNodeEntity).findOne({
      where: { id: departmentId, status: "ACTIVE" },
    });
    if (!dept) {
      throw new NotFoundException(`Departamento comercial ${departmentId} no encontrado`);
    }

    const rows: Array<{
      section_id: string;
      section_code: string;
      section_name: string;
      assignment_origin: string;
      group_id: string;
      group_code: string;
      group_name: string;
      collaborators_count: string;
    }> = await this.dataSource.query(
      `
      SELECT 
        sr.id AS section_id,
        sr.external_code AS section_code,
        sr.name AS section_name,
        gsa.assignment_origin,
        cg.id AS group_id,
        cg.display_code AS group_code,
        cg.name AS group_name,
        COUNT(DISTINCT po.employee_id) AS collaborators_count
      FROM zd_core.group_section_assignment gsa
      JOIN zd_ref.section_reference sr ON sr.id = gsa.section_id
      JOIN zd_core.commercial_group cg ON cg.id = gsa.commercial_group_id AND cg.status = 'ACTIVE'
      LEFT JOIN zd_ref.position_reference pr ON pr.anchor_section_id = sr.id AND pr.status = 'ACTIVE'
      LEFT JOIN zd_ref.position_occupancy po ON po.position_id = pr.id AND po.status = 'OCCUPIED'
      WHERE gsa.department_node_id = $1 AND gsa.status = 'ACTIVE'
      GROUP BY sr.id, sr.external_code, sr.name, gsa.assignment_origin, cg.id, cg.display_code, cg.name
      ORDER BY sr.external_code;
      `,
      [departmentId]
    );

    return rows.map((sectionRow: any) => ({
      id: sectionRow.section_id,
      code: sectionRow.section_code,
      name: sectionRow.section_name,
      assignmentOrigin: sectionRow.assignment_origin,
      isAnchor: sectionRow.assignment_origin === "ANCHOR",
      groupId: sectionRow.group_id,
      groupCode: sectionRow.group_code,
      groupName: sectionRow.group_name,
      collaboratorsCount: Number(sectionRow.collaborators_count),
    }));
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-27, HU-28 / CU-ADM-004
   * CATÁLOGO DE SECCIONES DISPONIBLES NO ASIGNADAS
   * =====================================================================================
   */
  async getAvailableSections(departmentId: string) {
    const dept = await this.dataSource.getRepository(StructureNodeEntity).findOne({
      where: { id: departmentId, status: "ACTIVE" },
    });
    if (!dept) {
      throw new NotFoundException(`Departamento comercial ${departmentId} no encontrado`);
    }

    const rows = await this.dataSource.query(
      `
      SELECT 
        sr.id,
        sr.external_code,
        sr.name,
        sr.status,
        TO_CHAR(sr.effective_start, 'YYYY-MM-DD') AS effective_start
      FROM zd_ref.section_reference sr
      WHERE sr.status = 'ACTIVE'
        AND sr.id NOT IN (
          SELECT gsa.section_id 
          FROM zd_core.group_section_assignment gsa 
          WHERE gsa.status = 'ACTIVE'
        )
      ORDER BY sr.external_code;
      `
    );

    return rows.map((availableRow: any) => ({
      id: availableRow.id,
      externalCode: availableRow.external_code,
      name: availableRow.name,
      status: availableRow.status,
      effectiveStart: availableRow.effective_start,
    }));
  }

  /**
   * =====================================================================================
   * CASO DE USO: CU-ADM-002 / UC-009 / HU-21, HU-22
   * REGLA DE NEGOCIO P-02: AUTONUMERACIÓN ATÓMICA DE GRUPOS OPERATIVOS
   * =====================================================================================
   */
  async createGroup(
    departmentId: string,
    name: string,
    clientVersion?: number,
    userId?: string
  ) {
    // 1. Validar calendario operativo
    const { periodId } = await this.validateCalendarEditable();

    return this.dataSource.transaction(async (manager) => {
      const dept = await manager.getRepository(StructureNodeEntity).findOne({
        where: { id: departmentId, status: "ACTIVE" },
      });
      if (!dept) {
        throw new NotFoundException(`Departamento ${departmentId} no encontrado`);
      }

      // Validar concurrencia optimista si se envía If-Match
      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          departmentId,
          clientVersion,
          periodId
        );
      }

      // Validar nombre único en el departamento (CU-ADM-002)
      const duplicate = await manager.query(
        `
        SELECT id FROM zd_core.commercial_group 
        WHERE department_node_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND status = 'ACTIVE';
        `,
        [departmentId, name]
      );
      if (duplicate && duplicate.length > 0) {
        throw new ConflictException(
          `Ya existe un grupo comercial activo con el nombre "${name}" en este departamento.`
        );
      }

      // 2. Obtener o inicializar secuencia atómica del departamento (P-02)
      let seqRow: Array<{ next_value: number }> = await manager.query(
        `SELECT next_value FROM zd_core.department_group_sequence WHERE department_node_id = $1 FOR UPDATE;`,
        [departmentId]
      );

      let seqNumber = 1;
      if (seqRow && seqRow.length > 0) {
        seqNumber = seqRow[0].next_value;
        await manager.query(
          `UPDATE zd_core.department_group_sequence SET next_value = next_value + 1, updated_at = NOW() WHERE department_node_id = $1;`,
          [departmentId]
        );
      } else {
        await manager.query(
          `INSERT INTO zd_core.department_group_sequence (department_node_id, next_value) VALUES ($1, 2);`,
          [departmentId]
        );
      }

      const displayCode = `Grupo ${seqNumber.toString().padStart(3, "0")}`;

      // 3. Insertar el nuevo grupo
      const newGroup = manager.getRepository(CommercialGroupEntity).create({
        businessStructureId: dept.businessStructureId,
        departmentNodeId: departmentId,
        sequenceNumber: seqNumber,
        displayCode,
        name: name.trim(),
        effectiveStart: new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
        createdBy: userId || null,
      });

      const savedGroup = await manager.getRepository(CommercialGroupEntity).save(newGroup);

      // 4. Incrementar versión de concurrencia optimista del departamento (P-09 / HU-53)
      await this.bumpDepartmentVersion(manager, departmentId, periodId, userId);

      // 5. Registrar evento de auditoría
      await this.logAuditEvent(
        manager,
        AuditAction.GROUP_CREATED,
        "CommercialGroup",
        savedGroup.id,
        null,
        {
          id: savedGroup.id,
          displayCode: savedGroup.displayCode,
          name: savedGroup.name,
          departmentId,
        },
        userId
      );

      return savedGroup;
    });
  }

  /**
   * =====================================================================================
   * CU-ADM-002 / HU-23: ACTUALIZAR NOMBRE DESCRIPTIVO DEL GRUPO COMERCIAL
   * =====================================================================================
   */
  async updateGroupName(
    groupId: string,
    name: string,
    clientVersion?: number,
    userId?: string
  ) {
    const { periodId } = await this.validateCalendarEditable();

    return this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(CommercialGroupEntity).findOne({
        where: { id: groupId, status: "ACTIVE" },
      });
      if (!group) {
        throw new NotFoundException(`Grupo ${groupId} no encontrado`);
      }

      // Validar concurrencia optimista si se envió versión
      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          group.departmentNodeId,
          clientVersion,
          periodId
        );
      }

      // Validar nombre único en el departamento (CU-ADM-002)
      const duplicate = await manager.query(
        `
        SELECT id FROM zd_core.commercial_group 
        WHERE department_node_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND id != $3 AND status = 'ACTIVE';
        `,
        [group.departmentNodeId, name, groupId]
      );
      if (duplicate && duplicate.length > 0) {
        throw new ConflictException(
          `Ya existe otro grupo comercial activo con el nombre "${name}" en este departamento.`
        );
      }

      const previousName = group.name;
      group.name = name.trim();
      const savedGroup = await manager.getRepository(CommercialGroupEntity).save(group);

      // Incrementar versión del departamento
      await this.bumpDepartmentVersion(
        manager,
        group.departmentNodeId,
        periodId,
        userId
      );

      // Registrar auditoría
      await this.logAuditEvent(
        manager,
        AuditAction.GROUP_RENAMED,
        "CommercialGroup",
        group.id,
        { id: group.id, name: previousName },
        { id: group.id, name: group.name },
        userId
      );

      return savedGroup;
    });
  }

  /**
   * =====================================================================================
   * CASO DE USO: CU-ADM-003 / UC-010 / HU-24, HU-25, HU-26 / DEC-13
   * INACTIVACIÓN Y BORRADO LÓGICO DE GRUPO COMERCIAL ELEGIBLE
   * =====================================================================================
   */
  async deleteGroup(groupId: string, clientVersion?: number, userId?: string) {
    const { periodId } = await this.validateCalendarEditable();

    return this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(CommercialGroupEntity).findOne({
        where: { id: groupId, status: "ACTIVE" },
      });
      if (!group) {
        throw new NotFoundException(`Grupo ${groupId} no encontrado`);
      }

      // Validar concurrencia optimista si se envió versión
      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          group.departmentNodeId,
          clientVersion,
          periodId
        );
      }

      // Regla 1: Mínimo 1 grupo por departamento comercial (CU-ADM-003 / HU-26)
      const activeGroupsCount = await manager.getRepository(CommercialGroupEntity).count({
        where: { departmentNodeId: group.departmentNodeId, status: "ACTIVE" },
      });
      if (activeGroupsCount <= 1) {
        throw new BadRequestException(
          "No se puede eliminar el grupo: Todo departamento debe contar con al menos un grupo operativo."
        );
      }

      // Regla 2: Bloqueo si tiene secciones ancla adscritas (HU-25 / HU-37)
      const anchorAssignmentsCount = await manager
        .getRepository(GroupSectionAssignmentEntity)
        .count({
          where: { commercialGroupId: groupId, assignmentOrigin: "ANCHOR", status: "ACTIVE" },
        });
      if (anchorAssignmentsCount > 0) {
        throw new ConflictException(
          "No se puede eliminar el grupo: Contiene secciones ancla protegidas asociadas a contratos de vendedores."
        );
      }

      // Regla 3: Bloqueo si tiene colaboradores activos adscritos (CU-ADM-003)
      const collaboratorRows = await manager.query(
        `
        SELECT COUNT(*) AS count
        FROM zd_core.group_section_assignment gsa
        JOIN zd_ref.section_reference sr ON sr.id = gsa.section_id
        JOIN zd_ref.position_reference pr ON pr.anchor_section_id = sr.id AND pr.status = 'ACTIVE'
        JOIN zd_ref.position_occupancy po ON po.position_id = pr.id AND po.status = 'OCCUPIED'
        WHERE gsa.commercial_group_id = $1 AND gsa.status = 'ACTIVE';
        `,
        [groupId]
      );
      if (Number(collaboratorRows[0]?.count ?? 0) > 0) {
        throw new ConflictException(
          "No se puede eliminar el grupo: Cuenta con colaboradores activos adscritos. Debe reasignar los colaboradores antes de proceder."
        );
      }

      // 4. Desvincular secciones virtuales asociadas (regresan a catálogo disponible)
      await manager.query(
        `UPDATE zd_core.group_section_assignment 
         SET status = 'INACTIVE', 
             effective_end = CASE 
               WHEN effective_start >= CURRENT_DATE THEN effective_start + INTERVAL '1 day' 
               ELSE CURRENT_DATE 
             END 
         WHERE commercial_group_id = $1 AND status = 'ACTIVE';`,
        [groupId]
      );

      // 5. Borrado lógico del grupo (DEC-13)
      const today = new Date().toISOString().slice(0, 10);
      const effectiveEnd =
        group.effectiveStart >= today
          ? new Date(new Date(group.effectiveStart).getTime() + 86400000)
              .toISOString()
              .slice(0, 10)
          : today;

      group.status = "INACTIVE";
      group.effectiveEnd = effectiveEnd;
      await manager.getRepository(CommercialGroupEntity).save(group);

      // 6. Incrementar versión del departamento
      await this.bumpDepartmentVersion(
        manager,
        group.departmentNodeId,
        periodId,
        userId
      );

      // 7. Registrar evento de auditoría
      await this.logAuditEvent(
        manager,
        AuditAction.GROUP_DELETED,
        "CommercialGroup",
        group.id,
        { id: group.id, displayCode: group.displayCode, status: "ACTIVE" },
        { id: group.id, displayCode: group.displayCode, status: "INACTIVE" },
        userId
      );

      const releasedSectionsCount = await manager
        .getRepository(GroupSectionAssignmentEntity)
        .count({
          where: { commercialGroupId: groupId },
        });

      return {
        message: `Grupo ${group.displayCode} inactivado correctamente.`,
        releasedSectionsCount,
      };
    });
  }

  /**
   * =====================================================================================
   * CASO DE USO: CU-ADM-004 / UC-014 a UC-019 / HU-32, HU-33, HU-37, HU-53 / DEC-06
   * REUBICACIÓN DRAG & DROP DE SECCIONES CON CONCURRENCIA OPTIMISTA
   * =====================================================================================
   */
  async moveSection(
    departmentId: string,
    sectionId: string,
    targetGroupId: string,
    clientVersion?: number,
    userId?: string
  ) {
    const { periodId } = await this.validateCalendarEditable();

    return this.dataSource.transaction(async (manager) => {
      // 1. Validar concurrencia optimista si se envía versión (HU-53 / DEC-06)
      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          departmentId,
          clientVersion,
          periodId
        );
      }

      // 2. Validar que el grupo destino pertenezca al mismo departamento (HU-33)
      const targetGroup = await manager.getRepository(CommercialGroupEntity).findOne({
        where: { id: targetGroupId, departmentNodeId: departmentId, status: "ACTIVE" },
      });
      if (!targetGroup) {
        throw new BadRequestException(
          "El grupo destino no pertenece al mismo departamento comercial o no está activo."
        );
      }

      // 3. Obtener la asignación activa de la sección en el departamento
      const assignment = await manager.getRepository(GroupSectionAssignmentEntity).findOne({
        where: { departmentNodeId: departmentId, sectionId, status: "ACTIVE" },
      });
      if (!assignment) {
        throw new NotFoundException(`La sección ${sectionId} no está asignada en este departamento.`);
      }

      // 4. Bloqueo estricto de Sección Ancla (HU-37 / RN-030)
      if (assignment.assignmentOrigin === "ANCHOR") {
        throw new UnprocessableEntityException(
          "No se permite mover una Sección Ancla entre grupos. Su adscripción es gobernada contractualmente en Employee Central."
        );
      }

      const previousGroupId = assignment.commercialGroupId;

      // 5. Mover al grupo destino
      assignment.commercialGroupId = targetGroupId;
      await manager.getRepository(GroupSectionAssignmentEntity).save(assignment);

      // 6. Incrementar versión del departamento de forma atómica (P-09 / HU-53)
      await this.bumpDepartmentVersion(manager, departmentId, periodId, userId);

      // 7. Registrar evento de auditoría
      await this.logAuditEvent(
        manager,
        AuditAction.SECTION_MOVED,
        "GroupSectionAssignment",
        assignment.id,
        { sectionId, previousGroupId },
        { sectionId, newGroupId: targetGroupId },
        userId
      );

      return {
        message: "Sección reubicada exitosamente.",
        sectionId,
        newGroupId: targetGroupId,
      };
    });
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-29, HU-30 / CU-ADM-004
   * ASIGNAR SECCIÓN DISPONIBLE A GRUPO COMERCIAL
   * =====================================================================================
   */
  async assignSection(
    groupId: string,
    sectionId: string,
    clientVersion?: number,
    userId?: string
  ) {
    const { periodId } = await this.validateCalendarEditable();

    return this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(CommercialGroupEntity).findOne({
        where: { id: groupId, status: "ACTIVE" },
      });
      if (!group) {
        throw new NotFoundException(`Grupo comercial ${groupId} no encontrado`);
      }

      // Validar concurrencia optimista
      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          group.departmentNodeId,
          clientVersion,
          periodId
        );
      }

      // Validar que la sección exista en catálogo de referencia
      const section = await manager.getRepository(SectionReferenceEntity).findOne({
        where: { id: sectionId, status: "ACTIVE" },
      });
      if (!section) {
        throw new NotFoundException(`Sección ${sectionId} no encontrada o inactiva`);
      }

      // Validar regla de asignación única por tienda: que no esté asignada activamente a otro grupo
      const existing = await manager.getRepository(GroupSectionAssignmentEntity).findOne({
        where: { sectionId, status: "ACTIVE" },
      });
      if (existing) {
        throw new ConflictException(
          `La sección ${section.code} ya se encuentra asignada activamente a un grupo comercial.`
        );
      }

      // Crear asignación manual activa
      const assignment = manager.getRepository(GroupSectionAssignmentEntity).create({
        businessStructureId: group.businessStructureId,
        departmentNodeId: group.departmentNodeId,
        commercialGroupId: group.id,
        sectionId: section.id,
        assignmentOrigin: "MANUAL",
        effectiveStart: new Date().toISOString().slice(0, 10),
        status: "ACTIVE",
        version: "0",
        createdBy: userId || null,
      });

      const savedAssignment = await manager
        .getRepository(GroupSectionAssignmentEntity)
        .save(assignment);

      // Incrementar versión del departamento
      const newVersion = await this.bumpDepartmentVersion(
        manager,
        group.departmentNodeId,
        periodId,
        userId
      );

      // Registrar auditoría
      await this.logAuditEvent(
        manager,
        AuditAction.SECTION_ASSIGNED,
        "GroupSectionAssignment",
        savedAssignment.id,
        null,
        {
          assignmentId: savedAssignment.id,
          groupId: group.id,
          sectionId: section.id,
          sectionCode: section.code,
        },
        userId
      );

      return {
        message: "Sección asignada exitosamente al grupo operativo.",
        assignmentId: savedAssignment.id,
        groupId: group.id,
        sectionId: section.id,
        sectionCode: section.code,
        assignmentOrigin: "MANUAL",
        newDepartmentVersion: newVersion,
      };
    });
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-34, HU-37 / CU-ADM-004
   * DESASIGNAR SECCIÓN DE GRUPO COMERCIAL (RETORNO A DISPONIBLES)
   * =====================================================================================
   */
  async unassignSection(
    groupId: string,
    sectionId: string,
    clientVersion?: number,
    userId?: string
  ) {
    const { periodId } = await this.validateCalendarEditable();

    return this.dataSource.transaction(async (manager) => {
      const group = await manager.getRepository(CommercialGroupEntity).findOne({
        where: { id: groupId, status: "ACTIVE" },
      });
      if (!group) {
        throw new NotFoundException(`Grupo comercial ${groupId} no encontrado`);
      }

      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          group.departmentNodeId,
          clientVersion,
          periodId
        );
      }

      const assignment = await manager.getRepository(GroupSectionAssignmentEntity).findOne({
        where: { commercialGroupId: groupId, sectionId, status: "ACTIVE" },
      });
      if (!assignment) {
        throw new NotFoundException(
          `La sección ${sectionId} no se encuentra asignada activamente al grupo ${groupId}.`
        );
      }

      // Regla de Protección de Sección Ancla (HU-37 / RN-030)
      if (assignment.assignmentOrigin === "ANCHOR") {
        throw new UnprocessableEntityException(
          "No se puede desasignar una sección ancla fija protegida contractualmente."
        );
      }

      // Inactivación de asignación para devolverla al catálogo de disponibles
      const today = new Date().toISOString().slice(0, 10);
      const effectiveEnd =
        assignment.effectiveStart >= today
          ? new Date(new Date(assignment.effectiveStart).getTime() + 86400000)
              .toISOString()
              .slice(0, 10)
          : today;

      assignment.status = "INACTIVE";
      assignment.effectiveEnd = effectiveEnd;
      await manager.getRepository(GroupSectionAssignmentEntity).save(assignment);

      // Incrementar versión del departamento
      const newVersion = await this.bumpDepartmentVersion(
        manager,
        group.departmentNodeId,
        periodId,
        userId
      );

      // Registrar auditoría
      await this.logAuditEvent(
        manager,
        AuditAction.SECTION_UNASSIGNED,
        "GroupSectionAssignment",
        assignment.id,
        { groupId, sectionId, status: "ACTIVE" },
        { groupId, sectionId, status: "INACTIVE" },
        userId
      );

      return {
        message: "Sección desasignada exitosamente del grupo. Retornó al catálogo de disponibles.",
        groupId,
        sectionId,
        newDepartmentVersion: newVersion,
      };
    });
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-52 / CU-ADM-005
   * CORTE OPERATIVO Y ESTADO DEL CALENDARIO
   * =====================================================================================
   */
  async getOperationalCutoff(period?: string) {
    const { periodRow } = await this.resolveOperationalPeriodDetails(period);

    const now = new Date();
    const editingEnd = new Date(periodRow.editing_end);
    const diffMs = editingEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isEditable = periodRow.status === "OPEN";

    const periodCode = `${periodRow.year}-${String(periodRow.month).padStart(2, "0")}`;

    return {
      periodCode,
      status: periodRow.status,
      editingStart: new Date(periodRow.editing_start).toISOString(),
      editingEnd: editingEnd.toISOString(),
      isEditable,
      daysRemaining,
      cutoffDate: editingEnd.toISOString().slice(0, 10),
    };
  }

  /**
   * =====================================================================================
   * CASO DE USO: HU-48 / CU-ADM-005 / CU-ADM-007
   * PUBLICACIÓN DE ESTRUCTURA DEPARTAMENTAL
   * =====================================================================================
   */
  async publishDepartment(
    departmentId: string,
    dto?: PublishDepartmentDto,
    clientVersion?: number,
    userId?: string
  ) {
    const { periodId, periodCode } = await this.validateCalendarEditable(dto?.period);

    return this.dataSource.transaction(async (manager) => {
      const dept = await manager.getRepository(StructureNodeEntity).findOne({
        where: { id: departmentId, status: "ACTIVE" },
      });
      if (!dept) {
        throw new NotFoundException(`Departamento comercial ${departmentId} no encontrado`);
      }

      // Validar concurrencia optimista
      if (clientVersion !== undefined) {
        await this.validateDepartmentVersion(
          manager,
          departmentId,
          clientVersion,
          periodId
        );
      }

      // Regla: El departamento debe tener al menos 1 grupo activo
      const activeGroups = await manager.getRepository(CommercialGroupEntity).find({
        where: { departmentNodeId: departmentId, status: "ACTIVE" },
      });
      if (activeGroups.length === 0) {
        throw new BadRequestException(
          "No se puede publicar el departamento: Debe contar con al menos un grupo operativo activo."
        );
      }

      // Regla HU-39: Validar que no existan secciones ancla huérfanas en el departamento
      const orphanAnchors = await manager.query(
        `
        SELECT pr.id, pr.name, sr.external_code
        FROM zd_ref.position_reference pr
        JOIN zd_ref.section_reference sr ON sr.id = pr.anchor_section_id
        WHERE pr.status = 'ACTIVE'
          AND pr.anchor_section_id NOT IN (
            SELECT gsa.section_id 
            FROM zd_core.group_section_assignment gsa 
            WHERE gsa.department_node_id = $1 AND gsa.status = 'ACTIVE'
          )
          AND pr.organizational_node_id IN (
            SELECT snb.organizational_node_id
            FROM zd_core.structure_node_binding snb
            WHERE snb.structure_node_id = $1
          );
        `,
        [departmentId]
      );
      if (orphanAnchors && orphanAnchors.length > 0) {
        throw new UnprocessableEntityException(
          `No se puede publicar el departamento: Existen ${orphanAnchors.length} secciones ancla sin grupo asignado.`
        );
      }

      // Contar secciones adscritas
      const totalSections = await manager
        .getRepository(GroupSectionAssignmentEntity)
        .count({
          where: { departmentNodeId: departmentId, status: "ACTIVE" },
        });

      // Incrementar versión del departamento como confirmación de publicación
      const newVersion = await this.bumpDepartmentVersion(
        manager,
        departmentId,
        periodId,
        userId
      );

      // Registrar auditoría de publicación
      await this.logAuditEvent(
        manager,
        AuditAction.DEPARTMENT_PUBLISHED,
        "DepartmentStructureState",
        departmentId,
        null,
        {
          departmentId,
          periodCode,
          newVersion,
          totalGroups: activeGroups.length,
          totalSections,
          notes: dto?.notes ?? null,
        },
        userId
      );

      return {
        message: "Estructura departamental publicada y confirmada exitosamente.",
        departmentId,
        periodCode,
        version: newVersion,
        publishedAt: new Date().toISOString(),
        totalGroups: activeGroups.length,
        totalSections,
      };
    });
  }

  // =====================================================================================
  // MÉTODOS AUXILIARES PRIVADOS
  // =====================================================================================

  private async resolveOperationalPeriod(period?: string): Promise<{
    periodId: string;
    periodCode: string;
    periodStatus: string;
    isReadOnly: boolean;
  }> {
    const { periodRow } = await this.resolveOperationalPeriodDetails(period);
    const periodCode = `${periodRow.year}-${String(periodRow.month).padStart(2, "0")}`;
    const isReadOnly = periodRow.status === "HISTORICAL" || periodRow.status === "CLOSED";

    return {
      periodId: periodRow.id,
      periodCode,
      periodStatus: periodRow.status,
      isReadOnly,
    };
  }

  private async resolveOperationalPeriodDetails(period?: string): Promise<{ periodRow: any }> {
    let periodRow: any = null;

    if (period) {
      const [yearStr, monthStr] = period.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const rows = await this.dataSource.query(
        `SELECT * FROM zd_plan.operational_period WHERE year = $1 AND month = $2;`,
        [year, month]
      );
      if (!rows || rows.length === 0) {
        throw new NotFoundException(`Periodo operativo ${period} no encontrado.`);
      }
      periodRow = rows[0];
    } else {
      const rows = await this.dataSource.query(
        `SELECT * FROM zd_plan.operational_period WHERE status = 'OPEN' ORDER BY start_date ASC LIMIT 1;`
      );
      if (rows && rows.length > 0) {
        periodRow = rows[0];
      } else {
        const fallback = await this.dataSource.query(
          `SELECT * FROM zd_plan.operational_period ORDER BY start_date DESC LIMIT 1;`
        );
        periodRow = fallback[0];
      }
    }

    return { periodRow };
  }

  private async validateCalendarEditable(period?: string): Promise<{
    periodId: string;
    periodCode: string;
  }> {
    const now = new Date();

    if (period) {
      const [yearStr, monthStr] = period.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const targetDate = new Date(year, month - 1, 1);
      const maxFuture = new Date(now.getFullYear(), now.getMonth() + 6, 1);
      if (targetDate > maxFuture) {
        throw new BadRequestException("No se permiten operaciones con más de 6 meses de anticipación.");
      }
    }

    const { periodRow } = await this.resolveOperationalPeriodDetails(period);

    if (periodRow.status === "HISTORICAL") {
      throw new ForbiddenException("No se permiten modificaciones en periodos cerrados o históricos.");
    }

    if (periodRow.status === "CLOSED") {
      throw new HttpException(
        "El periodo operativo se encuentra bloqueado por proceso de cierre o cálculo.",
        HttpStatus.LOCKED
      );
    }

    const periodCode = `${periodRow.year}-${String(periodRow.month).padStart(2, "0")}`;
    return { periodId: periodRow.id, periodCode };
  }

  private async getActivePeriodId(manager: EntityManager): Promise<string> {
    const rows = await manager.query(
      `SELECT id FROM zd_plan.operational_period WHERE status = 'OPEN' ORDER BY start_date ASC LIMIT 1;`
    );
    if (rows && rows.length > 0) {
      return rows[0].id;
    }
    const fallback = await manager.query(
      `SELECT id FROM zd_plan.operational_period ORDER BY start_date DESC LIMIT 1;`
    );
    return fallback[0].id;
  }

  private async validateDepartmentVersion(
    manager: EntityManager,
    departmentId: string,
    clientVersion: number,
    operationalPeriodId: string
  ): Promise<void> {
    const rows = await manager.query(
      `
      SELECT version 
      FROM zd_core.department_structure_state 
      WHERE department_node_id = $1 AND operational_period_id = $2;
      `,
      [departmentId, operationalPeriodId]
    );

    const currentVersion = rows && rows.length > 0 ? Number(rows[0].version) : 0;
    if (currentVersion !== clientVersion) {
      throw new ConflictException({
        code: "DEPARTMENT_VERSION_CONFLICT",
        message:
          "El departamento comercial fue modificado por otro usuario simultáneamente. Se requiere recargar la vista.",
        currentVersion,
      });
    }
  }

  private async bumpDepartmentVersion(
    manager: EntityManager,
    departmentId: string,
    operationalPeriodId: string,
    userId?: string
  ): Promise<number> {
    const result = await manager.query(
      `
      UPDATE zd_core.department_structure_state
      SET version = version + 1, last_modified_at = NOW(), last_modified_by = $3
      WHERE department_node_id = $1 AND operational_period_id = $2
      RETURNING version;
      `,
      [departmentId, operationalPeriodId, userId || null]
    );

    if (result && result.length > 0) {
      return Number(result[0].version);
    }

    const insertRes = await manager.query(
      `
      INSERT INTO zd_core.department_structure_state (department_node_id, operational_period_id, version, last_modified_at, last_modified_by)
      VALUES ($1, $2, 1, NOW(), $3)
      RETURNING version;
      `,
      [departmentId, operationalPeriodId, userId || null]
    );

    return Number(insertRes[0]?.version ?? 1);
  }

  private computeAggregatedSectionsUpward(node: TreeNode): number {
    let total = 0;
    if (node.levelType === "DEPARTMENT") {
      total = node.aggregatedSectionsCount ?? 0;
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        total += this.computeAggregatedSectionsUpward(child);
      }
    }

    if (node.levelType === "MANAGEMENT") {
      node.aggregatedSectionsCount = total;
    }

    return total;
  }

  private async logAuditEvent(
    manager: EntityManager,
    action: AuditAction,
    entityType: string,
    entityId: string,
    beforeValue: any,
    afterValue: any,
    userId?: string
  ): Promise<void> {
    try {
      await this.auditRepository.append(manager, {
        actorType: userId ? AuditActorType.USER : AuditActorType.SYSTEM,
        userId: userId || null,
        technicalPrincipal: userId ? null : "zdeptos-structures-service",
        eventCategory: AuditEventCategory.STRUCTURE_CHANGE,
        action,
        entityType,
        entityId,
        roleContext: null,
        scopeContext: null,
        beforeValue,
        afterValue,
        result: AuditResult.SUCCESS,
        correlationId: `str-${Date.now()}`,
      });
    } catch {
      // Audit non-blocking
    }
  }
}
