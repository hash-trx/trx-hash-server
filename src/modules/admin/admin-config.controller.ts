import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminService } from './admin.service';

@Controller('admin/config')
@UseGuards(AdminJwtGuard)
export class AdminConfigController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async get() {
    return this.admin.getSystemConfig();
  }

  @Patch()
  async patch(
    @Body()
    body: {
      activationAmountTrx?: number;
    },
  ) {
    return this.admin.updateSystemConfig(body);
  }
}

