import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check Sprint Service health' })
  @ApiResponse({
    status: 200,
    description: 'Sprint Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'AIPMS Sprint Service' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'AIPMS Sprint Service',
    };
  }
}
