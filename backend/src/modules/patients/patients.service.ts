import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
    private auditService: AuditService,
  ) {}

  private isAdmin(user: CurrentUserPayload): boolean {
    return !!user?.roles?.includes('admin');
  }

  async create(dto: CreatePatientDto, user: CurrentUserPayload) {
    const patient = this.patientsRepository.create({
      ...dto,
      patient_no: await this.generatePatientNo(),
      doctor_id: this.isAdmin(user) ? null : user.userId,
    });
    const saved = await this.patientsRepository.save(patient);
    await this.auditService.record(user, "Add patient", saved.name, '成功');
    return saved;
  }

  async findAll(query: QueryPatientDto, user: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, status, group } = query;
    const qb = this.patientsRepository.createQueryBuilder('p');

    // 数据范围：非管理员只能看到自己负责的患者
    if (!this.isAdmin(user)) {
      qb.andWhere('p.doctor_id = :doctorId', { doctorId: user.userId });
    }
    if (status) qb.andWhere('p.status = :status', { status });
    if (group) qb.andWhere('p.patient_group = :group', { group });
    if (keyword) {
      qb.andWhere(
        '(p.name ILIKE :kw OR p.patient_no ILIKE :kw OR p.symptom ILIKE :kw OR p.patient_group ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findOne(id: string, user?: CurrentUserPayload) {
    const patient = await this.patientsRepository.findOne({ where: { id } });
    if (!patient) throw new NotFoundException("Patient not found");
    if (user && !this.isAdmin(user) && patient.doctor_id !== user.userId) {
      throw new ForbiddenException("You do not have access to this patient profile");
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, user: CurrentUserPayload) {
    const patient = await this.findOne(id, user);
    Object.assign(patient, dto);
    const saved = await this.patientsRepository.save(patient);
    await this.auditService.record(user, "Update patient profile", saved.name, '成功');
    return saved;
  }

  async remove(id: string, user: CurrentUserPayload) {
    const patient = await this.findOne(id, user);
    await this.patientsRepository.remove(patient);
    await this.auditService.record(user, "Delete patient", patient.name, '成功');
    return { message: "Deleted successfully" };
  }

  private async generatePatientNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `P${year}`;
    const last = await this.patientsRepository
      .createQueryBuilder('p')
      .where('p.patient_no LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('p.patient_no', 'DESC')
      .getOne();
    const seq = last
      ? parseInt(last.patient_no.slice(prefix.length), 10) + 1
      : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }
}
