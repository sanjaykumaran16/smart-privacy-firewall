import re
from typing import List, Dict
from pydantic import BaseModel

class Classification(BaseModel):
    section_id: str
    practice: str
    status: str
    evidence: str

class ClassificationRequest(BaseModel):
    text: str
    section_id: str

PRACTICES = {
    'data_selling': [
        r'sell.*data',
        r'sell.*information',
        r'monetize.*data',
        r'revenue.*personal',
        r'sell to third parties'
    ],
    'third_party_sharing': [
        r'share.*third[\s-]part',
        r'disclose.*third[\s-]part',
        r'provide.*third[\s-]part',
        r'transfer.*third[\s-]part',
        r'third[\s-]part.*access'
    ],
    'advertising': [
        r'advertis',
        r'target.*ads',
        r'personalized ads',
        r'marketing purposes',
        r'promotional'
    ],
    'retention': [
        r'retain.*data',
        r'keep.*information',
        r'store.*\d+\s*(year|month|day)',
        r'retention period',
        r'delete.*after'
    ],
    'sensitive_data': [
        r'health.*information',
        r'medical.*data',
        r'financial.*data',
        r'credit card',
        r'social security',
        r'biometric',
        r'genetic'
    ]
}

FORBID_KEYWORDS = [
    r'do not sell',
    r'will not sell',
    r'never sell',
    r'do not share',
    r'will not share',
    r'prohibit',
    r'forbidden',
    r'not allow'
]

CONDITIONAL_KEYWORDS = [
    r'may share',
    r'might share',
    r'can share',
    r'under certain',
    r'in some cases',
    r'with consent',
    r'if you',
    r'unless'
]

def extract_context(text: str, match_pos: int, context_size: int = 150) -> str:
    start = max(0, match_pos - context_size)
    end = min(len(text), match_pos + context_size)
    snippet = text[start:end].strip()
    if start > 0:
        snippet = '...' + snippet
    if end < len(text):
        snippet = snippet + '...'
    return snippet

def classify_text(text: str, section_id: str) -> List[Classification]:
    text_lower = text.lower()
    classifications = []
    
    for practice, patterns in PRACTICES.items():
        for pattern in patterns:
            matches = list(re.finditer(pattern, text_lower, re.IGNORECASE))
            
            for match in matches:
                start_pos = max(0, match.start() - 200)
                end_pos = min(len(text), match.end() + 200)
                context = text_lower[start_pos:end_pos]
                
                status = 'ALLOWS'
                
                for forbid in FORBID_KEYWORDS:
                    if re.search(forbid, context, re.IGNORECASE):
                        status = 'FORBIDS'
                        break
                
                if status == 'ALLOWS':
                    for conditional in CONDITIONAL_KEYWORDS:
                        if re.search(conditional, context, re.IGNORECASE):
                            status = 'CONDITIONAL'
                            break
                
                evidence = extract_context(text, match.start(), 100)
                
                classifications.append(Classification(
                    section_id=section_id,
                    practice=practice,
                    status=status,
                    evidence=evidence
                ))
                
                break
    
    if not classifications:
        classifications.append(Classification(
            section_id=section_id,
            practice='advertising',
            status='UNCLEAR',
            evidence='No specific privacy practices detected in this section'
        ))
    
    return classifications