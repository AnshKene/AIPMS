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
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { QueryProjectDto } from './dto/query-project.dto.js';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  private requireAuthHeader(authHeader?: string): string {
    if (!authHeader || !authHeader.trim().toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Authentication token required');
    }
    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }
    return authHeader;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation Error' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to create a project' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.create(createProjectDto, validAuth);
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
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.findAll(query, validAuth);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have project access' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.findOne(id, validAuth);
  }

  @Patch(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unarchive a project (sets status to ACTIVE)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project unarchived successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or project is not archived' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner or admin can unarchive' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async unarchive(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.unarchive(id, validAuth);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or UUID' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner, assigned PM, or admin can update' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.update(id, updateProjectDto, validAuth);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a project (sets status to ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project archived successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only owner or admin can archive' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async archive(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.archive(id, validAuth);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer project ownership to a new owner' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Ownership transferred successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format or project is archived' })
  @ApiResponse({ status: 403, description: 'Forbidden - only project owner or admin can transfer ownership' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async transferOwnership(
    @Param('id') id: string,
    @Body() transferOwnershipDto: TransferOwnershipDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.transferOwnership(id, transferOwnershipDto, validAuth);
  }

  // ─── Project Members Endpoints ──────────────────────────────────────────

  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List members assigned to a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project members retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not have project access' })
  async getMembers(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.getMembers(id, validAuth);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a member or project manager to a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 201, description: 'Project member assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only project owner or admin can assign members' })
  @ApiResponse({ status: 409, description: 'Conflict - User is already assigned to this project' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddProjectMemberDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.addMember(id, dto, validAuth);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove from project' })
  @ApiResponse({ status: 200, description: 'Project member removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only project owner or admin can remove members' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.projectsService.removeMember(id, userId, validAuth);
  }
}
