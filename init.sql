-- Initialize database extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create database if it doesn't exist (this is handled by POSTGRES_DB env var)
-- The database 'luna' will be created automatically

-- Additional initialization can be added here if needed
-- For example, creating specific users, roles, or initial data

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE luna TO postgres;

-- Verify extensions are installed
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');
