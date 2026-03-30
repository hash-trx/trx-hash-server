import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin/staking-presets')
@UseGuards(AdminJwtGuard)
export class AdminStakingPresetsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listStakingPresets();
  }

  @Post()
  create(
    @Body()
    body: {
      kind: string;
      name: string;
      paramsSchema?: unknown;
      enabled?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.admin.createStakingPreset(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      kind?: string;
      name?: string;
      paramsSchema?: unknown;
      enabled?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.admin.updateStakingPreset(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.admin.deleteStakingPreset(parseInt(id, 10));
  }
}

