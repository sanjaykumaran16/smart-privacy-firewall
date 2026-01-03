DROP TABLE IF EXISTS violations CASCADE;
DROP TABLE IF EXISTS policy_analyses CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS user_rules CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User privacy rules
CREATE TABLE user_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    practice VARCHAR(50) NOT NULL,
    allowed BOOLEAN NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_practice CHECK (practice IN ('data_selling', 'third_party_sharing', 'advertising', 'retention', 'sensitive_data'))
);

-- Sites with privacy policies
CREATE TABLE sites (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    policy_url TEXT,
    last_analyzed TIMESTAMP,
    policy_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy analysis results
CREATE TABLE policy_analyses (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    section_id VARCHAR(100) NOT NULL,
    practice VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    evidence TEXT NOT NULL,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('ALLOWS', 'FORBIDS', 'CONDITIONAL', 'UNCLEAR'))
);

-- Violations detected
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    analysis_id INTEGER REFERENCES policy_analyses(id) ON DELETE CASCADE,
    rule_id INTEGER REFERENCES user_rules(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL,
    verdict VARCHAR(20) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_verdict CHECK (verdict IN ('SAFE', 'WARNING', 'BLOCKED')),
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Indexes for performance
CREATE INDEX idx_user_rules_user_id ON user_rules(user_id);
CREATE INDEX idx_policy_analyses_site_id ON policy_analyses(site_id);
CREATE INDEX idx_violations_user_id ON violations(user_id);
CREATE INDEX idx_violations_site_id ON violations(site_id);
CREATE INDEX idx_sites_domain ON sites(domain);

-- Insert default test user
INSERT INTO users (email) VALUES ('test@example.com');

-- Insert default privacy rules for test user
INSERT INTO user_rules (user_id, practice, allowed, priority) VALUES
(1, 'data_selling', false, 10),
(1, 'third_party_sharing', false, 8),
(1, 'advertising', true, 3),
(1, 'retention', true, 5),
(1, 'sensitive_data', false, 10);