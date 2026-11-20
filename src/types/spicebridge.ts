export type StageId =
  | 'stage-1-assay'
  | 'stage-2-cleaning'
  | 'stage-3-passport'
  | 'stage-4-settlement';

export interface OperationalStage {
  id: StageId;
  stepNumber: number;
  title: string;
  shortLabel: string;
  description: string;
  active: boolean;
}

export type CropType = 'Fennel' | 'Cumin';

export type QualityStatus = 'pass' | 'hold';

export interface FarmerLot {
  id: string;
  farmerName: string;
  crop: CropType;
  cropLabel: string;
  variety: string;
  clusterGeography: string;
  quantityKg: number;
  bagCount: number;
  moisturePercent: number;
  moistureNote: string;
  qualityStatus: QualityStatus;
  purityPercent: number;
  foreignMatterNote: string;
  aromaGrade: string;
  offeredPricePerKg: number;
  mandiNetPricePerKg: number | null;
  priceNote: string;
  bankTransferStatus: string;
  assayedAt: string;
}

export type CropFilter = 'All' | CropType;
export type StatusFilter = 'All' | 'Pass' | 'Hold';

export interface LotFilterState {
  crop: CropFilter;
  status: StatusFilter;
  searchQuery: string;
}

export interface NewLotFormValues {
  farmerName: string;
  crop: CropType;
  variety: string;
  clusterGeography: string;
  quantityKg: string;
  moisturePercent: string;
  purityPercent: string;
  aromaGrade: string;
  offeredPricePerKg: string;
  mandiNetPricePerKg: string;
}

export type BatchStatus = 'queued' | 'cleaning' | 'cleaned';

export type ShiftSchedule = 'Today (Shift 1)' | 'Tomorrow (Shift 2)';

export interface ProcessingBatch {
  id: string;
  hubLine: string;
  shiftSchedule: ShiftSchedule;
  lotIds: string[];
  cropSummary: string;
  isMixedCrop: boolean;
  totalKg: number;
  totalBags: number;
  fillPercent: number;
  cleaningHours: number;
  batchEquivalent: number;
  weightedMoisture: number;
  weightedPurity: number;
  status: BatchStatus;
  createdAt: string;
}

export interface IndustrialMill {
  id: string;
  name: string;
  location: string;
  specialty: string;
  creditTermsDays: number;
}

export type SettlementStatus = 'invoiced_14d' | 'clearing' | 'settled';

export interface MillOrder {
  id: string;
  batchId: string;
  millId: string;
  millName: string;
  millLocation: string;
  cropSummary: string;
  totalKg: number;
  pricePerKg: number;
  grossInvoiceAmount: number;
  variableCost: number;
  netContribution: number;
  settlementStatus: SettlementStatus;
  invoicedAt: string;
  dueDate: string;
}

export type AppView =
  | 'lot-bank'
  | 'competition-lab'
  | 'battlefield-map'
  | 'positioning-statement'
  | 'ai-challenge';

export type CompetitorType =
  | 'Direct Competitor'
  | 'Indirect Competitor'
  | 'Substitute'
  | 'Do Nothing';

export type EvidenceQuality = 'Strong' | 'Moderate' | 'Weak';

export interface CompetitorAlternative {
  id: string;
  name: string;
  type: CompetitorType | '';
  priceCost: string;
  priceNotApplicable: boolean;
  mainOffer: string;
  mainStrength: string;
  mainWeakness: string;
  evidenceSource: string;
  evidenceQuality: EvidenceQuality | '';
}

export interface PositioningAxes {
  xName: string;
  xLeftLabel: string;
  xRightLabel: string;
  yName: string;
  yBottomLabel: string;
  yTopLabel: string;
}

export interface PositioningScore {
  x: number | null;
  y: number | null;
}

export interface PositioningMapState {
  axes: PositioningAxes;
  spiceBridgeScore: PositioningScore;
  alternativeScores: Record<string, PositioningScore>;
}

export interface PositioningStatementState {
  targetCustomer: string;
  category: string;
  primaryBenefit: string;
  mainAlternativeId: string;
  reasonToBelieve: string;
  finalStatement: string;
  isManuallyEdited: boolean;
  savedAt: string | null;
}

export interface AIChallengeQuestion {
  id: string;
  focusArea: string;
  question: string;
}

export interface AIChallengeFeedback {
  supported: string;
  assumption: string;
  nextEvidenceNeeded: string;
}

export interface AIChallengeFinalReview {
  strongestPart: string;
  biggestAssumption: string;
  nextValidationPriority: string;
}

export interface AIChallengeState {
  questions: AIChallengeQuestion[];
  responses: string[];
  feedbacks: Array<AIChallengeFeedback | null>;
  currentIndex: number;
  finalReview: AIChallengeFinalReview | null;
  completedAt: string | null;
}

export type OperatorRole =
  | 'Founder'
  | 'Procurement Lead'
  | 'Quality Assaying Lead'
  | 'Operations Lead';

export type MfaMethod = 'email_otp' | 'authenticator_backup';

export interface OperatorSession {
  email: string;
  name: string;
  role: OperatorRole;
  mfaMethod: MfaMethod;
  mfaVerified: boolean;
  verifiedAt: string;
}

export interface TraceabilityPassportRecord {
  passport_id: string;
  batch_id: string;
  qr_payload: string;
  cluster_breakdown: string;
  composite_moisture_pct: number;
  purity_pct: number;
  compliance_status: string;
}

export type DatabaseProvider = 'firebase' | 'supabase' | 'local';

export type SyncStatus =
  | 'connected'
  | 'syncing'
  | 'saved'
  | 'queued_offline'
  | 'local_cache'
  | 'error';

export interface CustomFirebaseWebConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
}

export interface CloudDatabaseConfig {
  provider: DatabaseProvider;
  customFirebaseConfig?: CustomFirebaseWebConfig | null;
  supabaseConfig?: SupabaseConnectionConfig | null;
}

export interface SpiceBridgeWorkspaceSnapshot {
  lots: FarmerLot[];
  selectedLotId: string;
  batches: ProcessingBatch[];
  passports: TraceabilityPassportRecord[];
  millOrders: MillOrder[];
  activeStageId: StageId;
  activeView: AppView;
  alternatives: CompetitorAlternative[];
  positioningState: PositioningMapState;
  positioningStatement: PositioningStatementState;
  aiChallengeState: AIChallengeState;
}




