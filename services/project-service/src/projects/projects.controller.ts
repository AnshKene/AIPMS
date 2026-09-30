import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab' },
        name: { type: 'string', example: 'AIPMS' },
        description: { type: 'string', example: 'AI-Based Project Management System' },
        status: { type: 'string', example: 'PLANNING' },
        startDate: { type: 'string', example: '2026-09-25T00:00:00.000Z' },
        endDate: { type: 'string', example: '2026-12-31T00:00:00.000Z' },
        ownerId: { type: 'string', example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab' },
        createdAt: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
        updatedAt: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation Error' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return authHeader
      ? this.projectsService.create(createProjectDto, authHeader)
      : this.projectsService.create(createProjectDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all projects with pagination and status filter' })
  @ApiResponse({
    status: 200,
    description: 'Projects listed successfully',
  })
  async findAll(
    @Query() query: QueryProjectDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return authHeader
      ? this.projectsService.findAll(query, authHeader)
      : this.projectsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return authHeader
      ? this.projectsService.findOne(id, authHeader)
      : this.projectsService.findOne(id);
  }

  @Patch(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unarchive a project (sets status to ACTIVE)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project unarchived successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or project is not archived' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async unarchive(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return authHeader
      ? this.projectsService.unarchive(id, authHeader)
      : this.projectsService.unarchive(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or UUID' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return authHeader
      ? this.projectsService.update(id, updateProjectDto, authHeader)
      : this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a project (sets status to ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project archived successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async archive(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return authHeader
      ? this.projectsService.archive(id, authHeader)
      : this.projectsService.archive(id);
  }
}
