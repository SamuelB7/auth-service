import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AuthController } from './controllers/auth.controller';
import { PrismaService } from './database/prisma.service';
import { EventsConsumer } from './events.consumer';
import { EventsProducer } from './events.producer';
import { AccessTokenGuard } from './guards/access-token.guard';
import { kafkaClientProvider } from './kafka.config';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';

@Module({
  imports: [ClientsModule.register([kafkaClientProvider()]), JwtModule.register({})],
  controllers: [AppController, AuthController, EventsConsumer],
  providers: [EventsProducer, PrismaService, AuthRepository, AuthService, AccessTokenGuard]
})
export class AppModule {}
