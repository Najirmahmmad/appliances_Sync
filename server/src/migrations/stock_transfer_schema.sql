-- Table structure for technician_stock
CREATE TABLE IF NOT EXISTS `technician_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technician_id` varchar(50) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `current_qty` decimal(10,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tech_item` (`technician_id`, `item_code`),
  KEY `technician_id` (`technician_id`),
  KEY `item_code` (`item_code`),
  CONSTRAINT `tech_stock_user_fk` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tech_stock_item_fk` FOREIGN KEY (`item_code`) REFERENCES `items` (`item_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for stock_header
CREATE TABLE IF NOT EXISTS `stock_header` (
  `book_code` varchar(5) NOT NULL DEFAULT 'ST',
  `vouch_no` int NOT NULL,
  `vouch_date` date NOT NULL,
  `technician_id` varchar(50) NOT NULL,
  `remarks` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`book_code`, `vouch_no`),
  KEY `technician_id` (`technician_id`),
  CONSTRAINT `stock_header_tech_fk` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for stock_items
CREATE TABLE IF NOT EXISTS `stock_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_code` varchar(5) NOT NULL,
  `vouch_no` int NOT NULL,
  `sr_no` int NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `qty` decimal(10,2) DEFAULT '0.00',
  `serial_numbers` text, -- Comma separated serial numbers
  PRIMARY KEY (`id`),
  KEY `header_key` (`book_code`, `vouch_no`),
  KEY `item_code` (`item_code`),
  CONSTRAINT `stock_items_header_fk` FOREIGN KEY (`book_code`, `vouch_no`) REFERENCES `stock_header` (`book_code`, `vouch_no`) ON DELETE CASCADE,
  CONSTRAINT `stock_items_item_fk` FOREIGN KEY (`item_code`) REFERENCES `items` (`item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
