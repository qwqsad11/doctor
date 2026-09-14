import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import { Emr } from "./entities/emr.entity";
import { Patient } from "../patients/entities/patient.entity";
import { User } from "../users/entities/user.entity";
import { CreateEmrDto } from "./dto/create-emr.dto";
import { UpdateEmrDto } from "./dto/update-emr.dto";
import { QueryEmrDto } from "./dto/query-emr.dto";
import { MedicalOrderDto, ReviewEmrDto } from "./dto/emr-workflow.dto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { EMR_TEMPLATES } from "./emr.templates";

@Injectable()
export class EmrService {
  constructor(
    @InjectRepository(Emr) private repo: Repository<Emr>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    private audit: AuditService,
  ) {}
  private admin(u: CurrentUserPayload) {
    return u.roles.includes("admin");
  }
  // Read current roles from the database so a revoked reviewer cannot use an old JWT.
  private async reviewer(u: CurrentUserPayload) {
    const current = await this.repo.manager.findOne(User, {
      where: { id: u.userId },
    });
    return (
      current?.status === "active" && current.roles.includes("senior_doctor")
    );
  }
  private author(e: Emr, u: CurrentUserPayload) {
    if (e.doctor_id !== u.userId && !this.admin(u))
      throw new ForbiddenException("Only the author or an administrator can edit this record");
  }
  private editable(e: Emr) {
    if (!["草稿", "已退回"].includes(e.status))
      throw new BadRequestException(
        "Only draft or returned records can be edited. Records under review or archived are locked.",
      );
  }
  private validateContent(dto: CreateEmrDto | UpdateEmrDto, existing?: Emr) {
    if (Object.values(dto).some((value) => value === null))
      throw new BadRequestException("Fields cannot be null. Use an empty string to clear text.");
    const template = EMR_TEMPLATES.find(
      (t) => t.id === (dto.template_id ?? existing?.template_id),
    );
    if (dto.structured_content && !template)
      throw new BadRequestException("Select a structured template first");
    if (template && template.type !== (dto.type ?? existing?.type))
      throw new BadRequestException("Template does not match the record type");
    for (const [key, value] of Object.entries(dto.structured_content ?? {})) {
      if (
        !template?.fields.some((f) => f === key) ||
        typeof value !== "string" ||
        value.length > 5000
      )
        throw new BadRequestException("Structured fields are invalid or exceed 5,000 characters");
    }
  }
  async reviewers(u: CurrentUserPayload) {
    const users = await this.repo.manager.find(User, {
      where: { status: "active" },
      order: { username: "ASC" },
    });
    return users
      .filter((x) => x.id !== u.userId && x.roles.includes("senior_doctor"))
      .map((x) => ({
        id: x.id,
        name: x.real_name || x.username,
        department: x.department,
      }));
  }
  async create(dto: CreateEmrDto, u: CurrentUserPayload) {
    const patient = await this.patients.findOne({
      where: { id: dto.patient_id },
    });
    if (!patient) throw new BadRequestException("Patient not found");
    if (!this.admin(u) && patient.doctor_id !== u.userId)
      throw new ForbiddenException("You cannot create records for this patient");
    this.validateContent(dto);
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        emr_no: "E" + randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase(),
        patient_name: patient.name,
        doctor_id: u.userId,
        doctor_name: u.username,
        status: "草稿",
      }),
    );
    await this.audit.record(u, "Create Medical Record", saved.emr_no);
    return saved;
  }
  async findAll(query: QueryEmrDto, u: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, type, status } = query;
    const qb = this.repo.createQueryBuilder("e");
    if (!this.admin(u)) {
      const canReview = await this.reviewer(u);
      qb.andWhere(
        canReview
          ? "(e.doctor_id = :uid OR e.reviewer_id = :uid)"
          : "e.doctor_id = :uid",
        { uid: u.userId },
      );
    }
    if (type) qb.andWhere("e.type = :type", { type });
    if (status) qb.andWhere("e.status = :status", { status });
    if (keyword)
      qb.andWhere(
        "(e.patient_name ILIKE :kw OR e.emr_no ILIKE :kw OR e.diagnosis ILIKE :kw)",
        { kw: "%" + keyword + "%" },
      );
    const [list, total] = await qb
      .orderBy("e.updated_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }
  async findOne(id: string, u: CurrentUserPayload) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException("Medical record not found");
    if (
      !this.admin(u) &&
      e.doctor_id !== u.userId &&
      !(e.reviewer_id === u.userId && (await this.reviewer(u)))
    )
      throw new ForbiddenException("You do not have access to this record");
    return e;
  }
  private async mutate(
    id: string,
    u: CurrentUserPayload,
    action: string,
    change: (e: Emr) => Promise<void> | void,
  ) {
    await this.findOne(id, u);
    const saved = await this.repo.manager.transaction(async (manager) => {
      const e = await manager.findOne(Emr, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!e) throw new NotFoundException("Medical record not found");
      await change(e);
      return manager.save(Emr, e);
    });
    await this.audit.record(u, action, saved.emr_no);
    return saved;
  }
  update(id: string, dto: UpdateEmrDto, u: CurrentUserPayload) {
    return this.mutate(id, u, "Edit medical record", (e) => {
      this.author(e, u);
      this.editable(e);
      this.validateContent(dto, e);
      Object.assign(e, dto);
    });
  }
  submit(id: string, reviewerId: string, u: CurrentUserPayload) {
    return this.mutate(id, u, "Submit record for review", async (e) => {
      this.author(e, u);
      this.editable(e);
      if (!e.diagnosis?.trim()) throw new BadRequestException("Enter a diagnosis");
      if (
        !e.content?.trim() &&
        !Object.values(e.structured_content).some((v) => v.trim())
      )
        throw new BadRequestException("Enter record content");
      const reviewer = await this.repo.manager.findOne(User, {
        where: { id: reviewerId, status: "active" },
      });
      if (!reviewer?.roles.includes("senior_doctor"))
        throw new BadRequestException("Select a valid senior doctor");
      if (
        reviewerId === e.doctor_id ||
        (!e.doctor_id && reviewer.username === e.doctor_name)
      )
        throw new BadRequestException("You cannot review your own record");
      e.reviewer_id = reviewerId;
      e.reviewer_name = reviewer.real_name || reviewer.username;
      e.status = "待审核";
      e.review_history.push({
        action: "Submit for review",
        actor: u.username,
        actor_id: u.userId,
        at: new Date().toISOString(),
        comment: "Submitted to " + e.reviewer_name,
      });
    });
  }
  review(id: string, dto: ReviewEmrDto, u: CurrentUserPayload) {
    return this.mutate(id, u, "Review record", async (e) => {
      if (!(await this.reviewer(u)) || e.reviewer_id !== u.userId)
        throw new ForbiddenException("Only the assigned senior doctor can review this record");
      if (
        e.doctor_id === u.userId ||
        (!e.doctor_id && e.doctor_name === u.username)
      )
        throw new ForbiddenException("You cannot review your own record");
      if (e.status !== "待审核")
        throw new BadRequestException("Record is not pending review");
      if (!dto.comment.trim()) throw new BadRequestException("Enter review comments");
      e.status = dto.decision === "approve" ? "已审核" : "已退回";
      e.review_history.push({
        action: e.status,
        actor: u.username,
        actor_id: u.userId,
        at: new Date().toISOString(),
        comment: dto.comment,
      });
    });
  }
  archive(id: string, u: CurrentUserPayload) {
    return this.mutate(id, u, "Archive record", (e) => {
      this.author(e, u);
      if (e.status !== "已审核")
        throw new BadRequestException("Only records that passed final review can be archived");
      e.status = "已归档";
      e.archived_at = new Date();
      e.review_history.push({
        action: "Archived",
        actor: u.username,
        actor_id: u.userId,
        at: new Date().toISOString(),
        comment: "Final review completed; record locked",
      });
    });
  }
  order(
    id: string,
    dto: MedicalOrderDto,
    u: CurrentUserPayload,
    orderId?: string,
  ) {
    return this.mutate(id, u, orderId ? "Edit order" : "Create order", (e) => {
      this.author(e, u);
      this.editable(e);
      if (!dto.name.trim() || !dto.instruction.trim())
        throw new BadRequestException("Order name and instructions cannot be empty");
      const at = new Date().toISOString();
      const history = {
        action: orderId ? "Edit" : "Created",
        actor: u.username,
        at,
        detail: dto.category + "：" + dto.name + "；" + dto.instruction,
      };
      if (orderId) {
        const order = e.orders.find((o) => o.id === orderId);
        if (!order) throw new NotFoundException("Order not found");
        if (order.status !== "执行中")
          throw new BadRequestException("Stopped orders cannot be edited");
        Object.assign(order, dto, { updated_at: at });
        order.history.push(history);
      } else
        e.orders.push({
          ...dto,
          id: randomUUID(),
          status: "执行中",
          created_at: at,
          updated_at: at,
          history: [history],
        });
    });
  }
  stopOrder(
    id: string,
    orderId: string,
    reason: string,
    u: CurrentUserPayload,
  ) {
    return this.mutate(id, u, "Stop order", (e) => {
      this.author(e, u);
      this.editable(e);
      const order = e.orders.find((o) => o.id === orderId);
      if (!order) throw new NotFoundException("Order not found");
      if (order.status !== "执行中")
        throw new BadRequestException("Order has already been stopped");
      if (!reason.trim()) throw new BadRequestException("Enter a reason for stopping");
      order.status = "已停止";
      order.updated_at = new Date().toISOString();
      order.history.push({
        action: "Stop",
        actor: u.username,
        at: order.updated_at,
        detail: reason,
      });
    });
  }
  async remove(id: string, u: CurrentUserPayload) {
    await this.repo.manager.transaction(async (manager) => {
      const e = await manager.findOne(Emr, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!e) throw new NotFoundException("Medical record not found");
      this.author(e, u);
      this.editable(e);
      if (e.review_history.length || e.orders.length)
        throw new BadRequestException("Records with orders or review history cannot be deleted");
      await manager.remove(e);
    });
    await this.audit.record(u, "Delete draft record", id);
    return { message: "Deleted successfully" };
  }
}
