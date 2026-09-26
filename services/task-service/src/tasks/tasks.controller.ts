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
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { QueryTaskDto } from './dto/query-task.dto.js';
import { AddTaskDependencyDto } from './dto/add-task-dependency.dto.js';
import { QueryTaskDependencyDto } from './dto/query-task-dependency.dto.js';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ description: 'Task created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input or date validation failed' })
  async create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with optional filtering and pagination' })
  @ApiOkResponse({ description: 'Paginated list of tasks' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(@Query() query: QueryTaskDto) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiOkResponse({ description: 'Task details' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiOkResponse({ description: 'Updated task details' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid input or date validation failed' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiOkResponse({ description: 'Task deleted successfully' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add a dependency to a task' })
  @ApiParam({ name: 'id', description: 'Task UUID that depends on another task' })
  @ApiCreatedResponse({ description: 'Dependency added successfully' })
  @ApiBadRequestResponse({ description: 'Self-reference or invalid UUID' })
  @ApiConflictResponse({ description: 'Dependency relationship already exists' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  async addDependency(
    @Param('id') taskId: string,
    @Body() dto: AddTaskDependencyDto,
  ) {
    return this.tasksService.addDependency(taskId, dto);
  }

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'List dependencies of a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiOkResponse({ description: 'Paginated list of task dependencies' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters or UUID format' })
  async listDependencies(
    @Param('id') taskId: string,
    @Query() query: QueryTaskDependencyDto,
  ) {
    return this.tasksService.listDependencies(taskId, query);
  }

  @Delete(':taskId/dependencies/:dependencyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a dependency from a task' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiParam({ name: 'dependencyId', description: 'Task dependency record UUID to remove' })
  @ApiOkResponse({ description: 'Dependency removed successfully' })
  @ApiNotFoundResponse({ description: 'Dependency relationship or task not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async removeDependency(
    @Param('taskId') taskId: string,
    @Param('dependencyId') dependencyId: string,
  ) {
    return this.tasksService.removeDependency(taskId, dependencyId);
  }
}
