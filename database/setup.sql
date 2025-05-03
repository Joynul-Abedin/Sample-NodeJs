-- Make sure we're connected to the PDB
ALTER SESSION SET CONTAINER = FREEPDB1;

-- Create application user/schema if it doesn't exist
BEGIN
   EXECUTE IMMEDIATE 'DROP USER app_user CASCADE';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -1918 THEN -- ORA-01918: user does not exist
         RAISE;
      END IF;
END;
/

-- Create a dedicated user for the application
CREATE USER app_user IDENTIFIED BY "app_password"
QUOTA UNLIMITED ON USERS;

-- Grant necessary privileges
GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE, CREATE TRIGGER TO app_user;
GRANT CREATE PROCEDURE TO app_user;

-- Switch to the new schema for the remaining operations
ALTER SESSION SET CURRENT_SCHEMA = app_user;

-- Create users table if it doesn't exist
BEGIN
   EXECUTE IMMEDIATE 'DROP TABLE users';
EXCEPTION
   WHEN OTHERS THEN
      IF SQLCODE != -942 THEN
         RAISE;
      END IF;
END;
/

-- Create the users table
CREATE TABLE users (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    age NUMBER CHECK (age >= 0 AND age <= 120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE TRIGGER users_update_trigger
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Insert sample data
INSERT INTO users (name, email, age) VALUES ('John Doe', 'john.doe@example.com', 30);
INSERT INTO users (name, email, age) VALUES ('Jane Smith', 'jane.smith@example.com', 25);
INSERT INTO users (name, email, age) VALUES ('Bob Johnson', 'bob.johnson@example.com', 40);
INSERT INTO users (name, email, age) VALUES ('Alice Williams', 'alice.williams@example.com', 35);
INSERT INTO users (name, email, age) VALUES ('Charlie Brown', 'charlie.brown@example.com', 22);

-- Verify data was inserted
SELECT * FROM users;

-- Create a view for user reports
CREATE OR REPLACE VIEW user_age_summary AS
SELECT 
    COUNT(*) as total_users,
    MIN(age) as youngest_age,
    MAX(age) as oldest_age,
    ROUND(AVG(age), 2) as average_age
FROM users;

-- Verify the view works
SELECT * FROM user_age_summary;

-- Commit changes
COMMIT; 