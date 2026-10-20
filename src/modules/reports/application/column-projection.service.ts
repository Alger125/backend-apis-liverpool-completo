import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ReportColumnMetadataDto,
  ReportsMetadataResponseDto,
} from "../presentation/dto/reports-metadata.dto";

@Injectable()
export class ColumnProjectionService {
  private readonly allColumns: ReportColumnMetadataDto[] = [
    // 1. Estructura
    {
      key: "effectiveDate",
      label: "Fecha Efectiva",
      category: "estructura",
      description: "Fecha de vigencia de la fotografía o estructura (campo técnico obligatorio)",
      type: "DATE",
      sensitive: false,
      mandatoryTechnical: true,
    },
    {
      key: "zone",
      label: "Zona Geográfica",
      category: "estructura",
      description: "Nombre de la zona operativa (ej: Metro Centro, Norte)",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "location",
      label: "Tienda / Ubicación",
      category: "estructura",
      description: "Nombre y código del almacén comercial",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "centerCode",
      label: "Centro",
      category: "estructura",
      description: "Código de centro operativo / centro de costos SAP",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "management",
      label: "Gerencia Comercial",
      category: "estructura",
      description: "Gerencia comercial de 5to nivel",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "department",
      label: "Departamento Comercial",
      category: "estructura",
      description: "Departamento comercial de 6to nivel",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "group",
      label: "Grupo Comercial",
      category: "estructura",
      description: "Nombre del grupo comercial (autonumeración P-02)",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "sectionId",
      label: "ID de Sección",
      category: "estructura",
      description: "Identificador interno o código de la sección",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "sectionName",
      label: "Nombre de Sección",
      category: "estructura",
      description: "Descripción oficial de la sección en piso de venta",
      type: "STRING",
      sensitive: false,
    },

    // 2. Puestos y Personas
    {
      key: "positionId",
      label: "ID de Posición / Puesto",
      category: "puestosPersonas",
      description: "Código de la posición en SAP ECC / SuccessFactors",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "positionName",
      label: "Nombre de Posición / Puesto",
      category: "puestosPersonas",
      description: "Denominación del puesto funcional",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "jobFunction",
      label: "Función",
      category: "puestosPersonas",
      description: "Función operativa o comercial del puesto (COMERCIAL, OPERACIONES, CORPORATIVO)",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "employeeId",
      label: "Número de Empleado",
      category: "puestosPersonas",
      description: "Número de nómina o ID externo de colaborador (campo sensible)",
      type: "STRING",
      sensitive: true,
    },
    {
      key: "employeeName",
      label: "Nombre de Colaborador",
      category: "puestosPersonas",
      description: "Nombre completo del titular asignado",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "leaderName",
      label: "Responsable / Jefe",
      category: "puestosPersonas",
      description: "Nombre del líder del departamento (incluye esquema Mancuernas)",
      type: "STRING",
      sensitive: false,
    },
    {
      key: "isVacant",
      label: "Estado de Vacante",
      category: "puestosPersonas",
      description: "Indica si la posición se encuentra actualmente sin titular activo",
      type: "BOOLEAN",
      sensitive: false,
    },

    // 3. Relaciones
    {
      key: "anchorSection",
      label: "Sección Ancla",
      category: "relaciones",
      description: "Indica si la sección es el ancla contractual del vendedor",
      type: "BOOLEAN",
      sensitive: false,
    },
    {
      key: "managedSections",
      label: "Secciones Gestionadas",
      category: "relaciones",
      description: "Resumen o conteo de secciones asociadas",
      type: "NUMBER",
      sensitive: false,
    },
    {
      key: "assignmentOrigin",
      label: "Tipo de Asignación",
      category: "relaciones",
      description: "Origen del registro (ANCHOR, MANUAL, INITIAL_LOAD)",
      type: "ENUM",
      sensitive: false,
    },
    {
      key: "status",
      label: "Estado",
      category: "relaciones",
      description: "Estado operativo de la relación (ACTIVE, INACTIVE)",
      type: "STRING",
      sensitive: false,
    },
  ];

  private canViewSensitiveColumns(userPermissions?: string[]): boolean {
    if (!userPermissions) {
      return true;
    }
    return (
      userPermissions.includes("REPORTS_SENSITIVE_VIEW") ||
      userPermissions.includes("REPORTS_GLOBAL_VIEW")
    );
  }

  getMetadataCatalog(userPermissions?: string[]): ReportsMetadataResponseDto {
    const allowSensitive = this.canViewSensitiveColumns(userPermissions);
    const authorizedColumns = allowSensitive
      ? [...this.allColumns]
      : this.allColumns.filter((col) => !col.sensitive);

    return {
      categories: ["estructura", "puestosPersonas", "relaciones"],
      columns: authorizedColumns,
    };
  }

  resolveColumns(
    columnsParam?: string,
    selectAll?: boolean,
    userPermissions?: string[],
    requireExplicitSelection?: boolean,
  ): string[] {
    const allowSensitive = this.canViewSensitiveColumns(userPermissions);
    const authorizedColumns = allowSensitive
      ? this.allColumns
      : this.allColumns.filter((col) => !col.sensitive);

    // CA-10: Si se exige selección explícita o se envía columns="" vacío sin selectAll, bloquear generación.
    if (
      (columnsParam !== undefined && columnsParam.trim() === "" && !selectAll) ||
      (requireExplicitSelection && !selectAll && (!columnsParam || columnsParam.trim() === ""))
    ) {
      throw new BadRequestException(
        "Debe seleccionar al menos un dato para generar el reporte.",
      );
    }

    // CA-02: "Todos los datos disponibles" selecciona todos los campos autorizados y excluye los restringidos.
    if (selectAll) {
      return authorizedColumns.map((column) => column.key);
    }

    if (columnsParam) {
      const requested = columnsParam
        .split(",")
        .map((columnKey) => columnKey.trim())
        .filter((columnKey) => columnKey.length > 0);

      const validAuthorizedKeys = new Set(authorizedColumns.map((column) => column.key));
      const filtered = requested.filter((columnKey) => validAuthorizedKeys.has(columnKey));

      if (filtered.length === 0) {
        throw new BadRequestException(
          "Debe seleccionar al menos un dato autorizado para generar el reporte.",
        );
      }

      // CA-03: Incluir los campos seleccionados más los campos técnicos obligatorios aprobados (effectiveDate).
      const mandatoryKeys = authorizedColumns
        .filter((col) => col.mandatoryTechnical)
        .map((col) => col.key);

      const finalColumns = [...filtered];
      for (const mandatoryKey of mandatoryKeys) {
        if (!finalColumns.includes(mandatoryKey)) {
          finalColumns.unshift(mandatoryKey);
        }
      }

      return finalColumns;
    }

    // Default column set when no explicit column restriction is passed
    return [
      "effectiveDate",
      "zone",
      "location",
      "department",
      "group",
      "sectionName",
      "employeeName",
      "positionName",
      "anchorSection",
      "assignmentOrigin",
    ];
  }

  projectRow(
    row: Record<string, unknown>,
    selectedColumns: string[],
  ): Record<string, unknown> {
    const projected: Record<string, unknown> = {};
    for (const col of selectedColumns) {
      projected[col] = row[col] !== undefined ? row[col] : null;
    }
    return projected;
  }
}
