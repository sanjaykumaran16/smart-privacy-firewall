import { Router, Request, Response } from 'express';
import { query, queryOne } from '../utils/database';
import { fetchPrivacyPolicy, chunkText, hashText } from '../services/scraper';
import { analyzeChunk } from '../services/aiClient';
import { evaluatePolicy } from '../services/ruleEngine';
import { AIClassification, UserRule, Site, PolicyAnalysis, AnalysisResult } from '../models/types';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

router.post('/analyze-policy', async (req: Request, res: Response) => {
  try {
    const { policyUrl, userId } = req.body;
    
    if (!policyUrl || !userId) {
      return res.status(400).json({ error: 'Missing policyUrl or userId' });
    }
    
    const domain = new URL(policyUrl).hostname;
    
    const existingSite = await queryOne<Site>(
      'SELECT * FROM sites WHERE domain = $1',
      [domain]
    );
    
    const policyText = await fetchPrivacyPolicy(policyUrl);
    const policyHash = hashText(policyText);
    
    if (existingSite && existingSite.policy_hash === policyHash) {
      const cachedAnalyses = await query<PolicyAnalysis>(
        'SELECT * FROM policy_analyses WHERE site_id = $1',
        [existingSite.id]
      );
      
      const userRules = await query<UserRule>(
        'SELECT * FROM user_rules WHERE user_id = $1',
        [userId]
      );
      
      const evaluation = evaluatePolicy(
        cachedAnalyses.map(a => ({
          section_id: a.section_id,
          practice: a.practice,
          status: a.status,
          evidence: a.evidence
        })),
        userRules
      );
      
      const result: AnalysisResult = {
        domain,
        verdict: evaluation.verdict,
        risk_score: evaluation.risk_score,
        violations: evaluation.violations,
        analyzed_at: existingSite.last_analyzed || new Date()
      };
      
      return res.json(result);
    }
    
    let site: Site;
    if (existingSite) {
      await query(
        'UPDATE sites SET policy_hash = $1, last_analyzed = NOW(), updated_at = NOW() WHERE id = $2',
        [policyHash, existingSite.id]
      );
      await query('DELETE FROM policy_analyses WHERE site_id = $1', [existingSite.id]);
      site = { ...existingSite, policy_hash: policyHash };
    } else {
      const rows = await query<Site>(
        'INSERT INTO sites (domain, policy_url, policy_hash, last_analyzed) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [domain, policyUrl, policyHash]
      );
      site = rows[0];
    }
    
    const chunks = chunkText(policyText);
    const allClassifications: AIClassification[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const classifications = await analyzeChunk(chunks[i], i);
      allClassifications.push(...classifications);
      
      for (const cls of classifications) {
        await query(
          'INSERT INTO policy_analyses (site_id, section_id, practice, status, evidence) VALUES ($1, $2, $3, $4, $5)',
          [site.id, cls.section_id, cls.practice, cls.status, cls.evidence]
        );
      }
    }
    
    const userRules = await query<UserRule>(
      'SELECT * FROM user_rules WHERE user_id = $1',
      [userId]
    );
    
    const evaluation = evaluatePolicy(allClassifications, userRules);
    
    for (const violation of evaluation.violations) {
      const analysis = await queryOne<PolicyAnalysis>(
        'SELECT * FROM policy_analyses WHERE site_id = $1 AND practice = $2 LIMIT 1',
        [site.id, violation.practice]
      );
      
      const rule = userRules.find(r => r.practice === violation.practice);
      
      if (analysis && rule) {
        await query(
          'INSERT INTO violations (user_id, site_id, analysis_id, rule_id, risk_score, verdict) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, site.id, analysis.id, rule.id, evaluation.risk_score, evaluation.verdict]
        );
      }
    }
    
    const result: AnalysisResult = {
      domain,
      verdict: evaluation.verdict,
      risk_score: evaluation.risk_score,
      violations: evaluation.violations,
      analyzed_at: new Date()
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;