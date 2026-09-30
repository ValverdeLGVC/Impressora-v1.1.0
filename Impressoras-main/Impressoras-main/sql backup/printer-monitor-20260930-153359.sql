/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: printer_monitor
-- ------------------------------------------------------
-- Server version	11.4.13-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `printers`
--

DROP TABLE IF EXISTS `printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `printers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ip_address` (`ip_address`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `printers`
--

LOCK TABLES `printers` WRITE;
/*!40000 ALTER TABLE `printers` DISABLE KEYS */;
INSERT INTO `printers` VALUES
(5,'DCP - L2540DW - [S.02]','SUP','192.168.1.117','Brothers','DCP-L2540DW',161,'2c','public',1,'online','2026-09-30 18:33:17',379001,'2026-09-15 19:57:58','2026-09-30 18:33:17'),
(6,'DCP - L2540DW - [S.01]','SUP','192.168.1.179','Brother','DCP-L2540DW',161,'2c','public',1,'online','2026-09-30 18:33:17',70762,'2026-09-15 20:28:51','2026-09-30 18:33:17'),
(15,'Pontual / SN: U6380M3X657826','Pará',NULL,'Brother','DCP-1617NW 110V - 120V',161,'2c','public',1,'offline',NULL,NULL,'2026-09-29 13:45:11','2026-09-29 13:45:11'),
(16,'Brother DCP - 7065DN Printer - [T.01]','TER','192.168.1.217','Brother','Brother Laser Type1 Class Driver - [DCP]',161,'2c','public',1,'online','2026-09-30 18:33:17',376175,'2026-09-29 20:44:57','2026-09-30 18:33:17');
/*!40000 ALTER TABLE `printers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `toner_alert_log`
--

