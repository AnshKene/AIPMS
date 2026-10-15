import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { OllamaService } from './ollama.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, OllamaService],
  exports: [AiService],
})
export class AiModule {}
