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

-- Create the agentic_interaction table
CREATE TABLE IF NOT EXISTS `agentic_interaction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` varchar(50) NOT NULL,
  `interaction_type` enum('question','answer','system') NOT NULL DEFAULT 'answer',
  `question_number` int(11) NOT NULL,
  `question_text` longtext NOT NULL,
  `answer_text` longtext NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 1,
  `interaction_timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `files` json DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `agent_context` json DEFAULT NULL,
  `validation_score` decimal(3,2) DEFAULT NULL,
  `retry_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_question` (`project_id`, `question_number`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_question_number` (`question_number`),
  KEY `idx_is_completed` (`is_completed`),
  KEY `idx_interaction_type` (`interaction_type`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_interaction_timestamp` (`interaction_timestamp`),
  KEY `idx_project_completed` (`project_id`, `is_completed`),
  KEY `idx_project_timestamp` (`project_id`, `interaction_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for answered questions summary (recreate to ensure it's up to date)
DROP VIEW IF EXISTS `agentic_interaction_summary`;
CREATE VIEW `agentic_interaction_summary` AS
SELECT 
  project_id,
  COUNT(*) as total_completed,
  GROUP_CONCAT(question_number ORDER BY question_number) as completed_question_numbers,
  MAX(interaction_timestamp) as last_interaction_at,
  AVG(validation_score) as avg_validation_score,
  SUM(retry_count) as total_retries
FROM agentic_interaction 
WHERE is_completed = 1 
GROUP BY project_id;

-- Verify tables creation
DESCRIBE context_history;
DESCRIBE agentic_interaction;

SELECT 'Context History and Agentic Interaction tracking tables created successfully!' as status;
