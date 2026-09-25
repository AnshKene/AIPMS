import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check Team Service health' })
  @ApiResponse({
    status: 200,
    description: 'Team Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'AIPMS Team Service' },
        timestamp: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'AIPMS Team Service',
      timestamp: new Date().toISOString(),
    };
  }
}
