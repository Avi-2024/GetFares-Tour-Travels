-- Token Blacklist for JWT Revocation (MySQL)
-- Stores revoked tokens to prevent reuse after logout

CREATE TABLE IF NOT EXISTS token_blacklist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id CHAR(36),
    expires_at TIMESTAMP NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(100) DEFAULT 'USER_LOGOUT',
    ip_address VARCHAR(50),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast JTI lookup
CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);

-- Index for expiration-based queries
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Index for cleanup queries (expired tokens)
CREATE INDEX idx_token_blacklist_cleanup 
    ON token_blacklist(expires_at);

-- Index for user-based queries
CREATE INDEX idx_token_blacklist_user ON token_blacklist(user_id);
