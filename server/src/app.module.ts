import { DrizzleBetterSQLiteModule } from '@knaadh/nestjs-drizzle-better-sqlite3';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { controllers } from './controllers';
import { schema } from './db/schema';
import { gateways } from './gateways';
import { proxies } from './proxies';
import { repositories } from './repositories';
import { services } from './services';

const database = DrizzleBetterSQLiteModule.register({
  tag: 'db',
  sqlite3: {
    filename: 'localbuddy.db',
  },
  config: { schema: { ...schema } },
});

@Module({
  imports: [ConfigModule.forRoot(), EventEmitterModule.forRoot(), database],
  controllers: [...controllers],
  providers: [...services, ...gateways, ...repositories, ...proxies],
})
export class AppModule {}