DROP TABLE IF EXISTS `toner_alert_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toner_alert_log` (
  `alert_date` date NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`alert_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `toner_alert_log`
--

LOCK TABLES `toner_alert_log` WRITE;
/*!40000 ALTER TABLE `toner_alert_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `toner_alert_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `toner_inventory`
--

DROP TABLE IF EXISTS `toner_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toner_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `model` varchar(120) NOT NULL,
  `color` varchar(40) NOT NULL,
  `quantity` int(10) unsigned NOT NULL DEFAULT 0,
  `min_quantity` int(10) unsigned NOT NULL DEFAULT 2,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `toner_inventory`
--

LOCK TABLES `toner_inventory` WRITE;
/*!40000 ALTER TABLE `toner_inventory` DISABLE KEYS */;
INSERT INTO `toner_inventory` VALUES
(1,'TN 410/420/450','Preto',1,2,'2026-09-25 23:31:10','2026-09-29 20:51:55'),
(2,'TN 660/630 Universal','Preto',6,2,'2026-09-28 12:27:09','2026-09-29 20:32:23');
/*!40000 ALTER TABLE `toner_inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `toner_inventory_printers`
--

DROP TABLE IF EXISTS `toner_inventory_printers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toner_inventory_printers` (
  `inventory_id` int(11) NOT NULL,
  `printer_id` int(11) NOT NULL,
  PRIMARY KEY (`inventory_id`,`printer_id`),
  KEY `toner_inventory_printers_printer_fk` (`printer_id`),
  CONSTRAINT `toner_inventory_printers_inventory_fk` FOREIGN KEY (`inventory_id`) REFERENCES `toner_inventory` (`id`) ON DELETE CASCADE,
  CONSTRAINT `toner_inventory_printers_printer_fk` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `toner_inventory_printers`
--

LOCK TABLES `toner_inventory_printers` WRITE;
/*!40000 ALTER TABLE `toner_inventory_printers` DISABLE KEYS */;
INSERT INTO `toner_inventory_printers` VALUES
(2,5),
(2,6),
(1,16);
/*!40000 ALTER TABLE `toner_inventory_printers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `toner_settings`
--

DROP TABLE IF EXISTS `toner_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `toner_settings`
--

LOCK TABLES `toner_settings` WRITE;
/*!40000 ALTER TABLE `toner_settings` DISABLE KEYS */;
INSERT INTO `toner_settings` VALUES
(1,1,2,5,'compras.grupoago@gmail.com','+556283050276','Está em desenvolvimento uma automação para enviar alertas via WhatsApp ao setor financeiro sempre que o estoque de toners atingir um nível crítico. Enquanto a solução não é implementada, realizo o monitoramento manual, solicitando à Lícia a reposição sempre que o estoque de determinado modelo chega a duas unidades, visando manter uma reserva mínima de cinco a seis toners.\n\nO monitoramento foi iniciado em meados do mês, portanto, ainda não há dados suficientes para uma estimativa precisa de consumo. Desde o início do controle de entradas e saídas, foi necessária apenas uma substituição de toner na impressora de maior demanda, identificada pelo IP 192.168.1.179.','2026-09-30 14:16:58');
/*!40000 ALTER TABLE `toner_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `toner_usage`
--

DROP TABLE IF EXISTS `toner_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  KEY `toner_usage_date_printer_idx` (`used_at`,`printer_id`),
  KEY `toner_usage_inventory_fk` (`inventory_id`),
  KEY `toner_usage_printer_fk` (`printer_id`),
  CONSTRAINT `toner_usage_inventory_fk` FOREIGN KEY (`inventory_id`) REFERENCES `toner_inventory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `toner_usage_printer_fk` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `toner_usage`
--

LOCK TABLES `toner_usage` WRITE;
/*!40000 ALTER TABLE `toner_usage` DISABLE KEYS */;
INSERT INTO `toner_usage` VALUES
(2,1,'TN 410/420/450','Preto',16,'Brother DCP - 7065DN Printer - [T.01]',1,'2026-09-24','','Luiz','2026-09-29 20:51:55');
/*!40000 ALTER TABLE `toner_usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `toners`
--

DROP TABLE IF EXISTS `toners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `printer_id` int(11) NOT NULL,
  `color` varchar(20) NOT NULL,
  `current_level` int(11) DEFAULT 0,
  `max_capacity` int(11) DEFAULT NULL,
  `status` enum('normal','warning','critical','empty') DEFAULT 'normal',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `printer_id` (`printer_id`),
  CONSTRAINT `toners_ibfk_1` FOREIGN KEY (`printer_id`) REFERENCES `printers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `toners`
--

LOCK TABLES `toners` WRITE;
/*!40000 ALTER TABLE `toners` DISABLE KEYS */;
INSERT INTO `toners` VALUES
(4,5,'Drum Unit',100,12000,'normal','2026-09-30 18:33:17'),
(6,6,'Drum Unit',95,12000,'normal','2026-09-30 18:33:17'),
(7,16,'Drum Unit',99,12000,'normal','2026-09-30 18:33:17');
/*!40000 ALTER TABLE `toners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'Luiz','$2b$12$w5x4U/m6UafQVt41AVGPJuyl19RtyK0VulJ6TM3aZvoo2ZRPGSFz.','master',1,'2026-09-25 19:21:33','2026-09-25 19:21:33');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_contacts`
--

DROP TABLE IF EXISTS `whatsapp_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `treatment` varchar(20) NOT NULL DEFAULT 'none',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_contacts_phone_unique` (`phone_number`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_contacts`
--

LOCK TABLES `whatsapp_contacts` WRITE;
/*!40000 ALTER TABLE `whatsapp_contacts` DISABLE KEYS */;
INSERT INTO `whatsapp_contacts` VALUES
(1,'Luiz Gustavo','5564992142391','Sr.','2026-09-29 19:32:05','2026-09-29 19:32:05'),
(2,'Lícia','556283050276','Sra.','2026-09-29 19:38:23','2026-09-29 19:38:23');
/*!40000 ALTER TABLE `whatsapp_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'printer_monitor'
--

--
-- Dumping routines for database 'printer_monitor'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-09-30 18:33:19
