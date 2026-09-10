import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthRecord } from './entities/health-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { QueryHealthRecordDto } from './dto/query-health-record.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthRecord)
    private healthRepository: Repository<HealthRecord>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private auditService: AuditService,
  ) {}

  private isAdmin(user: CurrentUserPayload): boolean {
    return !!user?.roles?.includes('admin');
  }

  async create(dto: CreateHealthRecordDto, user: CurrentUserPayload) {
    const patient = await this.patientRepository.findOne({
      where: { id: dto.patient_id },
    });
    if (!patient) throw new BadRequestException('患者不存在');

    const record = this.healthRepository.create({
      ...dto,
      patient_name: patient.name,
      doctor_id: this.isAdmin(user) ? null : user.userId,
    });
    const saved = await this.healthRepository.save(record);
    await this.auditService.record(user, '制定健康计划', saved.patient_name, '成功');
    return saved;
  }

  async findAll(query: QueryHealthRecordDto, user: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, alert_level } = query;
    const qb = this.healthRepository.createQueryBuilder('h');

    if (!this.isAdmin(user)) {
      qb.andWhere('h.doctor_id = :doctorId', { doctorId: user.userId });
    }
    if (alert_level) qb.andWhere('h.alert_level = :alert_level', { alert_level });
    if (keyword) {
      qb.andWhere('(h.patient_name ILIKE :kw OR h.plan ILIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    const [list, total] = await qb
      .orderBy('h.updated_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findOne(id: string) {
    const record = await this.healthRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('健康记录不存在');
    return record;
  }

  async update(id: string, dto: UpdateHealthRecordDto, user: CurrentUserPayload) {
    const record = await this.findOne(id);
    Object.assign(record, dto);
    const saved = await this.healthRepository.save(record);
    await this.auditService.record(user, '调整健康计划', saved.patient_name, '成功');
    return saved;
  }

  async remove(id: string, user: CurrentUserPayload) {
    const record = await this.findOne(id);
    await this.healthRepository.remove(record);
    await this.auditService.record(user, '删除健康计划', record.patient_name, '成功');
    return { message: '删除成功' };
  }
}
