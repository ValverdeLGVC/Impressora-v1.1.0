-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 16/09/2026 às 15:35
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `printer_monitor`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `printers`
--

CREATE TABLE `printers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `ip_address` varchar(15) NOT NULL,
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
-- Despejando dados para a tabela `printers`
--

INSERT INTO `printers` (`id`, `name`, `location`, `ip_address`, `manufacturer`, `model`, `snmp_port`, `snmp_version`, `snmp_community`, `is_active`, `status`, `last_checked`, `page_count`, `created_at`, `updated_at`) VALUES
(4, 'Impressora Flávio', 'Sala de baixo', '192.168.1.217', 'Brothers', 'DCP-7065DN', 161, '2c', 'public', 1, 'online', '2026-09-15 17:41:04', 375793, '2026-09-15 19:55:51', '2026-09-15 20:41:04'),
(5, 'Impresora Rossi 1', 'Sala de cima', '192.168.1.117', 'Brothers', 'DCP-L2540DW', 161, '2c', 'public', 1, 'online', '2026-09-15 17:41:04', 377567, '2026-09-15 19:57:58', '2026-09-15 20:41:04'),
(6, 'Impressora Rossi 2', 'Sala superior', '192.168.1.179', 'Brother', 'DCP-L2540DW', 161, '2c', 'public', 1, 'online', '2026-09-15 17:41:04', 68059, '2026-09-15 20:28:51', '2026-09-15 20:41:04');

-- --------------------------------------------------------

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
-- Despejando dados para a tabela `toners`
--

INSERT INTO `toners` (`id`, `printer_id`, `color`, `current_level`, `max_capacity`, `status`, `updated_at`) VALUES
(4, 5, 'Drum Unit', 87, 12000, 'normal', '2026-09-15 20:41:04'),
(5, 4, 'Drum Unit', 59, 12000, 'normal', '2026-09-15 20:41:04'),
(6, 6, 'Drum Unit', 81, 12000, 'normal', '2026-09-15 20:41:04');

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `toners`
--
ALTER TABLE `toners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `toners`
--
ALTER TABLE `toners`
  ADD CONSTRAINT `toners_ibfk_1` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
