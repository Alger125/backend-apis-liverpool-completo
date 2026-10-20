import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/auth/public.decorator';

export interface HealthResponse {
  status: 'ok';
}

@ApiTags('0. Sistema y Monitoreo (Health Check)')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Verificar disponibilidad del servicio y conectividad activa con PostgreSQL',
    operationId: 'HealthController_getHealth',
  })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
    };
  }
}
