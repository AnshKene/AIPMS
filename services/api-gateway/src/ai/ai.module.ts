import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [AiController],
  providers: [AiService, ProxyService],
  exports: [AiService],
})
export class AiModule {}
