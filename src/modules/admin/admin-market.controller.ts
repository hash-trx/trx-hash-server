import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin/market-bankers')
@UseGuards(AdminJwtGuard)
export class AdminMarketController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listBankers();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      address: string;
      odds: number;
      rebate?: number;
      sortOrder?: number;
      note?: string;
      description?: string;
    },
  ) {
    return this.admin.createBanker(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      address?: string;
      odds?: number;
      rebate?: number;
      sortOrder?: number;
      note?: string | null;
      description?: string | null;
    },
  ) {
    return this.admin.updateBanker(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.admin.deleteBanker(parseInt(id, 10));
  }
}
