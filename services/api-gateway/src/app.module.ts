import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { SprintsModule } from './sprints/sprints.module.js';
import { RisksModule } from './risks/risks.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AiModule } from './ai/ai.module.js';
import { AdminModule } from './admin/admin.module.js';
import { RequestLoggerMiddleware } from './common/middleware/logger.middleware.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ProjectsModule,
    TeamsModule,
    TasksModule,
    SprintsModule,
    RisksModule,
    ReportsModule,
    AiModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
