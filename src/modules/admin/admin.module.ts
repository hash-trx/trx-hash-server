import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAdminsController } from './admin-admins.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminMarketController } from './admin-market.controller';
import { AdminService } from './admin.service';
import { AdminStrategiesController } from './admin-strategies.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'trx-hash-dev-secret',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminStrategiesController,
    AdminMarketController,
    AdminAdminsController,
  ],
  providers: [AdminAuthService, AdminService, AdminJwtGuard],
  exports: [AdminAuthService, AdminService],
})
export class AdminModule {}
