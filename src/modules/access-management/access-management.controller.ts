/**
 * ============================================================================
 * PROYECTO: ZDeptos API - Backend Integrado (Servicios Liverpool)
 * VERTICAL: FEATURE 01 — ROLES, PERMISOS, EXCEPCIONES Y SEGMENTACIÓN OPERATIVA
 * MÓDULO:   Access Management (Asignaciones de Roles, Excepciones Masivas y Permisos Efectivos)
 * HISTORIAS: HU-58 a HU-61, HU-017, HU-018 | CATÁLOGO DOMINIO 9
 * CASOS DE USO: CU-SEG-001, CU-EXC-001, CU-SEC-006 (FA-05)
 * ============================================================================
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard, PermissionsGuard, RequirePermissions } from '../../shared/security/security';
import { AccessManagementRepository } from './access-management.repository';
import {
  AccessScopeQuery,
  BulkCreateExceptionDto,
  CreateAssignmentDto,
  CreateExceptionDto,
  EffectivePageQuery,
  PageQuery,
  RevokeDto,
  UpdateAssignmentDto,
  UpdateExceptionDto,
} from './dto';
type AuthenticatedUserRequest = { user?: { id?: string } };

@ApiTags("Feature 01: Asignaciones de Roles y Alcance Operativo (HU-58 a HU-61)")
@ApiSecurity("dev-api-key")
@ApiHeader({
  name: "x-dev-api-key",
  description: "Llave de autorización para desarrollo local (dev-api-key-zdeptos-2026)",
  example: "dev-api-key-zdeptos-2026",
  required: true,
})
@UseGuards(ApiKeyGuard, PermissionsGuard)
@Controller()
export class AccessManagementController {
  constructor(private readonly repo: AccessManagementRepository) {}

  @Get('users')
  @RequirePermissions('USER_VIEW')
  users(@Query() query: PageQuery) {
    return this.repo.users(query);
  }

  @Get('users/:userId')
  @RequirePermissions('USER_VIEW')
  user(@Param('userId', ParseUUIDPipe) id: string) {
    return this.repo.user(id);
  }

  @Get('users/:userId/effective-permissions')
  @RequirePermissions('USER_VIEW')
  @ApiOperation({
    summary:
      'Calcular fusión aditiva y acumulativa de permisos y alcances vigentes de un colaborador (HU-61 / HU-018 / DEC-12)',
    description:
      'Retorna la unión aditiva (sin directivas DENY) de los permisos y alcances otorgados por todos los roles ordinarios y excepciones vigentes del usuario.',
  })
  effectivePermissions(
    @Param('userId', ParseUUIDPipe) id: string,
    @Query('effectiveOn') effectiveOn?: string,
  ) {
    return this.repo.effectivePermissions(id, effectiveOn);
  }

  @Get('users/:userId/role-assignments')
  @RequirePermissions('ROLE_ASSIGNMENT_VIEW')
  userAssignments(
    @Param('userId', ParseUUIDPipe) id: string,
    @Query() query: EffectivePageQuery,
  ) {
    return this.repo.list('assignment', query, id);
  }

  @Get('users/:userId/role-exceptions')
  @RequirePermissions('ROLE_EXCEPTION_VIEW')
  userExceptions(
    @Param('userId', ParseUUIDPipe) id: string,
    @Query() query: EffectivePageQuery,
  ) {
    return this.repo.list('exception', query, id);
  }

  @Get('access-scopes')
  @RequirePermissions('STRUCTURE_VIEW')
  scopes(@Query() query: AccessScopeQuery) {
    return this.repo.scopes(query);
  }

  @Get('role-assignments')
  @RequirePermissions('ROLE_ASSIGNMENT_VIEW')
  assignments(@Query() query: EffectivePageQuery) {
    return this.repo.list('assignment', query);
  }

  @Post('role-assignments')
  @RequirePermissions('ROLE_ASSIGNMENT_CREATE')
  createAssignment(
    @Body() dto: CreateAssignmentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.createAssignment(dto, idempotencyKey, request.user?.id);
  }

  @Get('role-assignments/:assignmentId')
  @RequirePermissions('ROLE_ASSIGNMENT_VIEW')
  assignment(@Param('assignmentId', ParseUUIDPipe) id: string) {
    return this.repo.detail('assignment', id);
  }

  @Put('role-assignments/:assignmentId')
  @RequirePermissions('ROLE_ASSIGNMENT_UPDATE')
  updateAssignment(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.updateAssignment(id, dto, request.user?.id);
  }

  @Post('role-assignments/:assignmentId/revoke')
  @RequirePermissions('ROLE_ASSIGNMENT_REVOKE')
  revokeAssignment(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() dto: RevokeDto,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.revoke('assignment', id, dto, request.user?.id);
  }

  @Post('role-assignments/impact')
  @RequirePermissions('ROLE_ASSIGNMENT_IMPACT_VIEW')
  assignmentImpact(@Body() dto: CreateAssignmentDto) {
    return this.repo.impact('assignment', dto);
  }

  @Get('role-exceptions')
  @RequirePermissions('ROLE_EXCEPTION_VIEW')
  exceptions(@Query() query: EffectivePageQuery) {
    return this.repo.list('exception', query);
  }

  @Post('role-exceptions')
  @RequirePermissions('ROLE_EXCEPTION_CREATE')
  createException(
    @Body() dto: CreateExceptionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.createException(dto, idempotencyKey, request.user?.id);
  }

  @Post('role-exceptions/bulk')
  @RequirePermissions('ROLE_EXCEPTION_CREATE')
  @ApiOperation({
    summary:
      'Asignar el mismo rol excepcional con vigencia a varios colaboradores en lote (HU-017 / CU-SEC-006 FA-05 / PROP-03)',
    description:
      'Valida cada colaborador individualmente, aplica la asignación excepcional con vigencia y reporta el resultado detallado del lote.',
  })
  bulkCreateExceptions(
    @Body() dto: BulkCreateExceptionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.bulkCreateExceptions(dto, idempotencyKey, request.user?.id);
  }

  @Get('role-exceptions/:exceptionId')
  @RequirePermissions('ROLE_EXCEPTION_VIEW')
  exception(@Param('exceptionId', ParseUUIDPipe) id: string) {
    return this.repo.detail('exception', id);
  }

  @Put('role-exceptions/:exceptionId')
  @RequirePermissions('ROLE_EXCEPTION_UPDATE')
  updateException(
    @Param('exceptionId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExceptionDto,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.updateException(id, dto, request.user?.id);
  }

  @Post('role-exceptions/:exceptionId/revoke')
  @RequirePermissions('ROLE_EXCEPTION_REVOKE')
  revokeException(
    @Param('exceptionId', ParseUUIDPipe) id: string,
    @Body() dto: RevokeDto,
    @Req() request: AuthenticatedUserRequest,
  ) {
    return this.repo.revoke('exception', id, dto, request.user?.id);
  }

  @Post('role-exceptions/impact')
  @RequirePermissions('ROLE_EXCEPTION_IMPACT_VIEW')
  exceptionImpact(@Body() dto: CreateExceptionDto) {
    return this.repo.impact('exception', dto);
  }
}
