import { Module } from '@nestjs/common';
import { GatekeeperService } from './gatekeeper.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { redisConfig } from '@app/configuration';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
    }),
  ],
  controllers: [],
  providers: [GatekeeperService],
})
export class GatekeeperModule {}
