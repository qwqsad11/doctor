import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conference } from './entities/conference.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateConferenceDto } from './dto/create-conference.dto';
import { UpdateConferenceDto } from './dto/update-conference.dto';
import { QueryConferenceDto } from './dto/query-conference.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ConferencesService {
  constructor(
    @InjectRepository(Conference)
    private conferencesRepository: Repository<Conference>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private auditService: AuditService,
  ) {}

  private isAdmin(user: CurrentUserPayload): boolean {
    return !!user?.roles?.includes('admin');
  }

  async create(dto: CreateConferenceDto, user: CurrentUserPayload) {
    let patientName: string | null = null;
    if (dto.patient_id) {
      const patient = await this.patientRepository.findOne({
        where: { id: dto.patient_id },
      });
      patientName = patient?.name ?? null;
    }

    const conference = this.conferencesRepository.create({
      ...dto,
      patient_name: patientName,
      conference_no: await this.generateNo(),
      initiator_id: this.isAdmin(user) ? null : user.userId,
      initiator_name: user.username,
      experts: dto.experts ?? [],
      status: '待会诊' as const,
    });
    const saved = await this.conferencesRepository.save(conference);
    await this.auditService.record(user, '发起会诊', saved.conference_no, '成功');
    return saved;
  }

  async findAll(query: QueryConferenceDto, user: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, status } = query;
    const qb = this.conferencesRepository.createQueryBuilder('c');

    if (!this.isAdmin(user)) {
      qb.andWhere('c.initiator_id = :initiatorId', {
        initiatorId: user.userId,
      });
    }
    if (status) qb.andWhere('c.status = :status', { status });
    if (keyword) {
      qb.andWhere('(c.topic ILIKE :kw OR c.patient_name ILIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    const [list, total] = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findOne(id: string, user?: CurrentUserPayload) {
    const conference = await this.conferencesRepository.findOne({
      where: { id },
    });
    if (!conference) throw new NotFoundException('会诊不存在');
    if (user && !this.isAdmin(user) && conference.initiator_id !== user.userId) throw new ForbiddenException('无权访问该会诊');
    return conference;
  }

  async update(id: string, dto: UpdateConferenceDto, user: CurrentUserPayload) {
    const conference = await this.findOne(id, user);
    Object.assign(conference, dto);
    const saved = await this.conferencesRepository.save(conference);
    await this.auditService.record(user, '更新会诊', saved.conference_no, '成功');
    return saved;
  }

  async remove(id: string, user: CurrentUserPayload) {
    const conference = await this.findOne(id, user);
    await this.conferencesRepository.remove(conference);
    await this.auditService.record(user, '删除会诊', conference.conference_no, '成功');
    return { message: '删除成功' };
  }

  private async generateNo(): Promise<string> {
    const last = await this.conferencesRepository
      .createQueryBuilder('c')
      .orderBy('c.conference_no', 'DESC')
      .getOne();
    const seq = last ? parseInt(last.conference_no.replace(/^CF/, ''), 10) + 1 : 1;
    return `CF${String(seq).padStart(3, '0')}`;
  }
}
