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
    if (!user) throw new ForbiddenException("Account disabled");
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
      throw new BadRequestException("The initiator does not need to invite themselves");
    const users = ids.length
      ? await this.repo.manager.find(User, {
          where: { id: In(ids), status: "active" },
        })
      : [];
    if (users.length !== ids.length || users.some((u) => !this.eligible(u)))
      throw new BadRequestException("Select valid, active doctor accounts");
    return ids.map((id) => {
      const user = users.find((u) => u.id === id)!;
      const old = previous.find((p) => p.id === id);
      return {
        id,
        name: user.real_name || user.username,
        department: user.department || "Department not set",
        title: user.title || "",
        response: old?.response || "待响应",
        responded_at: old?.responded_at || null,
      } as ConferenceParticipant;
    });
  }
  async create(dto: CreateConferenceDto, u: CurrentUserPayload) {
    const actor = await this.current(u);
    if (!this.admin(u) && !this.eligible(actor))
      throw new ForbiddenException("Only doctors can initiate a conference");
    if (!dto.topic.trim() || Object.values(dto).some((v) => v === null))
      throw new BadRequestException("Conference fields cannot be empty or null");
    if (!dto.expert_ids?.length && !dto.experts?.length)
      throw new BadRequestException("Select at least one participating doctor");
    if (dto.expert_ids?.length && dto.experts?.length)
      throw new BadRequestException("Select doctor accounts without also entering expert names manually");
    let patientName: string | null = null;
    if (dto.patient_id) {
      const patient = await this.patients.findOne({
        where: { id: dto.patient_id },
      });
      if (!patient) throw new BadRequestException("Patient not found");
      if (!this.admin(u) && patient.doctor_id !== u.userId)
        throw new ForbiddenException("You cannot initiate conferences for this patient");
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
        initiator_department: actor.department || "Department not set",
        expert_ids: dto.expert_ids || [],
        participants,
        experts: participants.length
          ? participants.map((p) => p.name)
          : dto.experts || [],
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
        status: "待会诊",
      }),
    );
    await this.audit.record(u, "Start multidisciplinary conference", saved.conference_no);
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
    if (!c) throw new NotFoundException("Conference not found");
    if (!this.host(c, u) && !c.expert_ids.includes(u.userId))
      throw new ForbiddenException("You do not have access to this conference");
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
      if (!c) throw new NotFoundException("Conference not found");
      if (!this.host(c, u) && !c.expert_ids.includes(u.userId))
        throw new ForbiddenException("You are no longer a conference participant");
      await change(c);
      return m.save(c);
    });
    await this.audit.record(u, action, saved.conference_no);
    return saved;
  }
  update(id: string, dto: UpdateConferenceDto, u: CurrentUserPayload) {
    return this.mutate(id, u, "Update conference", async (c) => {
      if (!this.host(c, u))
        throw new ForbiddenException("Only the initiator or an administrator can manage this conference");
      if (c.status === "已完成")
        throw new BadRequestException("Completed conferences cannot be edited");
      if (
        Object.values(dto).some((v) => v === null) ||
        (dto.topic !== undefined && !dto.topic.trim())
      )
        throw new BadRequestException("Invalid conference fields");
      if (dto.expert_ids !== undefined) {
        if (c.status !== "待会诊")
          throw new BadRequestException("Participants can only be changed before the conference starts");
        if (!dto.expert_ids.length)
          throw new BadRequestException("Keep at least one invited doctor");
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
          throw new BadRequestException("Start the conference before completing it");
        if (
          dto.status === "进行中" &&
          c.expert_ids.length &&
          !c.participants.some((p) => p.response === "已接受")
        )
          throw new BadRequestException("At least one doctor must accept before the conference can start");
        if (dto.status === "已完成" && !(dto.summary ?? c.summary)?.trim())
          throw new BadRequestException("Enter a conference summary");
        c.status = dto.status;
      }
      if (dto.topic !== undefined) c.topic = dto.topic;
      if (dto.summary !== undefined) c.summary = dto.summary;
      if (dto.scheduled_at !== undefined)
        c.scheduled_at = new Date(dto.scheduled_at);
    });
  }
  respond(id: string, response: "accept" | "decline", u: CurrentUserPayload) {
    return this.mutate(id, u, "Respond to conference invitation", async (c) => {
      if (c.status !== "待会诊")
        throw new BadRequestException("Invitations cannot be answered after the conference has started or ended");
      const actor = await this.current(u);
      if (!this.eligible(actor))
        throw new ForbiddenException("The current account does not have a doctor role");
      const participant = c.participants.find((p) => p.id === u.userId);
      if (!participant) throw new ForbiddenException("You are not an invited doctor");
      if (participant.response !== "待响应")
        throw new BadRequestException("You have already responded to this invitation");
      participant.response = response === "accept" ? "已接受" : "已拒绝";
      participant.responded_at = new Date().toISOString();
    });
  }
  opinion(id: string, content: string, u: CurrentUserPayload) {
    return this.mutate(id, u, "Submit opinion", async (c) => {
      if (c.status !== "进行中")
        throw new BadRequestException("Opinions can only be submitted during an active conference");
      if (!content.trim()) throw new BadRequestException("Opinion cannot be empty");
      const actor = await this.current(u);
      if (
        !this.host(c, u) &&
        (!this.eligible(actor) ||
          !c.participants.some(
            (p) => p.id === u.userId && p.response === "已接受",
          ))
      )
        throw new ForbiddenException("Accept the conference invitation first");
      if (c.opinions.length >= 300)
        throw new BadRequestException("A conference can contain at most 300 opinions");
      c.opinions.push({
        id: randomUUID(),
        user_id: u.userId,
        name: actor.real_name || u.username,
        department: actor.department || "Department not set",
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
      if (!c) throw new NotFoundException("Conference not found");
      if (!this.host(c, u))
        throw new ForbiddenException("Only the initiator or an administrator can delete this conference");
      if (c.status !== "待会诊")
        throw new BadRequestException("Started or completed conferences cannot be deleted");
      await m.remove(c);
    });
    await this.audit.record(u, "Delete conference", id);
    return { message: "Deleted successfully" };
  }
}
