import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
export interface HealthResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
    };
  }
}
