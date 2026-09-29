CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('master', 'viewer') NOT NULL DEFAULT 'viewer',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_username_unique (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO users (username, password_hash, role)
VALUES
    ('Luiz', '$2b$12$w5x4U/m6UafQVt41AVGPJuyl19RtyK0VulJ6TM3aZvoo2ZRPGSFz.', 'master'),
    ('Aline', '$2b$12$BxfXfi/AHEDRrEM8haKGyeDy0jrSg0FXnWRZSvacTiqAO6P2MKB.', 'viewer')
ON DUPLICATE KEY UPDATE username = VALUES(username);