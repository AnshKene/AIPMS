import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export interface HealthCheckResponse {
  status: string;
  service: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check health status of API Gateway' })
  @ApiResponse({
    status: 200,
    description: 'API Gateway is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'AIPMS API Gateway' },
      },
    },
  })
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'AIPMS API Gateway',
    };
  }
}
