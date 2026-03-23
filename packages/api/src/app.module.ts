import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { GuestsModule } from './modules/guests/guests.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { PostStayModule } from './modules/post-stay/post-stay.module';

@Module({
  imports: [
    AuthModule,
    DashboardModule,
    BuildingsModule,
    BookingsModule,
    GuestsModule,
    IncidentsModule,
    AiAgentModule,
    PostStayModule,
  ],
})
export class AppModule {}
