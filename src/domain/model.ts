import type { IsoDate } from "./dates";
import type { Money } from "./money";

export type Role =
  | "STRUCTURE_USER"
  | "PROCUREMENT_OFFICER"
  | "FINANCE_OFFICER"
  | "SUPPLIER"
  | "EXECUTIVE"
  | "ADMIN";

export const ROLES: Role[] = [
  "STRUCTURE_USER",
  "PROCUREMENT_OFFICER",
  "FINANCE_OFFICER",
  "SUPPLIER",
  "EXECUTIVE",
  "ADMIN",
];

/** Tipi di atto con cui si classifica un documento del fascicolo (correggibili da Ufficio Gare e amministratore). */
export const DOC_TYPES = [
  "MEMORIA",
  "DOCUMENTO_TECNICO",
  "DOCUMENTI_OPERATORE",
  "DETERMINA_INDIZIONE",
  "DETERMINA_AGGIUDICAZIONE",
  "GARANZIA_DEFINITIVA",
  "CONTRATTO",
  "ODA",
  "ADDENDUM",
  "DETERMINA_REVOCA",
  "VERBALE_SAL",
] as const;

/** Owner logico di una milestone (ruolo applicativo abbreviato). */
export type OwnerRole = "STRUCTURE" | "PROCUREMENT" | "FINANCE" | "SUPPLIER";

/** Famiglia di modelli: v1 (dataset di collaudo) o m1 (Modulo 1 del processo INAPP, DEC-107). */
export type TemplateFamily = "v1" | "m1";

/** Azione da registrare insieme al completamento di un passo (DEC-107). */
export type StepAction = "OPERATOR" | "RESERVATIONS" | "COMMITMENTS" | "AWARD" | "SIGN";

export type ProcedureType =
  | "DIRECT_AWARD"
  | "DIRECT_AWARD_MEPA"
  | "MEPA_ORDER"
  | "CENTRAL_PURCHASING_ORDER"
  | "NEGOTIATED"
  | "OPEN"
  | "FRAMEWORK_AGREEMENT";

/** Fase dello schema di processo (0 Piano … 5 Chiusura) per stato, quando il modello non la indica. */
export const STATUS_STAGE: Record<string, number | null> = {
  DRAFT: 0, MEMORY_EXPECTED: 1, PRELIMINARY_REVIEW: 2, TENDERING: 2, AWARDED: 3, CONTRACTING: 3, EXECUTION: 4, CLOSING: 4, CLOSED: 5, CANCELLED: null,
};

export type AwardCriterion = "LOWEST_PRICE" | "MEAT";
export type Instrument = "MEPA" | "OFF_MEPA" | "CONSIP_AQ";

export type ProcedureStatus =
  | "DRAFT"
  | "MEMORY_EXPECTED"
  | "PRELIMINARY_REVIEW"
  | "TENDERING"
  | "AWARDED"
  | "CONTRACTING"
  | "EXECUTION"
  | "CLOSING"
  | "CLOSED"
  | "CANCELLED";

export type Health = "GREEN" | "AMBER" | "RED" | "NEUTRAL";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type MilestoneState =
  | "NOT_STARTED"
  | "UPCOMING"
  | "DUE_SOON"
  | "DUE_TODAY"
  | "OVERDUE"
  | "COMPLETED"
  | "SUSPENDED"
  | "NOT_APPLICABLE"
  | "CANCELLED";

export type ManualMilestoneState = "SUSPENDED" | "NOT_APPLICABLE" | "CANCELLED";

export type SalState =
  | "PLANNED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "INVOICED"
  | "LIQUIDATED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REJECTED"
  | "SUSPENDED";

export type AlertPolicyCode = "MEMORY" | "BLOCKING" | "STANDARD";
export type DocTiming = "WITH" | "BEFORE";

export interface ExpectedDocument {
  type: string;
  timing: DocTiming;
  severity: Severity;
}

