import { Controller, Get, Headers, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/roles.enum.js';

@ApiTags('Admin')
@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get administrative system overview (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Admin overview metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an ADMIN' })
  async getOverview(@Headers('authorization') authHeader?: string) {
    return this.adminService.getAdminOverview(authHeader);
  }

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query security and administrative audit logs (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const query: Record<string, string> = {};
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;
    if (search) query.search = search;
    if (page) query.page = page;
    if (limit) query.limit = limit;

    return this.adminService.getAuditLogs(query, authHeader);
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed system health checks for all microservices (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Aggregated health check status' })
  async getSystemHealth() {
    return this.adminService.checkAllServicesHealth();
  }

  @Get('workspaces')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get global workspace project & team governance summary (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Workspace administration summary' })
  async getWorkspaces(@Headers('authorization') authHeader?: string) {
    return this.adminService.getWorkspaces(authHeader);
  }
}
