import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get('telegram-link')
  telegramLink() {
    return { ok: true, url: this.feedback.getTelegramInviteUrl() };
  }

  @Post()
  async submit(
    @Headers('authorization') authHeader: string | undefined,
    @Body()
    body: {
      subject?: string;
      content?: string;
      contact?: string;
      clientVersion?: string;
    },
  ) {
    return this.feedback.createFeedback(authHeader, body);
  }
}
