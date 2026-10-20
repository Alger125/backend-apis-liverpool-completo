/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 02 — ESTRUCTURA COMERCIAL, ÁRBOL DE 6 NIVELES, GRUPOS Y SECCIONES
 * MÓDULO:   Structures (Árbol Jerárquico, Grupos P-02, Secciones Ancla/Virtuales, Corte y Publicación)
 * HISTORIAS: HU-14 a HU-53 (HU-022 a HU-054) | CATÁLOGO DOMINIOS 4 AL 8
 * CASOS DE USO: CU-EST-001, CU-ADM-001 a CU-ADM-008, UC-006 a UC-009
 * REGLAS: RN-001..RN-040, Autonumeración P-02, Secciones Ancla 🔒 (RN-030), If-Match
 * ============================================================================
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { ApiKeyGuard, PermissionsGuard, RequirePermissions } from "../../../shared/security/security";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { StructuresService } from "../application/structures.service";
import {
  AssignSectionDto,
  CreateGroupDto,
  GetTreeQueryDto,
  MoveSectionDto,
  OperationalCutoffQueryDto,
  PublishDepartmentDto,
  UpdateGroupNameDto,
} from "./dto/structures.dto";
import { CommercialGroupResponseDto, TreeNodeResponseDto } from "./dto/tree-response.dto";
import {
  AssignSectionResponseDto,
  CommercialGroupCreatedResponseDto,
  DeleteGroupResponseDto,
  MoveSectionResponseDto,
  OperationalCutoffResponseDto,
  PublishDepartmentResponseDto,
  UnassignSectionResponseDto,
} from "./dto/mutation-response.dto";
import { LocationSummaryResponseDto } from "./dto/location-summary-response.dto";
import { AggregatedSectionResponseDto } from "./dto/aggregated-section-response.dto";
import { AvailableSectionResponseDto } from "./dto/available-section-response.dto";
import {
  AnchorBlockedResponseDto,
  ForbiddenErrorResponseDto,
  GroupDeleteBlockedResponseDto,
  InternalServerErrorResponseDto,
  NotFoundErrorResponseDto,
  StandardErrorResponseDto,
  UnauthorizedErrorResponseDto,
  VersionConflictResponseDto,
} from "./dto/error-response.dto";

