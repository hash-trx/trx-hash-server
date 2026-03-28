import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin/users')
@UseGuards(AdminJwtGuard)
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    return this.admin.listUsers(page ? parseInt(page, 10) : undefined, pageSize ? parseInt(pageSize, 10) : undefined, q);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.admin.getUser(parseInt(id, 10));
  }

  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body()
    body: {
      email?: string;
      subExpire?: string | null;
      pnlTotal?: number;
      betCountTotal?: number;
      betAmountTotal?: number;
    },
  ) {
    return this.admin.updateUser(parseInt(id, 10), body);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword?: string }) {
    return this.admin.resetUserPassword(parseInt(id, 10), body.newPassword ?? '');
  }
}
