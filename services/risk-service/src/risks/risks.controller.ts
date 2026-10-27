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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RisksService } from './risks.service.js';
import { CreateRiskDto } from './dto/create-risk.dto.js';
import { UpdateRiskDto } from './dto/update-risk.dto.js';
import { QueryRiskDto } from './dto/query-risk.dto.js';

@ApiTags('risks')
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

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
  @ApiOperation({ summary: 'Create a new risk (risk_score calculated automatically)' })
  @ApiCreatedResponse({ description: 'Risk created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  async create(
    @Body() dto: CreateRiskDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.risksService.create(dto, validAuth);
  }

  @Get()
  @ApiOperation({ summary: 'List risks with optional filtering and pagination' })
  @ApiOkResponse({ description: 'Paginated list of risks' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(
    @Query() query: QueryRiskDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.risksService.findAll(query, validAuth);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get risk details by ID' })
  @ApiParam({ name: 'id', description: 'Risk UUID' })
  @ApiOkResponse({ description: 'Risk details' })
  @ApiNotFoundResponse({ description: 'Risk not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.risksService.findOne(id, validAuth);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update risk details (recalculates risk_score if probability or impact changes)' })
  @ApiParam({ name: 'id', description: 'Risk UUID' })
  @ApiOkResponse({ description: 'Risk updated successfully' })
  @ApiNotFoundResponse({ description: 'Risk not found' })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRiskDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.risksService.update(id, dto, validAuth);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a risk by ID' })
  @ApiParam({ name: 'id', description: 'Risk UUID' })
  @ApiOkResponse({ description: 'Risk deleted successfully' })
  @ApiNotFoundResponse({ description: 'Risk not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async remove(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const validAuth = this.requireAuthHeader(authHeader);
    return this.risksService.remove(id, validAuth);
  }
}
