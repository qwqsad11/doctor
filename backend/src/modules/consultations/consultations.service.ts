import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from './entities/consultation.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { QueryConsultationDto } from './dto/query-consultation.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private consultationsRepository: Repository<Consultation>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private auditService: AuditService,
    private usersService: UsersService,
  ) {}

  private isAdmin(user: CurrentUserPayload): boolean {
    return !!user?.roles?.includes('admin');
  }

  async create(dto: CreateConsultationDto, user: CurrentUserPayload) {
    const patient = await this.patientRepository.findOne({
      where: { id: dto.patient_id },
    });
    if (!patient) throw new BadRequestException('患者不存在');

    const consultation = this.consultationsRepository.create({
      ...dto,
      consultation_no: await this.generateNo(),
      patient_name: patient.name,
      doctor_id: this.isAdmin(user) ? null : user.userId,
      doctor_name: user.username,
      status: '待接诊' as const,
    });
    const saved = await this.consultationsRepository.save(consultation);
    await this.auditService.record(user, '新建问诊', saved.consultation_no, '成功');
    return saved;
  }

  async findAll(query: QueryConsultationDto, user: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, type, status } = query;
    const qb = this.consultationsRepository.createQueryBuilder('c');

    if (!this.isAdmin(user)) {
      qb.andWhere(`(c.doctor_id = :doctorId OR EXISTS (
        SELECT 1 FROM temp_permissions p WHERE p."userId" = :doctorId
        AND p."resourceType" = 'consultation' AND p."resourceId" = CAST(c.id AS varchar)
        AND p."permissionType" = 'view' AND p."revokedAt" IS NULL AND p."expiresAt" > :now
      ))`, { doctorId: user.userId, now: new Date() });
    }
    if (type) qb.andWhere('c.type = :type', { type });
    if (status) qb.andWhere('c.status = :status', { status });
    if (keyword) {
      qb.andWhere(
        '(c.patient_name ILIKE :kw OR c.consultation_no ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findOne(id: string, user?: CurrentUserPayload) {
    const consultation = await this.consultationsRepository.findOne({
      where: { id },
    });
    if (!consultation) throw new NotFoundException('问诊记录不存在');
    if (user && !this.isAdmin(user) && consultation.doctor_id !== user.userId && !(await this.usersService.canViewConsultation(user.userId, id))) {
      throw new ForbiddenException('无权访问该问诊');
    }
    return consultation;
  }

  async update(id: string, dto: UpdateConsultationDto, user: CurrentUserPayload) {
    const consultation = await this.findOne(id, user);
    if (dto.status === '进行中' && !consultation.started_at) {
      consultation.started_at = new Date();
    }
    if (dto.status === '已完成' && !consultation.ended_at) {
      consultation.ended_at = new Date();
    }
    Object.assign(consultation, dto);
    const saved = await this.consultationsRepository.save(consultation);
    if (dto.status === '已完成') await this.usersService.revokeConsultationPermissions(id, user);
    await this.auditService.record(user, '更新问诊', saved.consultation_no, '成功');
    return saved;
  }

  async remove(id: string, user: CurrentUserPayload) {
    const consultation = await this.findOne(id, user);
    await this.consultationsRepository.remove(consultation);
    await this.auditService.record(user, '删除问诊', consultation.consultation_no, '成功');
    return { message: '删除成功' };
  }

  private async generateNo(): Promise<string> {
    const last = await this.consultationsRepository
      .createQueryBuilder('c')
      .orderBy('c.consultation_no', 'DESC')
      .getOne();
    const seq = last ? parseInt(last.consultation_no.replace(/^C/, ''), 10) + 1 : 1;
    return `C${String(seq).padStart(3, '0')}`;
  }
}
