import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProxyService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
