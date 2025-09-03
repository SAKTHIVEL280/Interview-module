-- Database Setup for Interview Module Context History
-- Run this script in your MySQL database to create the required tables

USE certaintimaster;

-- Create tables only if they don't exist (preserve existing data)
-- Removed DROP statements to prevent data loss on restart

-- Create the context_history table
CREATE TABLE IF NOT EXISTS `context_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` varchar(50) NOT NULL,
  `message_type` enum('user','bot') NOT NULL,
  `message_text` longtext NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `message_date` date NOT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `files` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_project_timestamp` (`project_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
DESCRIBE context_history;

SELECT 'Context History table created successfully!' as status;
