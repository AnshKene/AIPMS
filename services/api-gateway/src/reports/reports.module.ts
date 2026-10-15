import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ProxyService],
  exports: [ReportsService],
})
export class ReportsModule {}
