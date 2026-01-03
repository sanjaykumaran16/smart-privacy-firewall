export type Practice = 'data_selling' | 'third_party_sharing' | 'advertising' | 'retention' | 'sensitive_data';
export type Status = 'ALLOWS' | 'FORBIDS' | 'CONDITIONAL' | 'UNCLEAR';
export type Verdict = 'SAFE' | 'WARNING' | 'BLOCKED';

export interface User {
  id: number;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserRule {
  id: number;
  user_id: number;
  practice: Practice;
  allowed: boolean;
  priority: number;
  created_at: Date;
}

export interface Site {
  id: number;
  domain: string;
  policy_url: string | null;
  last_analyzed: Date | null;
  policy_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AIClassification {
  section_id: string;
  practice: Practice;
  status: Status;
  evidence: string;
}

export interface PolicyAnalysis {
  id: number;
  site_id: number;
  section_id: string;
  practice: Practice;
  status: Status;
  evidence: string;
  analyzed_at: Date;
}

export interface Violation {
  id: number;
  user_id: number;
  site_id: number;
  analysis_id: number;
  rule_id: number;
  risk_score: number;
  verdict: Verdict;
  detected_at: Date;
}

export interface AnalysisResult {
  domain: string;
  verdict: Verdict;
  risk_score: number;
  violations: Array<{
    practice: Practice;
    status: Status;
    evidence: string;
    user_rule: boolean;
  }>;
  analyzed_at: Date;
}