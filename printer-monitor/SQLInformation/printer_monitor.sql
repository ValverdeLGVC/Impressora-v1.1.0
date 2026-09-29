-- Schema inicial completo do Printer Monitor.
-- Selecione/crie o banco antes de importar este arquivo.
-- O Docker Compose seleciona o banco configurado em DB_NAME automaticamente.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Estrutura para tabela `printers`
--

CREATE TABLE `printers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `ip_address` varchar(15) DEFAULT NULL,
  `manufacturer` varchar(50) DEFAULT NULL,
  `model` varchar(50) DEFAULT NULL,
  `snmp_port` int(11) DEFAULT 161,
  `snmp_version` varchar(10) DEFAULT '2c',
  `snmp_community` varchar(50) DEFAULT 'public',
  `is_active` tinyint(1) DEFAULT 1,
  `status` enum('online','offline','error') DEFAULT 'offline',
  `last_checked` datetime DEFAULT NULL,
  `page_count` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Estrutura para tabela `toners`
--

CREATE TABLE `toners` (
  `id` int(11) NOT NULL,
  `printer_id` int(11) NOT NULL,
  `color` varchar(20) NOT NULL,
  `current_level` int(11) DEFAULT 0,
  `max_capacity` int(11) DEFAULT NULL,
  `status` enum('normal','warning','critical','empty') DEFAULT 'normal',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `printers`
--
ALTER TABLE `printers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ip_address` (`ip_address`);

--
-- Índices de tabela `toners`
--
ALTER TABLE `toners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `printer_id` (`printer_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `printers`
--
ALTER TABLE `printers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `toners`
--
ALTER TABLE `toners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `toners`
--
ALTER TABLE `toners`
  ADD CONSTRAINT `toners_ibfk_1` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE;

-- --------------------------------------------------------
-- Tabelas de usuários e estoque de toner
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('master','viewer') NOT NULL DEFAULT 'viewer',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('Luiz', '$2b$12$w5x4U/m6UafQVt41AVGPJuyl19RtyK0VulJ6TM3aZvoo2ZRPGSFz.', 'master'),
  ('Aline', '$2b$12$BxfXfi/AHEDrEM8haKGyeDy0jrSg0FXnWRZSvacTiqAO6P2MKB.', 'viewer');

CREATE TABLE `toner_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model` varchar(120) NOT NULL,
  `color` varchar(40) NOT NULL,
  `quantity` int(10) unsigned NOT NULL DEFAULT 0,
  `min_quantity` int(10) unsigned NOT NULL DEFAULT 2,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `toner_inventory_printers` (
  `inventory_id` int(11) NOT NULL,
  `printer_id` int(11) NOT NULL,
  PRIMARY KEY (`inventory_id`, `printer_id`),
  CONSTRAINT `toner_inventory_printers_inventory_fk` FOREIGN KEY (`inventory_id`) REFERENCES `toner_inventory` (`id`) ON DELETE CASCADE,
  CONSTRAINT `toner_inventory_printers_printer_fk` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `toner_usage` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `inventory_id` int(11) DEFAULT NULL,
  `model_snapshot` varchar(120) NOT NULL,
  `color_snapshot` varchar(40) NOT NULL,
  `printer_id` int(11) DEFAULT NULL,
  `printer_name_snapshot` varchar(100) NOT NULL,
  `quantity` int(10) unsigned NOT NULL DEFAULT 1,
  `used_at` date NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `toner_usage_date_printer_idx` (`used_at`, `printer_id`),
  CONSTRAINT `toner_usage_inventory_fk` FOREIGN KEY (`inventory_id`) REFERENCES `toner_inventory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `toner_usage_printer_fk` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `toner_settings` (
  `id` tinyint(4) NOT NULL,
  `alert_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `alert_threshold` int(10) unsigned NOT NULL DEFAULT 2,
  `replenish_target` int(10) unsigned NOT NULL DEFAULT 5,
  `notify_email` varchar(254) DEFAULT NULL,
  `notify_whatsapp` varchar(30) DEFAULT NULL,
  `decision` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `toner_alert_log` (
  `alert_date` date NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`alert_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `toner_settings` (`id`) VALUES (1);

CREATE TABLE `whatsapp_contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `treatment` varchar(20) NOT NULL DEFAULT 'none',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_contacts_phone_unique` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
