import { Ban, CalendarClock, CalendarX, CircleCheck, CircleDot, CirclePause, Circle, Clock, Info, Lock, OctagonAlert, TriangleAlert, CalendarDays, CircleSlash } from "lucide-react";
import { formatDateIt, formatEuro } from "@/contracts/format";
import { HEALTH_LABEL, MILESTONE_STATE_LABEL, SAL_STATE_LABEL, SEVERITY_LABEL, STATUS_LABEL, daysText } from "./labels";

/** Badge di health: testo + icona di forma diversa, mai solo colore (NFR-010). */
export function HealthBadge({ value, drivers }: { value: string; drivers?: { message: string }[] }) {
  const Icon = value === "RED" ? OctagonAlert : value === "AMBER" ? TriangleAlert : value === "GREEN" ? CircleCheck : Circle;
  const title = drivers?.length ? `Perché ${HEALTH_LABEL[value]}: ${drivers.map((d) => d.message).join("; ")}` : undefined;
  return (
    <span className={`badge badge-${value}`} title={title}>
      <Icon aria-hidden /> {HEALTH_LABEL[value] ?? value}
    </span>
  );
}

export function SeverityBadge({ value }: { value: string }) {
  const Icon = value === "CRITICAL" ? OctagonAlert : value === "HIGH" ? TriangleAlert : value === "MEDIUM" ? Info : CircleDot;
  return (
    <span className={`badge sev-${value}`}>
      <Icon aria-hidden /> {SEVERITY_LABEL[value] ?? value}
    </span>
  );
}

export function StatusChip({ value }: { value: string }) {
  return <span className="chip">{value === "CANCELLED" ? <Ban aria-hidden size={14} /> : null}{STATUS_LABEL[value] ?? value}</span>;
}

const MS_ICON: Record<string, typeof Circle> = {
  NOT_STARTED: Circle,
  UPCOMING: CalendarDays,
  DUE_SOON: CalendarClock,
  DUE_TODAY: Clock,
  OVERDUE: CalendarX,
  COMPLETED: CircleCheck,
  SUSPENDED: CirclePause,
  NOT_APPLICABLE: CircleSlash,
  CANCELLED: Ban,
};
const MS_TONE: Record<string, string> = { DUE_SOON: "AMBER", DUE_TODAY: "AMBER", OVERDUE: "RED", COMPLETED: "GREEN" };

export function MilestoneBadge({ state, blocked, reason }: { state: string; blocked?: boolean; reason?: string | null }) {
  const Icon = MS_ICON[state] ?? Circle;
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      <span className={`badge badge-${MS_TONE[state] ?? "NEUTRAL"}`}>
        <Icon aria-hidden /> {MILESTONE_STATE_LABEL[state] ?? state}
      </span>
      {blocked ? (
        <span className="badge badge-RED" title={reason ?? undefined}>
          <Lock aria-hidden /> Bloccata
        </span>
      ) : null}
    </span>
  );
}

export function SalBadge({ state, overdue }: { state: string; overdue?: boolean }) {
  const tone = state === "PAID" ? "GREEN" : state === "REJECTED" ? "RED" : "NEUTRAL";
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <span className={`badge badge-${tone}`}>{SAL_STATE_LABEL[state] ?? state}</span>
      {overdue ? (
        <span className="badge badge-RED">
          <CalendarX aria-hidden /> Scaduto
        </span>
      ) : null}
    </span>
  );
}

export function Euro({ v }: { v: string | null | undefined }) {
  return <span className="num">{formatEuro(v)}</span>;
}

export function DateIt({ v }: { v: string | null | undefined }) {
  return <>{formatDateIt(v)}</>;
}

export function Deadline({ d }: { d: { date: string; label?: string | null; days: number | null } | null }) {
  if (!d) return <span className="muted">—</span>;
  const tone = d.days !== null && d.days < 0 ? "var(--health-red-fg)" : d.days !== null && d.days <= 10 ? "var(--health-amber-fg)" : undefined;
  return (
    <span>
      <span>{formatDateIt(d.date)}</span>
      <span className="small" style={{ display: "block", color: tone ?? "var(--ds-color-text-muted)" }}>
        {d.label ? `${d.label} · ` : ""}
        {daysText(d.days)}
      </span>
    </span>
  );
}
