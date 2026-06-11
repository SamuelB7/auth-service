import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { EventsConsumer } from './events.consumer';
import { EventsProducer } from './events.producer';
import { IdentityModule } from './identity/identity.module';
import { kafkaClientProvider } from './kafka.config';

@Module({
  imports: [ClientsModule.register([kafkaClientProvider()]), IdentityModule],
  controllers: [AppController, EventsConsumer],
  providers: [EventsProducer]
})
export class AppModule {}