@ApiTags("Feature 02: Estructura Comercial, Árbol y Grupos P-02 (CU-EST-001, CU-ADM-001..008 / HU-14..53)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@Controller("structures")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  /**
   * Obtiene el árbol jerárquico completo para una tienda / ubicación
   * CU-EST-001 / UC-006 / HU-14 a HU-20
   */
  @Get("tree")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Visualizar Árbol Jerárquico Comercial Completo (CU-EST-001 / HU-14 a HU-20)",
    description: `
### Propósito
Genera y retorna la estructura jerárquica de 6 niveles completa para la tienda física seleccionada:
\`Cadena ➔ Formato ➔ Zona ➔ Tienda (Location) ➔ Gerencias ➔ Departamentos ➔ Grupos ➔ Secciones\`

### Permisos Requeridos
- **STRUCTURE_VIEW**: Permiso de visualización de jerarquía comercial.

### Funcionalidades y Reglas de Negocio
- **Recursión CTE en Base de Datos**: Consulta recursiva de alto rendimiento que resuelve la jerarquía completa en una sola llamada SQL.
- **Filtro por Periodo y Solo Lectura (CU-ADM-005)**: Acepta \`?period=YYYY-MM\`. Si el periodo es \`HISTORICAL\` o \`CLOSED\`, el nodo raíz retorna \`isReadOnly: true\` para bloquear edición en frontend.
- **Responsables y Mancuernas (ERF 3.1, 5.4)**: Los nodos de Gerencia y Departamento devuelven su arreglo de líderes (\`leaders[]\`) y estado de vacante.
- **Colaboradores en Grupos (CU-ADM-001)**: Cada grupo operativo devuelve sus colaboradores adscritos contractualmente vía secciones ancla (\`collaborators[]\`).
- **Agregación Ascendente (ERF 4.1)**: Los departamentos y gerencias comerciales exponen el total consolidado de secciones (\`aggregatedSectionsCount\`).
- **Distinción de Secciones Ancla (🔒)**: Secciones ancla (\`isAnchor: true\`) están protegidas contractualmente.
- **Control de Concurrencia Optimista (CU-ADM-008 / DEC-06)**: Cada departamento expone su \`departmentVersion\` para validación en cabecera \`If-Match\`.
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Árbol jerárquico retornado exitosamente con líderes, grupos, colaboradores y metadatos de periodo.",
    type: TreeNodeResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Parámetros de consulta inválidos (locationId o formato de periodo erróneo).",
    type: StandardErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Autenticación fallida: Cabecera x-dev-api-key omitida o inválida.",
    type: UnauthorizedErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Permiso insuficiente: Requiere STRUCTURE_VIEW.",
    type: ForbiddenErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "La tienda especificada no existe o no tiene estructura activa.",
    type: NotFoundErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Error interno del servidor o falla en la base de datos.",
    type: InternalServerErrorResponseDto,
  })
  getTree(@Query() query: GetTreeQueryDto) {
    return this.structuresService.getTree(query.locationId, query.period);
  }

  /**
   * Resumen y Encabezado de Tienda
   * HU-15 / CU-ADM-001
   */
  @Get("locations/:locationId/summary")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Visualizar Resumen y Encabezado de Tienda (HU-15 / CU-ADM-001)",
    description: `
### Propósito
Retorna los datos ejecutivos de contexto de la tienda seleccionada para el encabezado visual del módulo comercial (código, nombre, zona, formato y total de departamentos adscritos).
    `,
  })
  @ApiParam({
    name: "locationId",
    description: "UUID de la tienda física (Location)",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  @ApiResponse({
    status: 200,
    description: "Resumen de la tienda consultado exitosamente.",
    type: LocationSummaryResponseDto,
  })
  @ApiBadRequestResponse({
    description: "UUID de tienda inválido.",
    type: StandardErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "La tienda especificada no existe o se encuentra inactiva.",
    type: NotFoundErrorResponseDto,
  })
  getLocationSummary(@Param("locationId", ParseUUIDPipe) locationId: string) {
    return this.structuresService.getLocationSummary(locationId);
  }

  /**
   * Listar Grupos Comerciales de un Departamento
   * HU-20 / CU-ADM-001
   */
  @Get("departments/:departmentId/groups")
  @RequirePermissions("GROUP_VIEW")
  @ApiOperation({
    summary: "Consultar Grupos Comerciales de un Departamento (HU-20 / CU-ADM-001)",
    description: `
### Propósito
Retorna la colección completa de grupos operativos de un departamento comercial con sus secciones asignadas y colaboradores adscritos.
    `,
  })
  @ApiParam({
    name: "departmentId",
    description: "UUID del departamento comercial",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @ApiResponse({
    status: 200,
    description: "Listado de grupos con secciones y colaboradores retornado exitosamente.",
    type: [CommercialGroupResponseDto],
  })
  @ApiNotFoundResponse({
    description: "El departamento comercial no existe o se encuentra inactivo.",
    type: NotFoundErrorResponseDto,
  })
  getDepartmentGroups(@Param("departmentId", ParseUUIDPipe) departmentId: string) {
    return this.structuresService.getDepartmentGroups(departmentId);
  }

  /**
   * Secciones Consolidadas / Agregación Ascendente de un Departamento
   * ERF 4.1 / CU-EST-001
   */
  @Get("departments/:departmentId/aggregated-sections")
  @RequirePermissions("SECTION_VIEW")
  @ApiOperation({
    summary: "Consultar Secciones Agregadas del Departamento (ERF 4.1 / CU-EST-001)",
    description: `
### Propósito
Expone la lista consolidada de todas las secciones comerciales (anclas y virtuales) adscritas a los grupos operativos del departamento, indicando el grupo al que pertenecen y el conteo de colaboradores.
    `,
  })
  @ApiParam({
    name: "departmentId",
    description: "UUID del departamento comercial",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @ApiResponse({
    status: 200,
    description: "Secciones agregadas del departamento retornadas exitosamente.",
    type: [AggregatedSectionResponseDto],
  })
  @ApiNotFoundResponse({
    description: "El departamento comercial no existe o se encuentra inactivo.",
    type: NotFoundErrorResponseDto,
  })
  getAggregatedSections(@Param("departmentId", ParseUUIDPipe) departmentId: string) {
    return this.structuresService.getAggregatedSections(departmentId);
  }

  /**
   * Catálogo de Secciones Disponibles no asignadas
   * HU-27, HU-28 / CU-ADM-004
   */
  @Get("departments/:departmentId/available-sections")
  @RequirePermissions("SECTION_VIEW")
  @ApiOperation({
    summary: "Consultar Catálogo de Secciones Disponibles (HU-27, HU-28 / CU-ADM-004)",
    description: `
### Propósito
Retorna las secciones comerciales activas en el catálogo de referencia que no están actualmente asignadas a ningún grupo operativo, quedando elegibles para ser incorporadas a un grupo.
    `,
  })
  @ApiParam({
    name: "departmentId",
    description: "UUID del departamento comercial",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @ApiResponse({
    status: 200,
    description: "Catálogo de secciones disponibles retornado exitosamente.",
    type: [AvailableSectionResponseDto],
  })
  @ApiNotFoundResponse({
    description: "El departamento comercial no existe o se encuentra inactivo.",
    type: NotFoundErrorResponseDto,
  })
  getAvailableSections(@Param("departmentId", ParseUUIDPipe) departmentId: string) {
    return this.structuresService.getAvailableSections(departmentId);
  }

  /**
   * Crea un nuevo grupo comercial operativo bajo un departamento comercial
   * CU-ADM-002 / UC-009 / HU-21, HU-22
   */
  @Post("departments/:departmentId/groups")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("GROUP_CREATE")
  @ApiOperation({
    summary: "Crear Grupo Comercial Operativo (CU-ADM-002 / P-02 / HU-21, HU-22)",
    description: `
### Propósito
Crea un nuevo grupo operativo subordinado a un departamento comercial.

### Permisos Requeridos
- **GROUP_CREATE**: Permiso para dar de alta nuevos grupos comerciales.

### Reglas de Negocio
- **Autonumeración Secuencial P-02**: El sistema asigna automáticamente el código visible incremental (\`Grupo 001\`, \`Grupo 002\`...) mediante una secuencia atómica con bloqueo (\`FOR UPDATE\`).
- **Unicidad de Nombre (CU-ADM-002)**: Valida que el nombre no se repita dentro del mismo departamento activo (\`409 Conflict\`).
- **Control de Concurrencia Optimista (HU-53)**: Valida la cabecera \`If-Match\` opcional e incrementa la versión del departamento.
- **Auditoría (STRUCTURE_CHANGE)**: Registra el evento en \`zd_audit.audit_event\`.
    `,
  })
  @ApiParam({
    name: "departmentId",
    description: "UUID del departamento comercial padre donde se creará el grupo",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 201,
    description: "Grupo comercial creado exitosamente con numeración correlativa.",
    type: CommercialGroupCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Cuerpo de solicitud inválido (el nombre está vacío o supera 200 caracteres).",
    type: StandardErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "Nombre de grupo duplicado en el departamento o conflicto de concurrencia.",
    type: VersionConflictResponseDto,
  })
  @ApiNotFoundResponse({
    description: "El departamento comercial no existe o no se encuentra activo.",
    type: NotFoundErrorResponseDto,
  })
  createGroup(
    @Param("departmentId", ParseUUIDPipe) departmentId: string,
    @Body() dto: CreateGroupDto,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.createGroup(
      departmentId,
      dto.name,
      clientVersion,
      request?.user?.id
    );
  }

  /**
   * Actualiza el nombre descriptivo de un grupo comercial existente
   * CU-ADM-002 / HU-23
   */
  @Put("groups/:groupId")
  @RequirePermissions("GROUP_UPDATE")
  @ApiOperation({
    summary: "Renombrar Grupo Comercial (CU-ADM-002 / HU-23)",
    description: `
### Propósito
Permite actualizar el nombre descriptivo de un grupo operativo. El código autonumerado (\`Grupo 001\`) se preserva inmutable.

### Reglas de Negocio
- **Unicidad de Nombre (CU-ADM-002)**: Valida que el nuevo nombre no coincida con otro grupo activo del mismo departamento (\`409 Conflict\`).
- **Concurrencia Optimista e Incremento de Versión (HU-53)**.
- **Auditoría (STRUCTURE_CHANGE / GROUP_RENAMED)**.
    `,
  })
  @ApiParam({
    name: "groupId",
    description: "UUID del grupo comercial a renombrar",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 200,
    description: "Nombre del grupo comercial actualizado correctamente.",
    type: CommercialGroupCreatedResponseDto,
  })
  @ApiConflictResponse({
    description: "Nombre duplicado en el departamento o conflicto de versión concurrente.",
    type: VersionConflictResponseDto,
  })
  @ApiNotFoundResponse({
    description: "El grupo comercial especificado no existe o no se encuentra activo.",
    type: NotFoundErrorResponseDto,
  })
  updateGroupName(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateGroupNameDto,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.updateGroupName(
      groupId,
      dto.name,
      clientVersion,
      request?.user?.id
    );
  }

  /**
   * Inactiva (borrado lógico) un grupo comercial elegible
   * CU-ADM-003 / UC-010 / HU-24, HU-25, HU-26 / DEC-13
   */
  @Delete("groups/:groupId")
  @RequirePermissions("GROUP_INACTIVATE")
  @ApiOperation({
    summary: "Inactivar / Eliminar Grupo Comercial Elegible (CU-ADM-003 / HU-24, HU-25, HU-26)",
    description: `
### Propósito
Ejecuta la eliminación lógica (\`status = 'INACTIVE'\`, \`effectiveEnd\`) de un grupo operativo.

### Reglas de Validación Críticas
1. **Regla de Existencia Mínima (HU-26)**: Todo departamento debe contar con al menos un grupo operativo (\`400 Bad Request\`).
2. **Bloqueo de Secciones Ancla (HU-25 / HU-37)**: Si contiene secciones ancla, se rechaza estrictamente con \`409 Conflict\`.
3. **Bloqueo por Colaboradores Activos (CU-ADM-003)**: Si contiene colaboradores activos adscritos, se rechaza con \`409 Conflict\` requiriendo reubicación previa.
4. **Liberación de Secciones Virtuales (DEC-13)**: Las secciones virtuales adscritas retornan al catálogo de disponibles.
5. **Auditoría (STRUCTURE_CHANGE / GROUP_DELETED)**.
    `,
  })
  @ApiParam({
    name: "groupId",
    description: "UUID del grupo comercial elegible a inactivar",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 200,
    description: "Grupo inactivado exitosamente y secciones virtuales liberadas.",
    type: DeleteGroupResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Infracción de regla: No se puede eliminar el único grupo del departamento.",
    type: StandardErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "Bloqueo estricto: El grupo contiene secciones ancla o colaboradores adscritos.",
    type: GroupDeleteBlockedResponseDto,
  })
  @ApiNotFoundResponse({
    description: "El grupo especificado no existe o ya se encuentra inactivo.",
    type: NotFoundErrorResponseDto,
  })
  deleteGroup(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.deleteGroup(groupId, clientVersion, request?.user?.id);
  }

  /**
   * Mueve una sección virtual entre grupos del mismo departamento (Drag & Drop)
   * CU-ADM-004 / UC-014 a UC-019 / HU-32, HU-33, HU-37, HU-53 / DEC-06
   */
  @Patch("departments/:departmentId/sections/move")
  @RequirePermissions("SECTION_MOVE")
  @ApiOperation({
    summary: "Reubicar Sección Virtual entre Grupos / Drag & Drop (CU-ADM-004 / HU-32 a HU-37)",
    description: `
### Propósito
Soporta la interacción visual de arrastrar y soltar (Drag & Drop) en el frontend para reubicar una sección comercial de un grupo operativo a otro dentro del mismo departamento.

### Reglas de Negocio y Validación
1. **Protección Absoluta de Sección Ancla (RN-030 / HU-37)**: Las secciones con \`assignmentOrigin = 'ANCHOR'\` están bloqueadas contractualmente (\`422 Unprocessable Entity\`).
2. **Concurrencia Optimista (CU-ADM-008 / HU-53 / DEC-06)**: Valida la cabecera \`If-Match\`.
3. **Pertenencia Departamental (HU-33)**: Ambos grupos deben pertenecer al mismo departamento comercial.
4. **Auditoría (STRUCTURE_CHANGE / SECTION_MOVED)**.
    `,
  })
  @ApiParam({
    name: "departmentId",
    description: "UUID del departamento comercial en el que ocurre el movimiento",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 200,
    description: "Sección reubicada exitosamente en el grupo destino.",
    type: MoveSectionResponseDto,
  })
  @ApiBadRequestResponse({
    description: "El grupo destino no pertenece al departamento comercial o los parámetros son inválidos.",
    type: StandardErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "Error 409: Conflicto de versión por edición simultánea en el departamento (HU-53 / DEC-06).",
    type: VersionConflictResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: "Error 422: Intento de mover una Sección Ancla protegida (RN-030 / HU-37).",
    type: AnchorBlockedResponseDto,
  })
  moveSection(
    @Param("departmentId", ParseUUIDPipe) departmentId: string,
    @Body() dto: MoveSectionDto,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.moveSection(
      departmentId,
      dto.sectionId,
      dto.targetGroupId,
      clientVersion,
      request?.user?.id
    );
  }

  /**
   * Asignar Sección Disponible a Grupo Comercial
   * HU-29, HU-30 / CU-ADM-004
   */
  @Post("groups/:groupId/sections")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("SECTION_ASSIGN")
  @ApiOperation({
    summary: "Asignar Sección Disponible a Grupo Comercial (HU-29, HU-30 / CU-ADM-004)",
    description: `
### Propósito
Asigna una sección disponible del catálogo de referencia a un grupo operativo específico (\`assignmentOrigin = 'MANUAL'\`).

### Reglas de Negocio
- **Unicidad de Asignación por Tienda**: Una sección no puede estar asignada simultáneamente a más de un grupo activo (\`409 Conflict\`).
- **Concurrencia Optimista e Incremento de Versión (HU-53)**.
- **Auditoría (STRUCTURE_CHANGE / SECTION_ASSIGNED)**.
    `,
  })
  @ApiParam({
    name: "groupId",
    description: "UUID del grupo comercial receptor de la sección",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 201,
    description: "Sección asignada exitosamente al grupo operativo.",
    type: AssignSectionResponseDto,
  })
  @ApiConflictResponse({
    description: "La sección ya se encuentra asignada activamente a otro grupo o conflicto de versión.",
    type: VersionConflictResponseDto,
  })
  @ApiNotFoundResponse({
    description: "El grupo o la sección no existen en el sistema.",
    type: NotFoundErrorResponseDto,
  })
  assignSection(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() dto: AssignSectionDto,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.assignSection(
      groupId,
      dto.sectionId,
      clientVersion,
      request?.user?.id
    );
  }

  /**
   * Desasignar Sección de Grupo Comercial (Retorno a Disponibles)
   * HU-34, HU-37 / CU-ADM-004
   */
  @Delete("groups/:groupId/sections/:sectionId")
  @RequirePermissions("SECTION_UNASSIGN")
  @ApiOperation({
    summary: "Desasignar Sección de Grupo Comercial (HU-34, HU-37 / CU-ADM-004)",
    description: `
### Propósito
Desvincula una sección comercial de su grupo operativo, retornándola al catálogo de secciones disponibles.

### Reglas de Validación
1. **Bloqueo Absoluto de Sección Ancla (HU-37 / RN-030)**: Si la sección tiene \`assignmentOrigin = 'ANCHOR'\`, se rechaza con \`422 Unprocessable Entity\`.
2. **Concurrencia Optimista e Incremento de Versión (HU-53)**.
3. **Auditoría (STRUCTURE_CHANGE / SECTION_UNASSIGNED)**.
    `,
  })
  @ApiParam({
    name: "groupId",
    description: "UUID del grupo comercial de origen",
    example: "64257972-f2f8-58c6-b88e-d724c3e78cce",
  })
  @ApiParam({
    name: "sectionId",
    description: "UUID de la sección a desasignar",
    example: "53dd523e-c6fe-5e99-8f44-620acb432a62",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 200,
    description: "Sección desasignada exitosamente del grupo. Retornó al catálogo de disponibles.",
    type: UnassignSectionResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: "Bloqueo estricto: Intento de desasignar una sección ancla protegida contractualmente.",
    type: AnchorBlockedResponseDto,
  })
  @ApiNotFoundResponse({
    description: "La sección no se encuentra asignada activamente a este grupo.",
    type: NotFoundErrorResponseDto,
  })
  unassignSection(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Param("sectionId", ParseUUIDPipe) sectionId: string,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.unassignSection(
      groupId,
      sectionId,
      clientVersion,
      request?.user?.id
    );
  }

  /**
   * Corte Operativo y Estado del Calendario
   * HU-52 / CU-ADM-005
   */
  @Get("calendar/operational-cutoff")
  @RequirePermissions("PLANNING_VIEW")
  @ApiOperation({
    summary: "Consultar Corte Operativo y Calendario de Planificación (HU-52 / CU-ADM-005)",
    description: `
### Propósito
Retorna el estado de la ventana de edición para el periodo operativo consultado (\`OPEN\`, \`HISTORICAL\`, \`CLOSED\`), fecha de corte operativo, días restantes y la bandera \`isEditable\`.
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Estado del corte operativo retornado exitosamente.",
    type: OperationalCutoffResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Periodo operativo especificado no encontrado.",
    type: NotFoundErrorResponseDto,
  })
  getOperationalCutoff(@Query() query: OperationalCutoffQueryDto) {
    return this.structuresService.getOperationalCutoff(query.period);
  }

  /**
   * Publicar Estructura Departamental
   * HU-48 / CU-ADM-005 / CU-ADM-007
   */
  @Post("departments/:departmentId/publish")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("PLANNING_PUBLISH")
  @ApiOperation({
    summary: "Publicar y Confirmar Estructura Departamental (HU-48 / CU-ADM-005)",
    description: `
### Propósito
Publica oficialmente la estructura de grupos y secciones de un departamento comercial para el periodo operativo seleccionado.

### Reglas de Validación
1. **Existencia de Grupos**: Requiere al menos un grupo operativo activo en el departamento (\`400 Bad Request\`).
2. **Validación de Anclas Huérfanas (HU-39)**: Bloquea con \`422 Unprocessable Entity\` si existen secciones ancla sin grupo asignado.
3. **Validación de Calendario**: Requiere que el periodo operativo admita publicación.
4. **Concurrencia Optimista e Incremento Atómico de Versión (HU-53)**.
5. **Auditoría (STRUCTURE_CHANGE / DEPARTMENT_PUBLISHED)**.
    `,
  })
  @ApiParam({
    name: "departmentId",
    description: "UUID del departamento comercial a publicar",
    example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  @ApiHeader({
    name: "if-match",
    description: "Token de versión actual del departamento para control de concurrencia optimista",
    required: false,
    example: "1",
  })
  @ApiResponse({
    status: 200,
    description: "Estructura departamental publicada y confirmada exitosamente.",
    type: PublishDepartmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: "El departamento no cuenta con grupos activos para ser publicado.",
    type: StandardErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "Conflicto de versión concurrente durante la publicación.",
    type: VersionConflictResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: "Existen secciones ancla huérfanas sin asignar en el departamento.",
    type: StandardErrorResponseDto,
  })
  publishDepartment(
    @Param("departmentId", ParseUUIDPipe) departmentId: string,
    @Body() dto: PublishDepartmentDto,
    @Headers("if-match") ifMatch: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const clientVersion = ifMatch ? Number(ifMatch.replace(/"/g, "")) : undefined;
    return this.structuresService.publishDepartment(
      departmentId,
      dto,
      clientVersion,
      request?.user?.id
    );
  }
}
