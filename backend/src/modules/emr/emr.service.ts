import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emr } from './entities/emr.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateEmrDto } from './dto/create-emr.dto';
import { UpdateEmrDto } from './dto/update-emr.dto';
import { QueryEmrDto } from './dto/query-emr.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EmrService {
  constructor(
    @InjectRepository(Emr)
    private emrRepository: Repository<Emr>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private auditService: AuditService,
  ) {}

  private isAdmin(user: CurrentUserPayload): boolean {
    return !!user?.roles?.includes('admin');
  }

  async create(dto: CreateEmrDto, user: CurrentUserPayload) {
    const patient = await this.patientRepository.findOne({
      where: { id: dto.patient_id },
    });
    if (!patient) throw new BadRequestException('患者不存在');

    const emr = this.emrRepository.create({
      ...dto,
      emr_no: await this.generateEmrNo(),
      patient_name: patient.name,
      doctor_id: this.isAdmin(user) ? null : user.userId,
      doctor_name: user.username,
      status: '草稿' as const,
    });
    const saved = await this.emrRepository.save(emr);
    await this.auditService.record(user, '新建病历', saved.emr_no, '成功');
    return saved;
  }

  async findAll(query: QueryEmrDto, user: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, type, status } = query;
    const qb = this.emrRepository.createQueryBuilder('e');

    if (!this.isAdmin(user)) {
      qb.andWhere('e.doctor_id = :doctorId', { doctorId: user.userId });
    }
    if (type) qb.andWhere('e.type = :type', { type });
    if (status) qb.andWhere('e.status = :status', { status });
    if (keyword) {
      qb.andWhere(
        '(e.patient_name ILIKE :kw OR e.emr_no ILIKE :kw OR e.diagnosis ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('e.updated_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findOne(id: string, user?: CurrentUserPayload) {
    const emr = await this.emrRepository.findOne({ where: { id } });
    if (!emr) throw new NotFoundException('病历不存在');
    if (user && !this.isAdmin(user) && emr.doctor_id !== user.userId) throw new ForbiddenException('无权访问该病历');
    return emr;
  }

  async update(id: string, dto: UpdateEmrDto, user: CurrentUserPayload) {
    const emr = await this.findOne(id, user);
    Object.assign(emr, dto);
    const saved = await this.emrRepository.save(emr);
    await this.auditService.record(user, '修改病历', saved.emr_no, '成功');
    return saved;
  }

  async remove(id: string, user: CurrentUserPayload) {
    const emr = await this.findOne(id, user);
    await this.emrRepository.remove(emr);
    await this.auditService.record(user, '删除病历', emr.emr_no, '成功');
    return { message: '删除成功' };
  }

  private async generateEmrNo(): Promise<string> {
    const last = await this.emrRepository
      .createQueryBuilder('e')
      .orderBy('e.emr_no', 'DESC')
      .getOne();
    const seq = last ? parseInt(last.emr_no.replace(/^E/, ''), 10) + 1 : 1;
    return `E${String(seq).padStart(3, '0')}`;
  }
}
