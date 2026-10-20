/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 02 — ESTRUCTURA COMERCIAL, ÁRBOL DE 6 NIVELES, GRUPOS Y SECCIONES
 * MÓDULO:   Geography (Geografía Comercial y Filtros de Selección en Cascada)
 * HISTORIAS: HU-13 (HU-019 a HU-021) | CATÁLOGO DOMINIO 3
 * CASOS DE USO: UC-004
 * ============================================================================
 */
import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiKeyGuard, PermissionsGuard, RequirePermissions } from "../../shared/security/security";
import { GeographyService } from "./geography.service";
import {
  CommercialLocationResponseDto,
  CommercialZoneResponseDto,
} from "./dto/geography-response.dto";
import {
  ForbiddenErrorResponseDto,
  InternalServerErrorResponseDto,
  StandardErrorResponseDto,
  UnauthorizedErrorResponseDto,
} from "../structures/presentation/dto/error-response.dto";

@ApiTags("Feature 02: Geografía Comercial y Filtros en Cascada (UC-004 / HU-13)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@Controller("geography")
@UseGuards(ApiKeyGuard, PermissionsGuard)
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  /**
   * Obtiene catálogo de Zonas comerciales
   * UC-004 / HU-13
   */
  @Get("zones")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Listar Zonas Comerciales (UC-004 / HU-13)",
    description: `
### Propósito
Retorna el catálogo completo de zonas geográficas comerciales operativas (Metro Centro, Norte, Golfo...).

### Permisos Requeridos
- **STRUCTURE_VIEW**: Permiso de lectura de estructuras organizacionales.

### Uso en Frontend
Alimenta el primer selector desplegable del filtro en cascada de la pantalla principal de Estructuras Comerciales. Al seleccionar una zona, se activa el segundo selector (Tiendas).
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Catálogo de zonas geográficas activas retornado exitosamente.",
    type: [CommercialZoneResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: "Autenticación fallida: Cabecera x-dev-api-key omitida o credencial inválida.",
    type: UnauthorizedErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Permiso insuficiente: El usuario no posee el permiso STRUCTURE_VIEW.",
    type: ForbiddenErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Error interno del servidor o falla en la base de datos.",
    type: InternalServerErrorResponseDto,
  })
  getZones() {
    return this.geographyService.getZones();
  }

  /**
   * Obtiene Tiendas dentro de una Zona
   * UC-004 / HU-13
   */
  @Get("zones/:zoneId/locations")
  @RequirePermissions("STRUCTURE_VIEW")
  @ApiOperation({
    summary: "Listar Tiendas (Locations) por Zona (UC-004 / HU-13)",
    description: `
### Propósito
Obtiene la lista de tiendas físicas (almacenes) que pertenecen a la zona comercial especificada.

### Permisos Requeridos
- **STRUCTURE_VIEW**: Permiso de lectura de estructuras organizacionales.

### Uso en Frontend
Alimenta el segundo selector en cascada. La tienda seleccionada (\`locationId\`) es el parámetro raíz para renderizar el árbol jerárquico de 6 niveles (\`GET /api/v1/structures/tree?locationId=...\`).
    `,
  })
  @ApiParam({
    name: "zoneId",
    description: "UUID de la Zona comercial seleccionada en el paso 1",
    example: "7c76789b-da9f-500c-8efb-4f9ecfe73925",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de tiendas adscritas a la zona comercial especificada.",
    type: [CommercialLocationResponseDto],
  })
  @ApiBadRequestResponse({
    description: "El identificador zoneId no es un UUID válido v4.",
    type: StandardErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Autenticación fallida: Cabecera x-dev-api-key omitida o credencial inválida.",
    type: UnauthorizedErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Permiso insuficiente: El usuario no posee el permiso STRUCTURE_VIEW.",
    type: ForbiddenErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Error interno del servidor o falla en la base de datos.",
    type: InternalServerErrorResponseDto,
  })
  getLocations(@Param("zoneId", ParseUUIDPipe) zoneId: string) {
    return this.geographyService.getLocations(zoneId);
  }
}
