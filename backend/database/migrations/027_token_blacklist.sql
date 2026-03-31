-- Token Blacklist for JWT Revocation
-- Stores revoked tokens to prevent reuse after logout

CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(100) DEFAULT 'USER_LOGOUT',
    ip_address VARCHAR(50),
    user_agent TEXT
);

-- Index for fast JTI lookup
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);

-- Index for expiration-based queries
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Index for cleanup queries (expired tokens)
CREATE INDEX IF NOT EXISTS idx_token_blacklist_cleanup 
    ON token_blacklist(expires_at) 
    WHERE expires_at < CURRENT_TIMESTAMP;

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON token_blacklist(user_id);

-- Comment
COMMENT ON TABLE token_blacklist IS 'Stores revoked JWT tokens to prevent reuse after logout or forced revocation';
COMMENT ON COLUMN token_blacklist.token_jti IS 'JWT ID (jti claim) - unique identifier for each token';
COMMENT ON COLUMN token_blacklist.expires_at IS 'Token expiration time - used for automatic cleanup';
COMMENT ON COLUMN token_blacklist.reason IS 'Reason for blacklisting: USER_LOGOUT, ADMIN_REVOKE, SECURITY_BREACH, etc.';
