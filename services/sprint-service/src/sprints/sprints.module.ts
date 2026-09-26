import { Module } from '@nestjs/common';
import { SprintsController } from './sprints.controller.js';
import { SprintsService } from './sprints.service.js';

@Module({
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
