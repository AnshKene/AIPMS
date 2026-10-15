import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check AI Service health' })
  @ApiResponse({
    status: 200,
    description: 'AI Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'AIPMS AI Intelligence Service' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'AIPMS AI Intelligence Service',
    };
  }
}
