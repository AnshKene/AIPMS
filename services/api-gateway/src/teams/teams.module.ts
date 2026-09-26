import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';
import { ProxyService } from '../common/services/proxy.service.js';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, ProxyService],
  exports: [TeamsService],
})
export class TeamsModule {}
