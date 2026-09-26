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

  @Post()
  @ApiOperation({ summary: 'Create a new risk (risk_score calculated automatically)' })
  @ApiCreatedResponse({ description: 'Risk created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  async create(@Body() dto: CreateRiskDto) {
    return this.risksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List risks with optional filtering and pagination' })
  @ApiOkResponse({ description: 'Paginated list of risks' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(@Query() query: QueryRiskDto) {
    return this.risksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get risk details by ID' })
  @ApiParam({ name: 'id', description: 'Risk UUID' })
  @ApiOkResponse({ description: 'Risk details' })
  @ApiNotFoundResponse({ description: 'Risk not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async findOne(@Param('id') id: string) {
    return this.risksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update risk details (recalculates risk_score if probability or impact changes)' })
  @ApiParam({ name: 'id', description: 'Risk UUID' })
  @ApiOkResponse({ description: 'Risk updated successfully' })
  @ApiNotFoundResponse({ description: 'Risk not found' })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  async update(@Param('id') id: string, @Body() dto: UpdateRiskDto) {
    return this.risksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a risk by ID' })
  @ApiParam({ name: 'id', description: 'Risk UUID' })
  @ApiOkResponse({ description: 'Risk deleted successfully' })
  @ApiNotFoundResponse({ description: 'Risk not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async remove(@Param('id') id: string) {
    return this.risksService.remove(id);
  }
}
