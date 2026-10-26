import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@routedesk/shared'

@Controller('health')
export class HealthController {
  @Get()
  checkHealth(): HealthStatus {
    return {
      status: 'ok'
    }
  }
}
