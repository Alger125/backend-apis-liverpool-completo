import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "@jest/globals";
import type { DataSource } from "typeorm";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { HomeSearchService } from "../application/home-search.service";
import { SearchScopeEnforcer } from "../application/search-scope-enforcer.service";
import { HomeSearchController } from "../presentation/home-search.controller";

describe("HomeSearchController & HomeSearchService (HU-07 a HU-12)", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  let scopeEnforcer: SearchScopeEnforcer;
  let service: HomeSearchService;
  let controller: HomeSearchController;

  beforeEach(() => {
    const mockDataSource = {
      isInitialized: false,
    } as unknown as DataSource;
    scopeEnforcer = new SearchScopeEnforcer(mockDataSource);
    service = new HomeSearchService(mockDataSource, scopeEnforcer);
    controller = new HomeSearchController(service);
  });

  function makeReq(
    permissions: string[] = [
      "STRUCTURE_VIEW",
      "GROUP_CREATE",
      "REPORTS_VIEW",
      "REPORTS_EXPORT",
    ],
  ): AuthenticatedRequest {
    return {
      user: {
        id: userId,
        permissions,
      },
    } as unknown as AuthenticatedRequest;
  }

  it("HU-07 (HU-004): retorna perfil de bienvenida personalizado ('Hola, [Nombre]'), iniciales, roles y excepciones vigentes", async () => {
    const profile = await controller.getMyProfile(makeReq());

    expect(profile.userId).toBe(userId);
    expect(profile.greeting).toBe("Hola, César Coronado");
    expect(profile.avatarInitials).toBe("CC");
    expect(profile.activeExceptions).toHaveLength(1);
    expect(profile.effectiveScope.authorizedLocationNames).toContain(
      "Liverpool Atizapán",
    );
    expect(profile.effectiveScope.authorizedLocationNames).toContain(
      "Liverpool Santa Fe",
    );
  });

  it("HU-08 (HU-005): retorna únicamente los módulos autorizados por permisos efectivos y oculta los no permitidos", async () => {
    // Usuario con acceso solo a Estructuras y Reportes (sin ROLE_VIEW ni AUDIT_VIEW)
    const result = await controller.getMyModules(
      makeReq(["STRUCTURE_VIEW", "GROUP_CREATE", "REPORTS_VIEW"]),
    );

    const codes = result.modules.map((m) => m.code);
    expect(codes).toEqual(["ESTRUCTURAS", "REPORTES"]);
    expect(codes).not.toContain("ROLES_PERMISOS");
    expect(codes).not.toContain("HISTORIAL");

    const estructurasMod = result.modules.find((m) => m.code === "ESTRUCTURAS")!;
    expect(estructurasMod.actions.canCreate).toBe(true);

    const reportesMod = result.modules.find((m) => m.code === "REPORTES")!;
    expect(reportesMod.actions.canExport).toBe(false);
  });

  it("HU-09 (HU-006): busca departamentos insensible a acentos/mayúsculas e incluye reportRoute solo si tiene permiso de reportes", async () => {
    const withReports = await controller.searchDepartments(
      { q: "linea blanca" },
      makeReq(["STRUCTURE_VIEW", "REPORTS_VIEW"]),
    );
    expect(withReports.total).toBeGreaterThanOrEqual(1);
    expect(withReports.items[0].name).toBe("Línea Blanca");
    expect(withReports.items[0].reportRoute).toBeTruthy();

    const withoutReports = await controller.searchDepartments(
      { q: "linea blanca" },
      makeReq(["STRUCTURE_VIEW"]),
    );
    expect(withoutReports.items[0].reportRoute).toBeNull();
  });

  it("HU-10 (HU-006): busca colaboradores por nombre o número de empleado dentro del tramo de control", async () => {
    const byName = await controller.searchEmployees(
      { q: "Andrea Torres" },
      makeReq(),
    );
    expect(byName.total).toBe(1);
    expect(byName.items[0].employeeNumber).toBe("EMP-10234");
    expect(byName.items[0].departmentName).toBe("Línea Blanca");

    const byCode = await controller.searchEmployees(
      { q: "EMP-20450" },
      makeReq(),
    );
    expect(byCode.total).toBe(1);
    expect(byCode.items[0].fullName).toBe("Leslie Lorena Tinajero");
  });

  it("HU-11 (HU-006): busca secciones comerciales por código o nombre indicando su estado y si es sección ancla", async () => {
    const anchorSec = await controller.searchSections(
      { q: "SEC-010" },
      makeReq(),
    );
    expect(anchorSec.total).toBe(1);
    expect(anchorSec.items[0].isAnchor).toBe(true);
    expect(anchorSec.items[0].assignmentStatus).toBe("ASIGNADA");

    const availableSec = await controller.searchSections(
      { q: "0388" },
      makeReq(),
    );
    expect(availableSec.total).toBe(1);
    expect(availableSec.items[0].assignmentStatus).toBe("DISPONIBLE");
  });

  it("HU-12 (HU-006): SearchScopeEnforcer excluye entidades fuera del alcance autorizado (Liverpool Monterrey) e incluye las autorizadas por excepción (Santa Fe)", async () => {
    // Liverpool Monterrey no pertenece al alcance del usuario -> 0 resultados y mensaje controlado
    const outOfScopeDept = await controller.searchDepartments(
      { q: "Monterrey" },
      makeReq(),
    );
    expect(outOfScopeDept.total).toBe(0);
    expect(outOfScopeDept.items).toHaveLength(0);
    expect(outOfScopeDept.message).toBe(
      "No se encontraron resultados para los criterios ingresados.",
    );

    const outOfScopeEmp = await controller.searchEmployees(
      { q: "Roberto Garza" },
      makeReq(),
    );
    expect(outOfScopeEmp.total).toBe(0);

    // Liverpool Santa Fe está habilitada por excepción vigente -> sí aparece en la búsqueda
    const exceptionScopeSec = await controller.searchSections(
      { q: "Calzado Damas" },
      makeReq(),
    );
    expect(exceptionScopeSec.total).toBe(1);
    expect(exceptionScopeSec.items[0].locationName).toBe("Liverpool Santa Fe");
  });

  it("CU-HOM-003 FE-05: rechaza criterios de búsqueda vacíos o con caracteres inválidos", async () => {
    await expect(
      controller.searchGlobal({ q: "   " }, makeReq()),
    ).rejects.toThrow(BadRequestException);

    await expect(
      controller.searchGlobal({ q: "Linea; DROP TABLE" }, makeReq()),
    ).rejects.toThrow(BadRequestException);
  });
});
