import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [TasksController],
  providers: [TasksService, ProxyService],
  exports: [TasksService],
})
export class TasksModule {}
