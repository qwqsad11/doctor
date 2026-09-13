import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Emr } from "./entities/emr.entity";
import { Patient } from "../patients/entities/patient.entity";
import { EmrService } from "./emr.service";
import { EmrController } from "./emr.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Emr, Patient])],
  controllers: [EmrController],
  providers: [EmrService],
  exports: [EmrService],
})
export class EmrModule {}
