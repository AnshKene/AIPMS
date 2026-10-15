import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check Risk Service health' })
  @ApiResponse({
    status: 200,
    description: 'Risk Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'AIPMS Risk Service' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'AIPMS Risk Service',
    };
  }
}
