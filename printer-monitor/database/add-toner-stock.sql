CREATE TABLE IF NOT EXISTS toner_inventory (
    id INT NOT NULL AUTO_INCREMENT,
    model VARCHAR(120) NOT NULL,
    color VARCHAR(40) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    min_quantity INT UNSIGNED NOT NULL DEFAULT 2,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS toner_inventory_printers (
    inventory_id INT NOT NULL,
    printer_id INT NOT NULL,
    PRIMARY KEY (inventory_id, printer_id),
    CONSTRAINT toner_inventory_printers_inventory_fk FOREIGN KEY (inventory_id) REFERENCES toner_inventory (id) ON DELETE CASCADE,
    CONSTRAINT toner_inventory_printers_printer_fk FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS toner_usage (
    id BIGINT NOT NULL AUTO_INCREMENT,
    inventory_id INT NULL,
    model_snapshot VARCHAR(120) NOT NULL,
    color_snapshot VARCHAR(40) NOT NULL,
    printer_id INT NULL,
    printer_name_snapshot VARCHAR(100) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    used_at DATE NOT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY toner_usage_date_printer_idx (used_at, printer_id),
    CONSTRAINT toner_usage_inventory_fk FOREIGN KEY (inventory_id) REFERENCES toner_inventory (id) ON DELETE SET NULL,
    CONSTRAINT toner_usage_printer_fk FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS toner_settings (
    id TINYINT NOT NULL,
    alert_enabled TINYINT(1) NOT NULL DEFAULT 0,
    alert_threshold INT UNSIGNED NOT NULL DEFAULT 2,
    replenish_target INT UNSIGNED NOT NULL DEFAULT 5,
    notify_email VARCHAR(254) DEFAULT NULL,
    notify_whatsapp VARCHAR(30) DEFAULT NULL,
    decision TEXT DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS toner_alert_log (
    alert_date DATE NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (alert_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO toner_settings (id) VALUES (1) ON DUPLICATE KEY UPDATE id = VALUES(id);