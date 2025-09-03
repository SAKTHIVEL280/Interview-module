-- Session Management Table for Admin Session Control
-- This table tracks session status for each project/user

CREATE DATABASE IF NOT EXISTS sme_interview_db;
USE sme_interview_db;

-- Create session_management table
CREATE TABLE IF NOT EXISTS session_management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    session_status ENUM('active', 'ended') NOT NULL DEFAULT 'active',
    ended_by_admin BOOLEAN DEFAULT FALSE,
    ended_timestamp DATETIME NULL,
    admin_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (project_id),
    INDEX idx_session_status (session_status),
    INDEX idx_ended_timestamp (ended_timestamp)
);

-- Insert or update session status
-- This will be used to track if admin has ended a session for a specific project
INSERT INTO session_management (project_id, session_status) 
VALUES ('3000609', 'active') 
ON DUPLICATE KEY UPDATE 
    session_status = VALUES(session_status),
    updated_at = CURRENT_TIMESTAMP;

DESCRIBE session_management;
SELECT 'Session Management table created successfully!' AS status;
