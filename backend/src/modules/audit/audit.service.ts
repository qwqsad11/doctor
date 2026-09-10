import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditDto } from './dto/query-audit.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * 记录一条审计日志（审计失败不阻断业务）
   */
  async record(
    user: CurrentUserPayload,
    action: string,
    target: string,
    result: '成功' | '失败' = '成功',
    ip?: string,
  ): Promise<void> {
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          operator: user?.username,
          operator_id: user?.userId,
          action,
          target,
          result,
          ip,
        }),
      );
    } catch (e) {
      // 审计失败不应影响主流程
    }
  }

  /**
   * 分页查询审计日志
   */
  async findAll(query: QueryAuditDto) {
    const { page = 1, pageSize = 10, keyword, action, operator, result } = query;
    const qb = this.auditRepository.createQueryBuilder('a');

    if (result) qb.andWhere('a.result = :result', { result });
    if (action) qb.andWhere('a.action = :action', { action });
    if (operator)
      qb.andWhere('a.operator ILIKE :operator', { operator: `%${operator}%` });
    if (keyword) {
      qb.andWhere(
        '(a.operator ILIKE :kw OR a.target ILIKE :kw OR a.action ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }
}
