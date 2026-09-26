import { Module } from '@nestjs/common';
import { SprintsController } from './sprints.controller.js';
import { SprintsService } from './sprints.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [SprintsController],
  providers: [SprintsService, ProxyService],
  exports: [SprintsService],
})
export class SprintsModule {}
