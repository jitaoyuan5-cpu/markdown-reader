CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS captcha_challenges (
  id VARCHAR(64) PRIMARY KEY,
  code_hash VARCHAR(64) NOT NULL,
  expire_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_expire_at (expire_at)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expire_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  file_key VARCHAR(512) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_user_file (user_id, file_key),
  CONSTRAINT fk_file_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  bookmark_id VARCHAR(128) NOT NULL,
  file_key VARCHAR(512) NOT NULL,
  text TEXT NOT NULL,
  note TEXT NULL,
  position DOUBLE NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_user_bookmark (user_id, bookmark_id),
  INDEX idx_user_file (user_id, file_key),
  CONSTRAINT fk_bookmark_user FOREIGN KEY (user_id) REFERENCES users(id)
);
