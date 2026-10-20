import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PermissionEntity } from '../permissions/domain/permission.entity';
import { ApiKeyGuard, PermissionsGuard } from '../../shared/security/security';

import { RolesService } from './application/roles.service';
import { RoleEntity } from './domain/role.entity';
import { RolesController } from './presentation/roles.controller';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity]), AuditModule],
  controllers: [RolesController],
  providers: [RolesService, ApiKeyGuard, PermissionsGuard],
  exports: [RolesService],
})
export class RolesModule {}
