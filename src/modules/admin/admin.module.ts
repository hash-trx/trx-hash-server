import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAdminsController } from './admin-admins.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminFeedbackController } from './admin-feedback.controller';
import { AdminUiController } from './admin-ui.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminMarketController } from './admin-market.controller';
import { AdminService } from './admin.service';
import { AdminStrategiesController } from './admin-strategies.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { FeedbackModule } from '../feedback/feedback.module';
import { AdminStakingPresetsController } from './admin-staking-presets.controller';

@Module({
  imports: [
    PrismaModule,
    FeedbackModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'trx-hash-dev-secret',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [
    AdminUiController,
    AdminAuthController,
    AdminUsersController,
    AdminStrategiesController,
    AdminMarketController,
    AdminStakingPresetsController,
    AdminAdminsController,
    AdminFeedbackController,
  ],
  providers: [AdminAuthService, AdminService, AdminJwtGuard],
  exports: [AdminAuthService, AdminService],
})
export class AdminModule {}