export interface MilestoneDefinition {
  code: string;
  label: string;
  phase: ProcedureStatus;
  owner: OwnerRole;
  mandatory: boolean;
  blocking: boolean;
  offsetDays: number;
  minDurationDays: number;
  alertPolicy: AlertPolicyCode;
  minLeadDays: number;
  expectedDocuments: ExpectedDocument[];
  /** Data chiave dello schema di processo (programmata → effettiva). */
  key?: boolean;
  /** Fase dello schema 0–5 (Piano … Chiusura). */
  stage?: number;
  action?: StepAction;
}

export interface ProcessTemplate {
  code: string;
  label: string;
  family?: TemplateFamily;
  variant?: string;
  illustrative: boolean;
  durationMonths: number;
  selection: { procedureTypes: ProcedureType[]; awardCriterion?: AwardCriterion; instrument?: Instrument };
  /** Catena lineare: ogni milestone dipende dalla precedente. */
  milestones: MilestoneDefinition[];
}

export interface MilestoneInstance {
  code: string;
  /** Data della baseline (versione 1). */
  baselineDate: IsoDate | null;
  /** Data della versione corrente approvata. */
  forecastDate: IsoDate | null;
  actualDate: IsoDate | null;
  manualState: ManualMilestoneState | null;
  manualBlocker: string | null;
}

export interface ContractInfo {
  signed: boolean;
  net: Money;
  vat: Money;
  gross: Money;
  supplierName: string | null;
  signedDate: IsoDate | null;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
}

export interface SalInstance {
  seq: number;
  pctHundredths: bigint;
  amount: Money;
  state: SalState;
  dueDate: IsoDate | null;
  submittedDate: IsoDate | null;
  reviewDueDate: IsoDate | null;
  invoiceDate: IsoDate | null;
  paymentDueDate: IsoDate | null;
  accepted: Money;
  liquidated: Money;
  paid: Money;
}

export interface PaymentRecord {
  salSeq: number | null;
  amount: Money;
  date: IsoDate;
  valid: boolean;
}

export type AnchorType = "MILESTONE" | "SAL";

export interface ForecastLine {
  id: string;
  date: IsoDate;
  amount: Money;
  anchorType: AnchorType;
  anchorRef: string;
  source: string | null;
}

export interface BudgetAllocation {
  year: number;
  source: string;
  amount: Money;
}

export type MovementType = "RESERVATION" | "COMMITMENT" | "LIQUIDATION" | "PAYMENT" | "RELEASE" | "REVERSAL";

export interface Movement {
  type: MovementType;
  amount: Money;
  year: number;
  date: IsoDate;
}

export interface ProcedureDocument {
  type: string;
  subtype: string | null;
}

/** Aggregato su cui lavorano le regole pure. */
export interface ProcedureAggregate {
  code: string;
  title: string;
  structureCode: string;
  procedureType: ProcedureType;
  awardCriterion: AwardCriterion | null;
  instrument: Instrument | null;
  /** Bozza della Struttura prima della consegna della memoria (US-013). */
  draft: boolean;
  cancelled: boolean;
  closed: boolean;
  programmed: Money;
  /** Componenti di costo fuori contratto incluse negli impegni (contributo ANAC, DEC-035). */
  costComponents: Money;
  template: ProcessTemplate;
  milestones: MilestoneInstance[];
  contract: ContractInfo | null;
  sals: SalInstance[];
  payments: PaymentRecord[];
  forecastLines: ForecastLine[];
  budget: BudgetAllocation[];
  movements: Movement[];
  documents: ProcedureDocument[];
  /** Fascicolo caricato: solo allora si verifica la completezza documentale (DEC-103). */
  documentsTracked: boolean;
}

export interface EngineSettings {
  attentionWindowDays: number;
  reminderThresholdDays: number;
  salReviewTermDays: number;
  paymentTermDays: number;
}

export const DEFAULT_SETTINGS: EngineSettings = {
  attentionWindowDays: 10,
  reminderThresholdDays: 5,
  salReviewTermDays: 15,
  paymentTermDays: 30,
};
