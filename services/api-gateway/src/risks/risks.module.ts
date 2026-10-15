import { Module } from '@nestjs/common';
import { RisksController } from './risks.controller.js';
import { RisksService } from './risks.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [RisksController],
  providers: [RisksService, ProxyService],
  exports: [RisksService],
})
export class RisksModule {}
