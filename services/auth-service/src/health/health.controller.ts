import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check Auth Service health' })
  @ApiResponse({
    status: 200,
    description: 'Auth Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'AIPMS Auth Service' },
        timestamp: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'AIPMS Auth Service',
      timestamp: new Date().toISOString(),
    };
  }
}
