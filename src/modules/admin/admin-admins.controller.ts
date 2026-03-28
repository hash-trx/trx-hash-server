import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

type ReqAdmin = { admin: { id: number; email: string } };

@Controller('admin/admins')
@UseGuards(AdminJwtGuard)
export class AdminAdminsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listAdmins();
  }

  @Post()
  create(@Body() body: { email?: string; password?: string }) {
    return this.admin.createAdmin({ email: body.email ?? '', password: body.password ?? '' });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { email?: string; password?: string }) {
    return this.admin.updateAdmin(parseInt(id, 10), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: ReqAdmin) {
    return this.admin.deleteAdmin(parseInt(id, 10), req.admin.id);
  }
}
