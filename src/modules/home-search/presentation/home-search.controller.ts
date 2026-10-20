/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE HOME & GLOBAL SEARCH — BIENVENIDA, MÓDULOS Y BUSCADOR GLOBAL
 * MÓDULO:   HomeSearch (Controlador REST)
 * HISTORIAS: HU-07 a HU-12 (HU-004 a HU-006) | CATÁLOGO DOMINIO 2
 * CASOS DE USO: CU-HOM-001, CU-HOM-002, CU-HOM-003
 * ============================================================================
 */
import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import {
  ApiKeyGuard,
  PermissionsGuard,
  RequirePermissions,
} from "../../../shared/security/security";
import { HomeSearchService } from "../application/home-search.service";
import {
  DepartmentSearchResultDto,
  EmployeeSearchResultDto,
  GlobalSearchQueryDto,
  GlobalSearchUnifiedResponseDto,
  SearchCollectionResponseDto,
  SectionSearchResultDto,
  UserModulesResponseDto,
  UserProfileResponseDto,
} from "./dto/home-search.dto";

@ApiTags("Feature Home & Search: Identidad, Módulos por Rol y Buscador Global (HU-07 a HU-12)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@UseGuards(ApiKeyGuard, PermissionsGuard)
@Controller()
export class HomeSearchController {
  constructor(private readonly homeSearchService: HomeSearchService) {}

  @Get("users/me/profile")
  @ApiOperation({
    summary:
      "Obtener identidad de bienvenida personalizada y contexto de sesión (HU-07 / HU-004 / CU-HOM-001)",
    description:
      "Retorna el nombre completo corporativo, saludo personalizado ('Hola, [Nombre]'), rol activo, excepciones vigentes y alcance efectivo sin permitir editar la identidad ni exponer datos sensibles.",
  })
  @ApiOkResponse({
    description: "Perfil de bienvenida y contexto de acceso recuperados exitosamente",
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Sesión o credencial inválida" })
  async getMyProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserProfileResponseDto> {
    return this.homeSearchService.getMyProfile(
      req.user.id,
      req.user.permissions ?? [],
    );
  }

  @Get("users/me/modules")
  @ApiOperation({
    summary:
      "Obtener módulos y acciones habilitados según permisos efectivos del usuario (HU-08 / HU-005 / CU-HOM-002)",
    description:
      "Compila dinámicamente los módulos autorizados (ESTRUCTURAS, ROLES_PERMISOS, REPORTES, HISTORIAL) consolidando roles y excepciones vigentes, ocultando módulos sin permiso.",
  })
  @ApiOkResponse({
    description: "Módulos habilitados para la navegación principal",
    type: UserModulesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Sesión o credencial inválida" })
  async getMyModules(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserModulesResponseDto> {
    return this.homeSearchService.getMyModules(
      req.user.id,
      req.user.permissions ?? [],
    );
  }

  @Get("search/departments")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Búsqueda global de Departamentos Comerciales y Grupos en el alcance del usuario (HU-09, HU-12 / HU-006 / CU-HOM-003)",
    description:
      "Busca coincidencias exactas y parciales insensibles a acentos por nombre o código de departamento/grupo, restringiendo estrictamente los resultados al tramo de control autorizado (incluyendo excepciones).",
  })
  @ApiOkResponse({
    description: "Resultados de departamentos y grupos dentro del alcance autorizado",
    type: SearchCollectionResponseDto<DepartmentSearchResultDto>,
  })
  @ApiBadRequestResponse({
    description: "Verifique los criterios ingresados (FE-05).",
  })
  @ApiForbiddenResponse({
    description: "No cuenta con permisos para realizar búsquedas globales (FE-02).",
  })
  async searchDepartments(
    @Query() query: GlobalSearchQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchCollectionResponseDto<DepartmentSearchResultDto>> {
    return this.homeSearchService.searchDepartments(
      req.user.id,
      req.user.permissions ?? [],
      query,
    );
  }

  @Get("search/employees")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Búsqueda global de Colaboradores por nombre o ID de empleado en el alcance (HU-10, HU-12 / HU-006 / CU-HOM-003)",
    description:
      "Busca colaboradores por número de empleado, puesto o nombre completo dentro del tramo de control autorizado del usuario, excluyendo colaboradores de tiendas fuera de alcance.",
  })
  @ApiOkResponse({
    description: "Resultados de colaboradores dentro del alcance autorizado",
    type: SearchCollectionResponseDto<EmployeeSearchResultDto>,
  })
  @ApiBadRequestResponse({
    description: "Verifique los criterios ingresados (FE-05).",
  })
  @ApiForbiddenResponse({
    description: "No cuenta con permisos para realizar búsquedas globales (FE-02).",
  })
  async searchEmployees(
    @Query() query: GlobalSearchQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchCollectionResponseDto<EmployeeSearchResultDto>> {
    return this.homeSearchService.searchEmployees(
      req.user.id,
      req.user.permissions ?? [],
      query,
    );
  }

  @Get("search/sections")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Búsqueda global de Secciones Comerciales por código o nombre en el alcance (HU-11, HU-12 / HU-006 / CU-HOM-003)",
    description:
      "Busca secciones por código o descripción comercial dentro de las tiendas autorizadas para el usuario, indicando su estado (ASIGNADA / DISPONIBLE), grupo y si es sección ancla.",
  })
  @ApiOkResponse({
    description: "Resultados de secciones comerciales dentro del alcance autorizado",
    type: SearchCollectionResponseDto<SectionSearchResultDto>,
  })
  @ApiBadRequestResponse({
    description: "Verifique los criterios ingresados (FE-05).",
  })
  @ApiForbiddenResponse({
    description: "No cuenta con permisos para realizar búsquedas globales (FE-02).",
  })
  async searchSections(
    @Query() query: GlobalSearchQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchCollectionResponseDto<SectionSearchResultDto>> {
    return this.homeSearchService.searchSections(
      req.user.id,
      req.user.permissions ?? [],
      query,
    );
  }

  @Get("search")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary:
      "Búsqueda global unificada de estructura comercial acotada al alcance (HU-09 a HU-12 / HU-006 / CU-HOM-003)",
    description:
      "Ejecuta simultáneamente la búsqueda sobre departamentos/grupos, colaboradores y secciones aplicando SearchScopeEnforcer.",
  })
  @ApiOkResponse({
    description: "Resultados unificados de búsqueda global",
    type: GlobalSearchUnifiedResponseDto,
  })
  async searchGlobal(
    @Query() query: GlobalSearchQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GlobalSearchUnifiedResponseDto> {
    return this.homeSearchService.searchGlobal(
      req.user.id,
      req.user.permissions ?? [],
      query,
    );
  }
}
