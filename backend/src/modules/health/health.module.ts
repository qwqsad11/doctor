import { HealthEntry } from "./entities/health-entry.entity";
import { HealthReminder } from "./entities/health-reminder.entity";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthRecord } from "./entities/health-record.entity";
import { Patient } from "../patients/entities/patient.entity";
import { HealthService } from "./health.service";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HealthRecord,
      Patient,
      HealthEntry,
      HealthReminder,
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
