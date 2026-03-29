import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { FeedbackService } from '../feedback/feedback.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin/feedback')
@UseGuards(AdminJwtGuard)
export class AdminFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.feedback.listFeedback(
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.feedback.getFeedback(parseInt(id, 10));
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() body: { status?: string; adminNote?: string | null }) {
    return this.feedback.updateFeedback(parseInt(id, 10), body);
  }
}
