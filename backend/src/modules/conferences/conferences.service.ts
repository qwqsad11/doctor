import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { randomUUID } from "crypto";
import {
  Conference,
  ConferenceParticipant,
} from "./entities/conference.entity";
import { Patient } from "../patients/entities/patient.entity";
import { User } from "../users/entities/user.entity";
import { CreateConferenceDto } from "./dto/create-conference.dto";
import { UpdateConferenceDto } from "./dto/update-conference.dto";
import { QueryConferenceDto } from "./dto/query-conference.dto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../audit/audit.service";
@Injectable()
export class ConferencesService {
  constructor(
    @InjectRepository(Conference) private repo: Repository<Conference>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    private audit: AuditService,
  ) {}
  private admin(u: CurrentUserPayload) {
    return u.roles.includes("admin");
  }
  private host(c: Conference, u: CurrentUserPayload) {
    return this.admin(u) || c.initiator_id === u.userId;
  }
  private async current(u: CurrentUserPayload) {
    const user = await this.repo.manager.findOne(User, {
      where: { id: u.userId, status: "active" },
    });
    if (!user) throw new ForbiddenException("账号已停用");
    return user;
  }
  private eligible(u: User) {
    return u.roles.some((r) =>
      ["doctor", "senior_doctor", "consultation_expert"].includes(r),
    );
  }
  private async participants(
    ids: string[],
    initiator: string,
    previous: ConferenceParticipant[] = [],
  ) {
    if (ids.includes(initiator))
      throw new BadRequestException("发起人无需重复邀请自己");
    const users = ids.length
      ? await this.repo.manager.find(User, {
          where: { id: In(ids), status: "active" },
        })
      : [];
    if (users.length !== ids.length || users.some((u) => !this.eligible(u)))
      throw new BadRequestException("请选择有效且在职的医生账号");
    return ids.map((id) => {
      const user = users.find((u) => u.id === id)!;
      const old = previous.find((p) => p.id === id);
      return {
        id,
        name: user.real_name || user.username,
        department: user.department || "未设置科室",
        title: user.title || "",
        response: old?.response || "待响应",
        responded_at: old?.responded_at || null,
      } as ConferenceParticipant;
    });
  }
  async create(dto: CreateConferenceDto, u: CurrentUserPayload) {
    const actor = await this.current(u);
    if (!this.admin(u) && !this.eligible(actor))
      throw new ForbiddenException("仅医生可发起会诊");
    if (!dto.topic.trim() || Object.values(dto).some((v) => v === null))
      throw new BadRequestException("会诊字段不能为空或 null");
    if (!dto.expert_ids?.length && !dto.experts?.length)
      throw new BadRequestException("请至少选择一名参会医生");
    if (dto.expert_ids?.length && dto.experts?.length)
      throw new BadRequestException("请选择医生账号，不要同时提交手填专家姓名");
    let patientName: string | null = null;
    if (dto.patient_id) {
      const patient = await this.patients.findOne({
        where: { id: dto.patient_id },
      });
      if (!patient) throw new BadRequestException("患者不存在");
      if (!this.admin(u) && patient.doctor_id !== u.userId)
        throw new ForbiddenException("无权为该患者发起会诊");
      patientName = patient.name;
    }
    const participants = await this.participants(
      dto.expert_ids || [],
      u.userId,
    );
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        patient_name: patientName,
        conference_no:
          "CF" + randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase(),
        initiator_id: u.userId,
        initiator_name: actor.real_name || u.username,
        initiator_department: actor.department || "未设置科室",
        expert_ids: dto.expert_ids || [],
        participants,
        experts: participants.length
          ? participants.map((p) => p.name)
          : dto.experts || [],
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
        status: "待会诊",
      }),
    );
    await this.audit.record(u, "发起跨科室会诊", saved.conference_no);
    return saved;
  }
  async findAll(q: QueryConferenceDto, u: CurrentUserPayload) {
    await this.current(u);
    const { page = 1, pageSize = 10, keyword, status } = q;
    const qb = this.repo.createQueryBuilder("c");
    if (!this.admin(u))
      qb.andWhere("(c.initiator_id = :uid OR :uid = ANY(c.expert_ids))", {
        uid: u.userId,
      });
    if (status) qb.andWhere("c.status = :status", { status });
    if (keyword)
      qb.andWhere("(c.topic ILIKE :kw OR c.patient_name ILIKE :kw)", {
        kw: "%" + keyword + "%",
      });
    const [list, total] = await qb
      .orderBy("c.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }
  async findOne(id: string, u: CurrentUserPayload) {
    await this.current(u);
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException("会诊不存在");
    if (!this.host(c, u) && !c.expert_ids.includes(u.userId))
      throw new ForbiddenException("无权访问该会诊");
    return c;
  }
  private async mutate(
    id: string,
    u: CurrentUserPayload,
    action: string,
    change: (c: Conference) => Promise<void> | void,
  ) {
    await this.findOne(id, u);
    const saved = await this.repo.manager.transaction(async (m) => {
      const c = await m.findOne(Conference, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!c) throw new NotFoundException("会诊不存在");
      if (!this.host(c, u) && !c.expert_ids.includes(u.userId))
        throw new ForbiddenException("已不在会诊名单中");
      await change(c);
      return m.save(c);
    });
    await this.audit.record(u, action, saved.conference_no);
    return saved;
  }
  update(id: string, dto: UpdateConferenceDto, u: CurrentUserPayload) {
    return this.mutate(id, u, "更新会诊", async (c) => {
      if (!this.host(c, u))
        throw new ForbiddenException("仅发起人或管理员可管理会诊");
      if (c.status === "已完成")
        throw new BadRequestException("已完成会诊不可修改");
      if (
        Object.values(dto).some((v) => v === null) ||
        (dto.topic !== undefined && !dto.topic.trim())
      )
        throw new BadRequestException("会诊字段无效");
      if (dto.expert_ids !== undefined) {
        if (c.status !== "待会诊")
          throw new BadRequestException("仅会诊开始前可调整参会名单");
        if (!dto.expert_ids.length)
          throw new BadRequestException("至少保留一位受邀医生");
        c.participants = await this.participants(
          dto.expert_ids,
          c.initiator_id || u.userId,
          c.participants,
        );
        c.expert_ids = dto.expert_ids;
        c.experts = c.participants.map((p) => p.name);
      }
      if (dto.status && dto.status !== c.status) {
        if (
          !(c.status === "待会诊" && dto.status === "进行中") &&
          !(c.status === "进行中" && dto.status === "已完成")
        )
          throw new BadRequestException("请按开始会诊、完成会诊的顺序操作");
        if (
          dto.status === "进行中" &&
          c.expert_ids.length &&
          !c.participants.some((p) => p.response === "已接受")
        )
          throw new BadRequestException("至少一名医生接受邀请后才能开始");
        if (dto.status === "已完成" && !(dto.summary ?? c.summary)?.trim())
          throw new BadRequestException("请填写会诊总结");
        c.status = dto.status;
      }
      if (dto.topic !== undefined) c.topic = dto.topic;
      if (dto.summary !== undefined) c.summary = dto.summary;
      if (dto.scheduled_at !== undefined)
        c.scheduled_at = new Date(dto.scheduled_at);
    });
  }
  respond(id: string, response: "accept" | "decline", u: CurrentUserPayload) {
    return this.mutate(id, u, "响应会诊邀请", async (c) => {
      if (c.status !== "待会诊")
        throw new BadRequestException("会诊已开始或结束，不能再响应邀请");
      const actor = await this.current(u);
      if (!this.eligible(actor))
        throw new ForbiddenException("当前账号没有医生角色");
      const participant = c.participants.find((p) => p.id === u.userId);
      if (!participant) throw new ForbiddenException("你不是受邀医生");
      if (participant.response !== "待响应")
        throw new BadRequestException("已响应过此邀请");
      participant.response = response === "accept" ? "已接受" : "已拒绝";
      participant.responded_at = new Date().toISOString();
    });
  }
  opinion(id: string, content: string, u: CurrentUserPayload) {
    return this.mutate(id, u, "提交会诊意见", async (c) => {
      if (c.status !== "进行中")
        throw new BadRequestException("仅进行中的会诊可提交意见");
      if (!content.trim()) throw new BadRequestException("意见不能为空");
      const actor = await this.current(u);
      if (
        !this.host(c, u) &&
        (!this.eligible(actor) ||
          !c.participants.some(
            (p) => p.id === u.userId && p.response === "已接受",
          ))
      )
        throw new ForbiddenException("请先接受会诊邀请");
      if (c.opinions.length >= 300)
        throw new BadRequestException("单场会诊最多保留300条意见");
      c.opinions.push({
        id: randomUUID(),
        user_id: u.userId,
        name: actor.real_name || u.username,
        department: actor.department || "未设置科室",
        content,
        created_at: new Date().toISOString(),
      });
    });
  }
  async remove(id: string, u: CurrentUserPayload) {
    await this.findOne(id, u);
    await this.repo.manager.transaction(async (m) => {
      const c = await m.findOne(Conference, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!c) throw new NotFoundException("会诊不存在");
      if (!this.host(c, u))
        throw new ForbiddenException("仅发起人或管理员可删除会诊");
      if (c.status !== "待会诊")
        throw new BadRequestException("已开始或完成的会诊不能删除");
      await m.remove(c);
    });
    await this.audit.record(u, "删除会诊", id);
    return { message: "删除成功" };
  }
}
