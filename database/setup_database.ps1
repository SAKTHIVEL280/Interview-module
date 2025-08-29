# PowerShell script to set up the context_history table
# Run this script to create the required database table

Write-Host "Setting up Context History Database Table..." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Get MySQL credentials
$mysqlUser = "root"
$mysqlPassword = Read-Host "Enter MySQL password" -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword))

# SQL commands to create the table
$sqlCommands = @"
USE certaintimaster;

-- Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS context_history;

-- Create the context_history table
CREATE TABLE context_history (
  id int(11) NOT NULL AUTO_INCREMENT,
  project_id varchar(50) NOT NULL,
  message_type enum('user','bot') NOT NULL,
  message_text longtext NOT NULL,
  timestamp datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message_date date NOT NULL,
  session_id varchar(100) DEFAULT NULL,
  files json DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_id (project_id),
  KEY idx_timestamp (timestamp),
  KEY idx_session_id (session_id),
  KEY idx_project_timestamp (project_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
DESCRIBE context_history;

SELECT 'Context History table created successfully!' as status;
"@

# Write SQL to temporary file
$tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlCommands | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Execute the SQL file
    Write-Host "Creating context_history table..." -ForegroundColor Yellow
    
    $process = Start-Process -FilePath "mysql" -ArgumentList "-u", $mysqlUser, "-p$password", "--execute=source $tempSqlFile" -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ SUCCESS: context_history table created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Table Details:" -ForegroundColor Cyan
        Write-Host "  • Database: certaintimaster" -ForegroundColor White
        Write-Host "  • Table: context_history" -ForegroundColor White
        Write-Host "  • Purpose: Store chat conversation history" -ForegroundColor White
        Write-Host ""
        Write-Host "🚀 You can now start the application:" -ForegroundColor Cyan
        Write-Host "  npm start" -ForegroundColor White
        Write-Host ""
        Write-Host "🧪 Test the feature:" -ForegroundColor Cyan
        Write-Host "  1. Go to http://localhost:8080/1" -ForegroundColor White
        Write-Host "  2. Answer some questions" -ForegroundColor White
        Write-Host "  3. Switch to http://localhost:8080/2" -ForegroundColor White
        Write-Host "  4. Switch back to http://localhost:8080/1" -ForegroundColor White
        Write-Host "  5. Your conversation history will be preserved!" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ ERROR: Failed to create table. Exit code: $($process.ExitCode)" -ForegroundColor Red
        Write-Host "Please check your MySQL credentials and try again." -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please make sure MySQL is installed and accessible from command line." -ForegroundColor Red
} finally {
    # Clean up temporary file
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force
    }
}

Write-Host ""
Read-Host "Press Enter to continue..."
