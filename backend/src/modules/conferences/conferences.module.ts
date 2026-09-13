import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Conference } from "./entities/conference.entity";
import { Patient } from "../patients/entities/patient.entity";
import { ConferencesService } from "./conferences.service";
import { ConferencesController } from "./conferences.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Conference, Patient])],
  controllers: [ConferencesController],
  providers: [ConferencesService],
  exports: [ConferencesService],
})
export class ConferencesModule {}
