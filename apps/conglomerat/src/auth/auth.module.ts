import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BattleNetStrategy } from './strategies/battle-net.strategy';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [AuthService, BattleNetStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
