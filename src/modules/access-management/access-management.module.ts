import { Module } from '@nestjs/common';
import { ApiKeyGuard, PermissionsGuard } from '../../shared/security/security';
import { AccessManagementController } from './access-management.controller';
import { AccessManagementRepository } from './access-management.repository';
@Module({
  controllers: [AccessManagementController],
  providers: [AccessManagementRepository, ApiKeyGuard, PermissionsGuard],
})
export class AccessManagementModule {}
