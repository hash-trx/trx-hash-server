import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin/strategies')
@UseGuards(AdminJwtGuard)
export class AdminStrategiesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listStrategies();
  }

  @Post()
  create(
    @Body()
    body: {
      id: number;
      name: string;
      price: number;
      scriptUrl?: string;
      description?: string;
      entry?: unknown;
      notes?: unknown;
      scriptCode: string;
      paramsSchema?: unknown;
      isHot?: boolean;
    },
  ) {
    return this.admin.createStrategy(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      price?: number;
      scriptUrl?: string;
      description?: string | null;
      entry?: unknown;
      notes?: unknown;
      scriptCode?: string | null;
      paramsSchema?: unknown;
      isHot?: boolean;
    },
  ) {
    return this.admin.updateStrategy(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.admin.deleteStrategy(parseInt(id, 10));
  }
}
