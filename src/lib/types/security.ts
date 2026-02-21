export interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  status: "pass" | "fail" | "warning";
  score: number;
  details?: string;
}

export interface SecurityScoreResult {
  tenantId: number;
  tenantAbbrv: string;
  totalScore: number;
  checks: SecurityCheck[];
}

export interface SecuritySnapshotData {
  id: number;
  score: number;
  capturedAt: string;
}
