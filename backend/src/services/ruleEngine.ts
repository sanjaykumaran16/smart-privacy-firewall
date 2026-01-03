import { AIClassification, UserRule, Verdict, Practice, Status } from '../models/types';

interface RuleViolation {
  practice: Practice;
  status: Status;
  evidence: string;
  user_rule: boolean;
  severity: number;
}

export function evaluatePolicy(
  classifications: AIClassification[],
  userRules: UserRule[]
): { verdict: Verdict; risk_score: number; violations: RuleViolation[] } {
  
  const violations: RuleViolation[] = [];
  let totalRisk = 0;
  
  const ruleMap = new Map<Practice, UserRule>();
  userRules.forEach(rule => ruleMap.set(rule.practice, rule));
  
  for (const classification of classifications) {
    const userRule = ruleMap.get(classification.practice);
    
    if (!userRule) {
      continue;
    }
    
    const isViolation = checkViolation(classification, userRule);
    
    if (isViolation) {
      const severity = calculateSeverity(classification, userRule);
      violations.push({
        practice: classification.practice,
        status: classification.status,
        evidence: classification.evidence,
        user_rule: true,
        severity
      });
      totalRisk += severity;
    }
  }
  
  const risk_score = Math.min(100, totalRisk);
  const verdict = determineVerdict(risk_score, violations.length);
  
  return { verdict, risk_score, violations };
}

function checkViolation(classification: AIClassification, rule: UserRule): boolean {
  if (classification.status === 'UNCLEAR') {
    return false;
  }
  
  if (classification.status === 'ALLOWS' && !rule.allowed) {
    return true;
  }
  
  if (classification.status === 'CONDITIONAL' && !rule.allowed) {
    return true;
  }
  
  return false;
}

function calculateSeverity(classification: AIClassification, rule: UserRule): number {
  let baseSeverity = 0;
  
  if (classification.status === 'ALLOWS') {
    baseSeverity = 30;
  } else if (classification.status === 'CONDITIONAL') {
    baseSeverity = 20;
  }
  
  const priorityMultiplier = rule.priority / 10;
  
  const practiceWeight: Record<Practice, number> = {
    'data_selling': 2.0,
    'third_party_sharing': 1.8,
    'sensitive_data': 2.0,
    'retention': 1.2,
    'advertising': 1.0
  };
  
  const weight = practiceWeight[classification.practice] || 1.0;
  
  return Math.round(baseSeverity * priorityMultiplier * weight);
}

function determineVerdict(risk_score: number, violationCount: number): Verdict {
  if (risk_score >= 70 || violationCount >= 3) {
    return 'BLOCKED';
  }
  
  if (risk_score >= 40 || violationCount >= 1) {
    return 'WARNING';
  }
  
  return 'SAFE';
}