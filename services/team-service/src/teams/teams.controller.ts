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
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { QueryTeamDto } from './dto/query-team.dto.js';
import { AddTeamMemberDto } from './dto/add-team-member.dto.js';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';
import { QueryTeamMemberDto } from './dto/query-team-member.dto.js';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // --- TEAMS ENDPOINTS ---

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new team for a project' })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab' },
        projectId: { type: 'string', example: 'e1b2c3d4-5678-90ab-cdef-1234567890ab' },
        name: { type: 'string', example: 'Development Team' },
        description: { type: 'string', example: 'AIPMS development team' },
        createdAt: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
        updatedAt: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation Error' })
  async createTeam(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.createTeam(createTeamDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List teams with pagination and project filter' })
  @ApiResponse({ status: 200, description: 'Teams listed successfully' })
  async findAllTeams(@Query() query: QueryTeamDto) {
    return this.teamsService.findAllTeams(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get team details by team UUID' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOneTeam(@Param('id') id: string) {
    return this.teamsService.findOneTeam(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update team details' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or UUID' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async updateTeam(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(id, updateTeamDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a team and its members (cascade)' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async removeTeam(@Param('id') id: string) {
    return this.teamsService.removeTeam(id);
  }

  // --- TEAM MEMBERS ENDPOINTS ---

  @Post(':teamId/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a user member to a team' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'f0a1b2c3-4567-89ab-cdef-0123456789ab' },
        teamId: { type: 'string', example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab' },
        userId: { type: 'string', example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab' },
        role: { type: 'string', example: 'TEAM_LEAD' },
        createdAt: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request / Invalid Role or UUID' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({ status: 409, description: 'Conflict - User is already a member of this team' })
  async addMember(
    @Param('teamId') teamId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
  ) {
    return this.teamsService.addMember(teamId, addTeamMemberDto);
  }

  @Get(':teamId/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List members of a team with pagination' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team members listed successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findMembers(
    @Param('teamId') teamId: string,
    @Query() query: QueryTeamMemberDto,
  ) {
    return this.teamsService.findMembers(teamId, query);
  }

  @Patch(':teamId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a member role in a team' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiParam({ name: 'memberId', description: 'Team Member UUID' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role or UUID' })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
  ) {
    return this.teamsService.updateMemberRole(teamId, memberId, updateTeamMemberDto);
  }

  @Delete(':teamId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a team' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiParam({ name: 'memberId', description: 'Team Member UUID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMember(teamId, memberId);
  }
}
