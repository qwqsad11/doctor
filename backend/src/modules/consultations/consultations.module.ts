import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation } from './entities/consultation.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { UsersModule } from '../users/users.module';
import { InteractionsModule } from '../interactions/interactions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Consultation, Patient]), UsersModule, InteractionsModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
