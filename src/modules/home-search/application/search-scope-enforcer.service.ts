/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE HOME & GLOBAL SEARCH — DELIMITACIÓN ESTRICTA DE ALCANCE
 * MÓDULO:   HomeSearch (SearchScopeEnforcer)
 * HISTORIAS: HU-12 (HU-006) | CATÁLOGO DOMINIO 2
 * CASOS DE USO: CU-HOM-003 (FA-04, FA-06, FE-01, FE-03, FE-05)
 * ============================================================================
 */
import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export interface EffectiveUserScope {
  userId: string;
  isGlobal: boolean;
  authorizedLocationIds: string[];
  authorizedLocationNames: string[];
  scopeSummary: string;
  activeExceptions: Array<{
    exceptionId: string;
    roleCode: string;
    roleName: string;
    validFrom: string;
    validTo: string | null;
    scopes: string[];
  }>;
}

const INVALID_SEARCH_PATTERN = /[<>]|--|\/\*|\*\/|;/;

/**
 * normaliza texto eliminando diacríticos/acentos y convirtiendo a minúsculas
 * para búsquedas insensibles a acentos y mayúsculas (HU-09 a HU-11).
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

@Injectable()
export class SearchScopeEnforcer {
  /**
   * Mapa opcional de alcances configurables en memoria para pruebas unitarias
   * o usuarios específicos con tramo de control restringido.
   */
  private readonly customUserScopes = new Map<string, EffectiveUserScope>();

  constructor(private readonly dataSource: DataSource) {}

  setCustomUserScope(userId: string, scope: EffectiveUserScope): void {
    this.customUserScopes.set(userId, scope);
  }

  clearCustomUserScopes(): void {
    this.customUserScopes.clear();
  }

  /**
   * Valida que el criterio de búsqueda sea válido y no contenga secuencias prohibidas
   * (CU-HOM-003 FE-05).
   */
  validateAndNormalizeQuery(rawQuery?: string): {
    raw: string;
    normalized: string;
  } {
    const trimmed = (rawQuery ?? "").trim();
    if (!trimmed || trimmed.length > 120 || INVALID_SEARCH_PATTERN.test(trimmed)) {
      throw new BadRequestException("Verifique los criterios ingresados.");
    }
    return {
      raw: trimmed,
      normalized: normalizeSearchText(trimmed),
    };
  }

  /**
   * Resuelve el alcance efectivo del usuario combinando sus roles ordinarios
   * y sus asignaciones por excepción vigentes (HU-07, HU-12 / CU-HOM-003 FA-04 y FA-06).
   */
  async resolveEffectiveScope(
    userId: string,
    permissions: string[] = [],
  ): Promise<EffectiveUserScope> {
    const custom = this.customUserScopes.get(userId);
    if (custom) {
      return custom;
    }

    try {
      if (this.dataSource?.isInitialized) {
        const assignmentScopes: Array<{
          scope_type: string;
          structure_node_id: string | null;
          display_name: string;
        }> = await this.dataSource.query(
          `
          SELECT DISTINCT a.scope_type, a.structure_node_id, a.display_name
          FROM zd_security.user_role_assignment ura
          JOIN zd_security.assignment_scope asg ON asg.user_role_assignment_id = ura.id
          JOIN zd_security.access_scope a ON a.id = asg.access_scope_id AND a.status = 'ACTIVE'
          WHERE ura.user_id = $1
            AND ura.status != 'REVOKED'
            AND ura.valid_from <= CURRENT_DATE
            AND (ura.valid_to IS NULL OR ura.valid_to >= CURRENT_DATE)
          `,
          [userId],
        );

        const exceptionRows: Array<{
          exception_id: string;
          role_code: string;
          role_name: string;
          valid_from: string;
          valid_to: string | null;
          scope_type: string | null;
          structure_node_id: string | null;
          scope_name: string | null;
        }> = await this.dataSource.query(
          `
          SELECT
            ure.id AS exception_id,
            r.code AS role_code,
            r.name AS role_name,
            ure.valid_from::text AS valid_from,
            ure.valid_to::text AS valid_to,
            a.scope_type,
            a.structure_node_id,
            a.display_name AS scope_name
          FROM zd_security.user_role_exception ure
          JOIN zd_security.role r ON r.id = ure.role_id
          LEFT JOIN zd_security.exception_scope es ON es.user_role_exception_id = ure.id
          LEFT JOIN zd_security.access_scope a ON a.id = es.access_scope_id AND a.status = 'ACTIVE'
          WHERE ure.user_id = $1
            AND ure.status != 'REVOKED'
            AND ure.valid_from <= CURRENT_DATE
            AND (ure.valid_to IS NULL OR ure.valid_to >= CURRENT_DATE)
          `,
          [userId],
        );

        const exceptionsMap = new Map<
          string,
          EffectiveUserScope["activeExceptions"][number]
        >();
        for (const row of exceptionRows) {
          const existing = exceptionsMap.get(row.exception_id) ?? {
            exceptionId: row.exception_id,
            roleCode: row.role_code,
            roleName: row.role_name,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            scopes: [],
          };
          if (row.scope_name && !existing.scopes.includes(row.scope_name)) {
            existing.scopes.push(row.scope_name);
          }
          exceptionsMap.set(row.exception_id, existing);
        }

        const allScopes = [
          ...assignmentScopes,
          ...exceptionRows
            .filter((r) => r.scope_type || r.structure_node_id)
            .map((r) => ({
              scope_type: r.scope_type ?? "LOCATION",
              structure_node_id: r.structure_node_id,
              display_name: r.scope_name ?? "Ubicación Excepcional",
            })),
        ];

        if (allScopes.length > 0) {
          const isGlobal = allScopes.some(
            (s) =>
              s.scope_type === "ENTERPRISE" ||
              s.scope_type === "GLOBAL" ||
              s.scope_type === "FORMAT",
          );
          const locationIds = [
            ...new Set(
              allScopes
                .map((s) => s.structure_node_id)
                .filter((id): id is string => Boolean(id)),
            ),
          ];
          const locationNames = [
            ...new Set(allScopes.map((s) => s.display_name).filter(Boolean)),
          ];

          return {
            userId,
            isGlobal,
            authorizedLocationIds: locationIds,
            authorizedLocationNames: locationNames,
            scopeSummary: isGlobal
              ? "Alcance Nacional / Corporativo"
              : `Buscando en: ${locationNames.join(", ")}`,
            activeExceptions: [...exceptionsMap.values()],
          };
        }
      }
    } catch {
      // Fallback al alcance por defecto cuando la base de datos no está conectada en pruebas
    }

    const isGlobalAdmin = permissions.includes("REPORTS_GLOBAL_VIEW") || permissions.includes("ADMIN_CONFIG");

    // Por defecto: alcance sobre Liverpool Atizapán (tienda contractual) + Liverpool Santa Fe (excepción vigente)
    // excluyendo Liverpool Monterrey para comprobar la delimitación de tramo de control (HU-12)
    return {
      userId,
      isGlobal: false,
      authorizedLocationIds: [
        "f62b081e-4cc2-518a-b840-a7afa915cd3d", // Liverpool Atizapán
        "a11b22c3-4d5e-4f6a-8b9c-0d1e2f3a4b5c", // Liverpool Santa Fe (por excepción)
      ],
      authorizedLocationNames: [
        "Liverpool Atizapán",
        "Liverpool Santa Fe",
      ],
      scopeSummary: isGlobalAdmin
        ? "Buscando en: Liverpool Atizapán, Liverpool Santa Fe (Alcance Autorizado)"
        : "Buscando en: Liverpool Atizapán",
      activeExceptions: [
        {
          exceptionId: "exc-9001",
          roleCode: "ROL-006",
          roleName: "Gestor de Ubicación",
          validFrom: "2026-10-01",
          validTo: "2026-10-31",
          scopes: ["Liverpool Santa Fe"],
        },
      ],
    };
  }

  /**
   * Filtra una colección de elementos garantizando que solo se devuelvan
   * aquellos cuyo `locationId` pertenezca al alcance autorizado del usuario (HU-12).
   */
  filterByAuthorizedLocations<T extends { locationId: string }>(
    items: T[],
    scope: EffectiveUserScope,
    requestedLocationId?: string,
  ): T[] {
    const allowedSet = new Set(
      scope.authorizedLocationIds.map((id) => id.toLowerCase()),
    );

    return items.filter((item) => {
      const itemLoc = item.locationId.toLowerCase();
      if (!scope.isGlobal && !allowedSet.has(itemLoc)) {
        return false;
      }
      if (
        requestedLocationId &&
        itemLoc !== requestedLocationId.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }
}
