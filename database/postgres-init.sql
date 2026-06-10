-- VigilNet PostgreSQL Relational DB Schema

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Auditor',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed an initial Auditor user for local testing (password: auditor123)
-- bcrypt hash for 'auditor123': $2b$10$w095QW/L0T3mB.lD.XoBSu/5qH3r5k0.kFhJ24.R94hI2/0vL9Oxe
INSERT INTO users (email, password_hash, role, active)
VALUES ('auditor@vigilnet.com', '$2b$10$w095QW/L0T3mB.lD.XoBSu/5qH3r5k0.kFhJ24.R94hI2/0vL9Oxe', 'Auditor', TRUE)
ON CONFLICT (email) DO NOTHING;
