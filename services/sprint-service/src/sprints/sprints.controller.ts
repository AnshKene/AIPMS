import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SprintsService } from './sprints.service.js';
import { CreateSprintDto } from './dto/create-sprint.dto.js';
import { UpdateSprintDto } from './dto/update-sprint.dto.js';
import { QuerySprintDto } from './dto/query-sprint.dto.js';

@ApiTags('sprints')
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sprint (initial status is always PLANNED)' })
  @ApiCreatedResponse({ description: 'Sprint created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input or date validation failed' })
  async create(@Body() dto: CreateSprintDto) {
    return this.sprintsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sprints with optional filtering and pagination' })
  @ApiOkResponse({ description: 'Paginated list of sprints' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(@Query() query: QuerySprintDto) {
    return this.sprintsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sprint details by ID' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiOkResponse({ description: 'Sprint details' })
  @ApiNotFoundResponse({ description: 'Sprint not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sprint details (cannot modify status)' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiOkResponse({ description: 'Sprint updated successfully' })
  @ApiNotFoundResponse({ description: 'Sprint not found' })
  @ApiBadRequestResponse({ description: 'Invalid input or date validation failed' })
  async update(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    return this.sprintsService.update(id, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a sprint (PLANNED -> ACTIVE)' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiOkResponse({ description: 'Sprint started successfully' })
  @ApiConflictResponse({ description: 'Invalid status transition (must be PLANNED)' })
  @ApiNotFoundResponse({ description: 'Sprint not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async start(@Param('id') id: string) {
    return this.sprintsService.start(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a sprint (ACTIVE -> COMPLETED)' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiOkResponse({ description: 'Sprint completed successfully' })
  @ApiConflictResponse({ description: 'Invalid status transition (must be ACTIVE)' })
  @ApiNotFoundResponse({ description: 'Sprint not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async complete(@Param('id') id: string) {
    return this.sprintsService.complete(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a sprint (PLANNED/ACTIVE -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiOkResponse({ description: 'Sprint cancelled successfully' })
  @ApiConflictResponse({ description: 'Invalid status transition (cannot cancel COMPLETED/CANCELLED)' })
  @ApiNotFoundResponse({ description: 'Sprint not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async cancel(@Param('id') id: string) {
    return this.sprintsService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a PLANNED sprint' })
  @ApiParam({ name: 'id', description: 'Sprint UUID' })
  @ApiOkResponse({ description: 'Sprint deleted successfully' })
  @ApiConflictResponse({ description: 'Only PLANNED sprints can be deleted' })
  @ApiNotFoundResponse({ description: 'Sprint not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }
}
