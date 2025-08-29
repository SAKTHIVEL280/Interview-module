-- Question-Answer Tracking Table for Interview Module
-- This table tracks which questions have been answered for each project

CREATE TABLE IF NOT EXISTS `project_question_answers` (
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
  KEY `idx_is_answered` (`is_answered`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for efficient querying
CREATE INDEX idx_project_answered ON project_question_answers(project_id, is_answered);

-- View to get answered questions summary
CREATE OR REPLACE VIEW answered_questions_summary AS
SELECT 
  project_id,
  COUNT(*) as total_answered,
  GROUP_CONCAT(question_number ORDER BY question_number) as answered_question_numbers,
  MAX(answered_at) as last_answered_at
FROM project_question_answers 
WHERE is_answered = 1 
GROUP BY project_id;
