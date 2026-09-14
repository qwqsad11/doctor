import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { createHash, randomBytes } from "crypto";
import { HealthRecord } from "./entities/health-record.entity";
import { HealthEntry } from "./entities/health-entry.entity";
import { HealthReminder } from "./entities/health-reminder.entity";
import { Patient } from "../patients/entities/patient.entity";
import { CreateHealthRecordDto } from "./dto/create-health-record.dto";
import { UpdateHealthRecordDto } from "./dto/update-health-record.dto";
import { QueryHealthRecordDto } from "./dto/query-health-record.dto";
import {
  MeasurementDto,
  ReminderDto,
  AssessmentDto,
} from "./dto/health-actions.dto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../audit/audit.service";
@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private logger = new Logger(HealthService.name);
  constructor(
    @InjectRepository(HealthRecord) private repo: Repository<HealthRecord>,
    @InjectRepository(Patient) private patients: Repository<Patient>,
    private audit: AuditService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.dispatchDueReminders(), 15000);
    this.timer.unref();
    void this.dispatchDueReminders();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private admin(u: CurrentUserPayload) {
    return u.roles.includes("admin");
  }
  private access(r: HealthRecord, u: CurrentUserPayload) {
    if (!this.admin(u) && r.doctor_id !== u.userId)
      throw new ForbiddenException("You do not have access to this health plan");
  }
  private async locked<T>(
    id: string,
    u: CurrentUserPayload,
    fn: (r: HealthRecord, m: EntityManager) => Promise<T>,
  ) {
    return this.repo.manager.transaction(async (m) => {
      const r = await m.findOne(HealthRecord, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!r) throw new NotFoundException("Health plan not found");
      this.access(r, u);
      return fn(r, m);
    });
  }
  async create(dto: CreateHealthRecordDto, u: CurrentUserPayload) {
    const patient = await this.patients.findOne({
      where: { id: dto.patient_id },
    });
    if (!patient) throw new BadRequestException("Patient not found");
    if (!this.admin(u) && patient.doctor_id !== u.userId)
      throw new ForbiddenException("You cannot create plans for this patient");
    if (Object.values(dto).some((value) => value === null))
      throw new BadRequestException("Fields cannot be null");
    if (!dto.plan.trim()) throw new BadRequestException("Health plan cannot be empty");
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        patient_name: patient.name,
        doctor_id: u.userId,
      }),
    );
    await this.audit.record(u, "Create Health Plan", saved.patient_name);
    return saved;
  }
  async findAll(q: QueryHealthRecordDto, u: CurrentUserPayload) {
    const { page = 1, pageSize = 10, keyword, alert_level } = q;
    const qb = this.repo.createQueryBuilder("h");
    if (!this.admin(u)) qb.andWhere("h.doctor_id = :uid", { uid: u.userId });
    if (alert_level)
      qb.andWhere("h.alert_level = :level", { level: alert_level });
    if (keyword)
      qb.andWhere("(h.patient_name ILIKE :kw OR h.plan ILIKE :kw)", {
        kw: "%" + keyword + "%",
      });
    const [list, total] = await qb
      .orderBy("h.updated_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }
  async findOne(id: string, u: CurrentUserPayload) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException("Health plan not found");
    this.access(r, u);
    return r;
  }
  async detail(id: string, u: CurrentUserPayload) {
    const plan = await this.findOne(id, u);
    const entries = await this.repo.manager.find(HealthEntry, {
      where: { plan_id: id },
      order: { created_at: "DESC" },
      take: 300,
    });
    const reminders = await this.repo.manager.find(HealthReminder, {
      where: { plan_id: id },
      order: { next_run_at: "ASC" },
    });
    return { ...plan, entries, reminders };
  }
  async update(id: string, dto: UpdateHealthRecordDto, u: CurrentUserPayload) {
    const r = await this.locked(id, u, async (r, m) => {
      if (Object.values(dto).some((value) => value === null))
        throw new BadRequestException("Fields cannot be null");
      if (dto.plan !== undefined && !dto.plan.trim())
        throw new BadRequestException("Health plan cannot be empty");
      Object.assign(r, dto);
      return m.save(r);
    });
    await this.audit.record(u, "Adjust Health Plan", r.patient_name);
    return r;
  }
  async remove(id: string, u: CurrentUserPayload) {
    await this.locked(id, u, async (r, m) => {
      await m.remove(r);
    });
    await this.audit.record(u, "Delete health plan", id);
    return { message: "Deleted successfully" };
  }
  private validateMeasurement(dto: MeasurementDto) {
    if (new Date(dto.measured_at).getTime() > Date.now() + 60000)
      throw new BadRequestException("Measurement time cannot be in the future");
    if (dto.kind === "血压") {
      if (
        dto.systolic == null ||
        dto.diastolic == null ||
        dto.systolic <= dto.diastolic ||
        dto.glucose != null
      )
        throw new BadRequestException(
          "Enter systolic and diastolic pressure; systolic pressure must be higher than diastolic pressure",
        );
    } else if (
      dto.glucose == null ||
      dto.systolic != null ||
      dto.diastolic != null
    )
      throw new BadRequestException("Enter a blood glucose value");
  }
  private async saveMeasurement(
    r: HealthRecord,
    dto: MeasurementDto,
    actor: string,
    m: EntityManager,
  ) {
    this.validateMeasurement(dto);
    const entry = await m.save(
      HealthEntry,
      m.create(HealthEntry, {
        plan_id: r.id,
        kind: "measurement",
        actor,
        data: dto,
      }),
    );
    // A late historical upload must not replace the most recent measurement.
    if (
      !r.latest_measured_at ||
      new Date(dto.measured_at) >= new Date(r.latest_measured_at)
    ) {
      r.metrics =
        dto.kind === "血压"
          ? "血压 " + dto.systolic + "/" + dto.diastolic + " mmHg"
          : "血糖 " + dto.glucose + " mmol/L";
      r.device_source = dto.source || actor;
      r.latest_measured_at = new Date(dto.measured_at);
      await m.save(r);
    }
    return entry;
  }
  async measurement(id: string, dto: MeasurementDto, u: CurrentUserPayload) {
    const entry = await this.locked(id, u, (r, m) =>
      this.saveMeasurement(r, dto, u.username + " (entered by doctor)", m),
    );
    await this.audit.record(u, "Record health measurement", id);
    return entry;
  }
  async reminder(id: string, dto: ReminderDto, u: CurrentUserPayload) {
    if (!dto.message.trim()) throw new BadRequestException("Reminder message cannot be empty");
    if (new Date(dto.next_run_at).getTime() < Date.now() - 60000)
      throw new BadRequestException("Reminder time cannot be in the past");
    const reminder = await this.locked(id, u, async (_, m) =>
      m.save(
        HealthReminder,
        m.create(HealthReminder, {
          plan_id: id,
          message: dto.message,
          next_run_at: new Date(dto.next_run_at),
          interval_days: dto.interval_days,
        }),
      ),
    );
    await this.audit.record(u, "Set health reminder", id);
    return reminder;
  }
  async cancelReminder(id: string, reminderId: string, u: CurrentUserPayload) {
    await this.findOne(id, u);
    const result = await this.repo.manager.update(
      HealthReminder,
      { id: reminderId, plan_id: id },
      { enabled: false },
    );
    if (!result.affected) throw new NotFoundException("Reminder not found");
    await this.audit.record(u, "Cancel health reminder", id);
    return { message: "Cancelled" };
  }
  async assessment(id: string, dto: AssessmentDto, u: CurrentUserPayload) {
    if (
      !dto.conclusion.trim() ||
      !dto.advice.trim() ||
      (dto.revised_plan !== undefined && !dto.revised_plan.trim())
    )
      throw new BadRequestException("Assessment and advice cannot be empty");
    if (new Date(dto.next_assessment_at).getTime() <= Date.now())
      throw new BadRequestException("The next assessment must be scheduled in the future");
    const entry = await this.locked(id, u, async (r, m) => {
      const data = { ...dto, previous_plan: r.plan };
      if (dto.revised_plan) r.plan = dto.revised_plan;
      r.alert_level = dto.alert_level;
      r.next_assessment_at = new Date(dto.next_assessment_at);
      await m.save(r);
      await m.save(
        HealthEntry,
        m.create(HealthEntry, {
          plan_id: id,
          kind: "notification",
          actor: u.username,
          data: { message: "Health assessment advice: " + dto.advice },
        }),
      );
      return m.save(
        HealthEntry,
        m.create(HealthEntry, {
          plan_id: id,
          kind: "assessment",
          actor: u.username,
          data,
        }),
      );
    });
    await this.audit.record(u, "Assess health and update advice", id);
    return entry;
  }
  async createAccess(id: string, u: CurrentUserPayload) {
    const token = randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + 7 * 86400000);
    await this.locked(id, u, async (r, m) => {
      r.patient_access_hash = createHash("sha256").update(token).digest("hex");
      r.patient_access_expires_at = expires_at;
      await m.save(r);
    });
    await this.audit.record(u, "Generate patient portal access", id);
    return { token, expires_at };
  }
  async revokeAccess(id: string, u: CurrentUserPayload) {
    await this.locked(id, u, async (r, m) => {
      r.patient_access_hash = null;
      r.patient_access_expires_at = null;
      await m.save(r);
    });
    await this.audit.record(u, "Revoke patient portal access", id);
    return { message: "Revoked" };
  }
  private async patientPlan(token: string, m: EntityManager, lock = false) {
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new ForbiddenException("Patient link is invalid or expired");
    const r = await m.findOne(HealthRecord, {
      where: {
        patient_access_hash: createHash("sha256").update(token).digest("hex"),
      },
      ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
    if (
      !r ||
      !r.patient_access_expires_at ||
      r.patient_access_expires_at.getTime() <= Date.now()
    )
      throw new ForbiddenException("Patient link is invalid or expired");
    return r;
  }
  async patientView(token: string) {
    const r = await this.patientPlan(token, this.repo.manager);
    const entries = await this.repo.manager.find(HealthEntry, {
      where: { plan_id: r.id },
      order: { created_at: "DESC" },
      take: 300,
    });
    return {
      patient_name: r.patient_name,
      plan: r.plan,
      goals: r.goals,
      guidance: r.guidance,
      next_assessment_at: r.next_assessment_at,
      entries: entries
        .filter((e) => e.kind !== "assessment")
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          data: e.data,
          created_at: e.created_at,
        })),
    };
  }
  async patientMeasurement(token: string, dto: MeasurementDto) {
    return this.repo.manager.transaction(async (m) => {
      const r = await this.patientPlan(token, m, true);
      const entry = await this.saveMeasurement(r, dto, "Patient upload", m);
      return { id: entry.id, message: "Upload successful" };
    });
  }
  // Transactional row locks allow multiple instances without duplicate delivery.
  // Persist notifications and advance schedule together; after downtime send one catch-up reminder.
  async dispatchDueReminders() {
    if (this.running) return;
    this.running = true;
    try {
      await this.repo.manager.transaction(async (m) => {
        const now = new Date();
        const due = await m
          .createQueryBuilder(HealthReminder, "r")
          .where("r.enabled = true AND r.next_run_at <= :now", { now })
          .setLock("pessimistic_write")
          .setOnLocked("skip_locked")
          .take(100)
          .getMany();
        for (const r of due) {
          await m.save(
            HealthEntry,
            m.create(HealthEntry, {
              plan_id: r.plan_id,
              kind: "notification",
              actor: "System",
              data: {
                message: r.message,
                scheduled_at: r.next_run_at.toISOString(),
                reminder_id: r.id,
              },
            }),
          );
          r.last_sent_at = now;
          if (r.interval_days === 0) r.enabled = false;
          else {
            const period = r.interval_days * 86400000;
            r.next_run_at = new Date(
              r.next_run_at.getTime() +
                (Math.floor(
                  (now.getTime() - r.next_run_at.getTime()) / period,
                ) +
                  1) *
                  period,
            );
          }
          await m.save(r);
        }
      });
    } catch (e) {
      this.logger.error(
        "Health reminder delivery failed; retrying on the next cycle",
        e instanceof Error ? e.stack : String(e),
      );
    } finally {
      this.running = false;
    }
  }
}
