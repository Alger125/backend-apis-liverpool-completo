/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE HOME & GLOBAL SEARCH — BIENVENIDA, MÓDULOS Y BUSCADOR GLOBAL
 * MÓDULO:   HomeSearch (DTOs de Perfil, Módulos Autorizados y Búsqueda Global)
 * HISTORIAS: HU-07 a HU-12 (HU-004 a HU-006) | CATÁLOGO DOMINIO 2
 * CASOS DE USO: CU-HOM-001, CU-HOM-002, CU-HOM-003
 * ============================================================================
 */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class GlobalSearchQueryDto {
  @ApiProperty({
    description:
      "Criterio de búsqueda (nombre o código de departamento, grupo, sección o colaborador)",
    example: "Línea Blanca",
  })
  @IsString()
  @MaxLength(120)
  q!: string;

  @ApiPropertyOptional({
    description: "Filtro opcional por UUID o código de ubicación/tienda",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    description: "Filtro opcional por UUID o código de departamento comercial",
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: "Filtro opcional por UUID o código de grupo comercial",
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    description: "Límite máximo de resultados a retornar (por defecto 10, máximo 50)",
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class UserExceptionSummaryDto {
  @ApiProperty({ example: "exc-001" })
  exceptionId!: string;

  @ApiProperty({ example: "ROL-006" })
  roleCode!: string;

  @ApiProperty({ example: "Gestor de Ubicación" })
  roleName!: string;

  @ApiProperty({ example: "2026-10-01" })
  validFrom!: string;

  @ApiPropertyOptional({ example: "2026-10-31" })
  validTo!: string | null;

  @ApiProperty({ type: [String], example: ["Liverpool Santa Fe"] })
  scopes!: string[];
}

export class UserProfileResponseDto {
  @ApiProperty({ example: "00000000-0000-4000-8000-000000000001" })
  userId!: string;

  @ApiProperty({ example: "César Coronado" })
  displayName!: string;

  @ApiProperty({ example: "Hola, César Coronado" })
  greeting!: string;

  @ApiProperty({ example: "CC" })
  avatarInitials!: string;

  @ApiProperty({ example: "ccoronado@liverpool.com.mx" })
  email!: string;

  @ApiPropertyOptional({ example: "EMP-10045" })
  employeeNumber?: string | null;

  @ApiPropertyOptional({ example: "Gerente de Tienda" })
  positionTitle?: string | null;

  @ApiProperty({ example: "ACTIVE" })
  status!: string;

  @ApiProperty({ example: "Administrador de Plataforma" })
  activeRole!: string;

  @ApiProperty({
    type: [Object],
    example: [{ code: "ROL-001", name: "Administrador de Plataforma" }],
  })
  roles!: Array<{ code: string; name: string }>;

  @ApiProperty({ type: [UserExceptionSummaryDto] })
  activeExceptions!: UserExceptionSummaryDto[];

  @ApiProperty({
    description: "Contexto de alcance efectivo (incluyendo asignaciones por excepción)",
  })
  effectiveScope!: {
    isGlobal: boolean;
    scopeSummary: string;
    authorizedLocationIds: string[];
    authorizedLocationNames: string[];
  };

  @ApiProperty({ example: "2026-10-19T18:00:00.000Z" })
  lastAccessAt!: string;
}

export class AuthorizedModuleItemDto {
  @ApiProperty({
    example: "ESTRUCTURAS",
    enum: ["ESTRUCTURAS", "ROLES_PERMISOS", "REPORTES", "HISTORIAL"],
  })
  code!: "ESTRUCTURAS" | "ROLES_PERMISOS" | "REPORTES" | "HISTORIAL";

  @ApiProperty({ example: "Gestión de Estructuras" })
  title!: string;

  @ApiProperty({ example: "Zona → Sección" })
  subtitle!: string;

  @ApiProperty({ example: "/estructuras" })
  route!: string;

  @ApiProperty({
    description: "Acciones habilitadas para el usuario dentro del módulo",
  })
  actions!: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canPublish: boolean;
    canExport: boolean;
  };
}

export class UserModulesResponseDto {
  @ApiProperty({ example: "00000000-0000-4000-8000-000000000001" })
  userId!: string;

  @ApiProperty({ type: [AuthorizedModuleItemDto] })
  modules!: AuthorizedModuleItemDto[];

  @ApiProperty({ type: [String] })
  effectivePermissions!: string[];
}

export class DepartmentSearchResultDto {
  @ApiProperty({ example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8" })
  id!: string;

  @ApiProperty({ example: "DCO-1042" })
  code!: string;

  @ApiProperty({ example: "Línea Blanca" })
  name!: string;

  @ApiProperty({ example: "DEPARTMENT" })
  entityType!: "MANAGEMENT" | "DEPARTMENT" | "GROUP";

  @ApiProperty({ example: "f62b081e-4cc2-518a-b840-a7afa915cd3d" })
  locationId!: string;

  @ApiProperty({ example: "Liverpool Atizapán" })
  locationName!: string;

  @ApiProperty({ example: "Zona 2 / Liverpool Atizapán / Hardline / Línea Blanca" })
  breadcrumb!: string;

  @ApiProperty({ example: "/estructuras?locationId=f62b081e-4cc2-518a-b840-a7afa915cd3d&nodeId=7882a45f-8ad2-5009-8d9e-5f6f81671fc8" })
  detailRoute!: string;

  @ApiPropertyOptional({
    description: "Ruta directa al reporte de la entidad si el usuario posee permiso REPORTS_VIEW (CU-HOM-003 RN-09)",
    example: "/reportes?locationId=f62b081e-4cc2-518a-b840-a7afa915cd3d&departmentId=7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
  })
  reportRoute?: string | null;
}

export class EmployeeSearchResultDto {
  @ApiProperty({ example: "e1000000-0000-4000-8000-000000000010" })
  id!: string;

  @ApiProperty({ example: "EMP-10234" })
  employeeNumber!: string;

  @ApiProperty({ example: "Andrea Torres" })
  fullName!: string;

  @ApiProperty({ example: "POS-9001" })
  positionCode!: string;

  @ApiProperty({ example: "Asesor de Ventas Línea Blanca" })
  positionTitle!: string;

  @ApiProperty({ example: "f62b081e-4cc2-518a-b840-a7afa915cd3d" })
  locationId!: string;

  @ApiProperty({ example: "Liverpool Atizapán" })
  locationName!: string;

  @ApiProperty({ example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8" })
  departmentId!: string;

  @ApiProperty({ example: "Línea Blanca" })
  departmentName!: string;

  @ApiPropertyOptional({ example: "Grupo 001" })
  groupName?: string | null;

  @ApiPropertyOptional({ example: "SEC-010 - Refrigeración" })
  anchorSection?: string | null;

  @ApiProperty({ example: "ACTIVE" })
  status!: string;

  @ApiProperty({ example: "Liverpool Atizapán / Línea Blanca / Grupo 001" })
  breadcrumb!: string;
}

export class SectionSearchResultDto {
  @ApiProperty({ example: "c3000000-0000-4000-8000-000000000001" })
  id!: string;

  @ApiProperty({ example: "SEC-010" })
  code!: string;

  @ApiProperty({ example: "Refrigeración" })
  name!: string;

  @ApiProperty({ example: "f62b081e-4cc2-518a-b840-a7afa915cd3d" })
  locationId!: string;

  @ApiProperty({ example: "Liverpool Atizapán" })
  locationName!: string;

  @ApiPropertyOptional({ example: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8" })
  departmentId?: string | null;

  @ApiPropertyOptional({ example: "Línea Blanca" })
  departmentName?: string | null;

  @ApiPropertyOptional({ example: "Grupo 001" })
  groupName?: string | null;

  @ApiProperty({ enum: ["ASIGNADA", "DISPONIBLE"], example: "ASIGNADA" })
  assignmentStatus!: "ASIGNADA" | "DISPONIBLE";

  @ApiProperty({ example: true })
  isAnchor!: boolean;

  @ApiProperty({ example: "Liverpool Atizapán / Línea Blanca / Grupo 001 / SEC-010" })
  breadcrumb!: string;
}

export class SearchCollectionResponseDto<T> {
  @ApiProperty({ example: "Línea Blanca" })
  query!: string;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: "Búsqueda acotada al tramo de control autorizado." })
  scopeContext!: string;

  @ApiPropertyOptional({
    example: "No se encontraron resultados para los criterios ingresados.",
  })
  message?: string;

  @ApiProperty({ isArray: true })
  items!: T[];
}

export class GlobalSearchUnifiedResponseDto {
  @ApiProperty({ example: "Línea" })
  query!: string;

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: "Búsqueda acotada al tramo de control autorizado." })
  scopeContext!: string;

  @ApiPropertyOptional({
    example: "No se encontraron resultados para los criterios ingresados.",
  })
  message?: string;

  @ApiProperty({ type: [DepartmentSearchResultDto] })
  departments!: DepartmentSearchResultDto[];

  @ApiProperty({ type: [EmployeeSearchResultDto] })
  employees!: EmployeeSearchResultDto[];

  @ApiProperty({ type: [SectionSearchResultDto] })
  sections!: SectionSearchResultDto[];
}
