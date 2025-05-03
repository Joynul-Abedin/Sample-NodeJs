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

-- Create Users table if it doesn't exist
BEGIN
  EXECUTE IMMEDIATE 'CREATE TABLE USERS (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    age NUMBER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )';
  DBMS_OUTPUT.PUT_LINE('USERS table created successfully');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('USERS table already exists');
    ELSE
      RAISE;
    END IF;
END;
/

-- Create index on email for faster lookups
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_users_email ON USERS(email)';
  DBMS_OUTPUT.PUT_LINE('Index created successfully');
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE = -1408 OR SQLCODE = -955 THEN
      DBMS_OUTPUT.PUT_LINE('Index already exists');
    ELSE
      RAISE;
    END IF;
END;
/

-- Create a trigger to update the updated_at timestamp
BEGIN
  EXECUTE IMMEDIATE '
  CREATE OR REPLACE TRIGGER users_update_trigger
  BEFORE UPDATE ON USERS
  FOR EACH ROW
  BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
  END;';
  DBMS_OUTPUT.PUT_LINE('Trigger created successfully');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Error creating trigger: ' || SQLERRM);
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