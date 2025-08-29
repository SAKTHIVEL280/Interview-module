-- Database Setup for Interview Module Context History
-- Run this script in your MySQL database to create the required tables

USE certaintimaster;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS `context_history`;
DROP TABLE IF EXISTS `project_question_answers`;
DROP VIEW IF EXISTS `answered_questions_summary`;

-- Create the context_history table
CREATE TABLE `context_history` (
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

-- Create the project_question_answers table
CREATE TABLE `project_question_answers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` varchar(50) NOT NULL,
  `question_number` int(11) NOT NULL,
  `question_text` longtext NOT NULL,
  `answer_text` longtext NOT NULL,
  `is_answered` tinyint(1) NOT NULL DEFAULT 1,
  `answered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `files` json DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_question` (`project_id`, `question_number`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_question_number` (`question_number`),
  KEY `idx_is_answered` (`is_answered`),
  KEY `idx_project_answered` (`project_id`, `is_answered`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for answered questions summary
CREATE VIEW `answered_questions_summary` AS
SELECT 
  project_id,
  COUNT(*) as total_answered,
  GROUP_CONCAT(question_number ORDER BY question_number) as answered_question_numbers,
  MAX(answered_at) as last_answered_at
FROM project_question_answers 
WHERE is_answered = 1 
GROUP BY project_id;

-- Verify tables creation
DESCRIBE context_history;
DESCRIBE project_question_answers;

SELECT 'Context History and Question-Answer tracking tables created successfully!' as status;
