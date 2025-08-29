-- Context History Table for Interview Module
-- This table stores the chat conversation history for each project

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
  KEY `idx_session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for efficient querying by project and time
CREATE INDEX idx_project_timestamp ON context_history(project_id, timestamp);
