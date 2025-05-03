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