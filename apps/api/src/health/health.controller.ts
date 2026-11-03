import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@routedesk/shared'
import { Public } from '../auth/public.decorator.js';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  checkHealth(): HealthStatus {
    return {
      status: 'ok'
    }
  }
}
