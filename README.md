# Node.js Oracle CRUD Application

A secure, production-ready CRUD (Create, Read, Update, Delete) REST API built with Node.js and Oracle Database, implementing modern security best practices.

## Features

- **Complete CRUD Operations**: Create, Read, Update, and Delete operations for user management
- **Security Features**:
  - CORS protection
  - Helmet for secure HTTP headers
  - XSS and HTTP Parameter Pollution protection
  - Rate limiting to prevent abuse
  - Input validation and sanitization
  - Structured error handling and logging
  - Secure database queries
- **Database Reliability**:
  - Connection pooling
  - Timeout handling
  - Graceful database shutdown
- **Operational Features**:
  - Structured logging with Winston
  - Graceful process shutdown
  - Comprehensive error handling
  - Health check endpoint
  - Environment-based configuration

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database (with Oracle Instant Client installed)
- npm (Node Package Manager)

## Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd nodejs-oracle-crud
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server configuration
   NODE_ENV=development
   PORT=3000
   API_VERSION=v1
   
   # CORS settings
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
   
   # Database configuration
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_CONNECT_STRING=your_connection_string
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   DB_POOL_INCREMENT=1
   
   # Logging configuration
   LOG_LEVEL=info
   
   # Security settings
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   ```

4. Create the users table in your Oracle database:
   ```sql
   CREATE TABLE users (
       id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
       name VARCHAR2(100) NOT NULL,
       email VARCHAR2(100) NOT NULL UNIQUE,
       age NUMBER CHECK (age >= 0 AND age <= 120)
   );
   ```

## Running the Application

Start the server in development mode:
```bash
npm run dev
```

Start the server in production mode:
```bash
npm start
```

Run linting:
```bash
npm run lint
```

## API Endpoints

### User Management

- `POST /api/users` - Create a new user
- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### System

- `GET /health` - Check system health

## Example Requests

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 30}'
```

### Get All Users (with pagination)
```bash
curl http://localhost:3000/api/users?page=1&limit=10
```

### Get User by ID
```bash
curl http://localhost:3000/api/users/1
```

### Update User
```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Smith", "email": "john.smith@example.com", "age": 31}'
```

### Delete User
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

## Security Considerations

This application implements several security best practices:

1. **Input Validation**: All inputs are validated and sanitized using express-validator.
2. **XSS Protection**: Uses helmet and xss-clean to prevent cross-site scripting attacks.
3. **Rate Limiting**: Prevents abuse through request rate limiting.
4. **CORS Protection**: Configurable CORS settings to restrict domain access.
5. **HTTP Security Headers**: Implements secure HTTP headers with helmet.
6. **Error Handling**: Secure error handling that doesn't leak sensitive information.
7. **Security Logging**: Comprehensive security event logging.

## Logging

Logs are stored in the `logs` directory and include:
- Application logs (`combined.log`)
- Error logs (`error.log`)
- Exception logs (`exceptions.log`)
- Unhandled rejection logs (`rejections.log`)

## Project Structure

```
├── config/                # Configuration files
│   └── database.js        # Database configuration
├── controllers/           # Route controllers
│   └── userController.js  # User CRUD operations
├── middleware/            # Express middleware
│   ├── security.js        # Security middleware
│   └── validator.js       # Input validation
├── routes/                # Application routes
│   └── userRoutes.js      # User routes
├── utils/                 # Utility functions
│   └── logger.js          # Logging configuration
├── logs/                  # Application logs
├── .env                   # Environment variables
├── .gitignore             # Git ignore file
├── package.json           # Node.js dependencies
├── README.md              # Project documentation
└── server.js              # Application entry point
```

## License

This project is licensed under the ISC License.

## Database Setup with Oracle SQL Developer Extension for VSCode

There are two steps to set up the database:

### 1. Run the setup script as SYSDBA:

1. Open the VSCode extension and connect to your Oracle database with the following SYSDBA settings:
   - Connection Type: Basic
   - Authentication Type: Default
   - Username: sys
   - Role: SYSDBA
   - Hostname: localhost
   - Port: 1521
   - Service name: FREEPDB1
   
2. Open the `database/setup.sql` file in VSCode.
3. Run the SQL script to:
   - Create a dedicated application user (app_user)
   - Create the necessary tables, triggers, indexes
   - Add sample data

### 2. Connect your application to the app_user:

Once you've run the setup script, your application will connect using:
- Username: app_user
- Password: app_password
- Connect String: localhost:1521/FREEPDB1

You can override these values in your .env file:
```
DB_USER=app_user
DB_PASSWORD=app_password
DB_CONNECT_STRING=localhost:1521/FREEPDB1
```

### Database Schema:

```sql
CREATE TABLE users (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    age NUMBER CHECK (age >= 0 AND age <= 120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing with Postman

A Postman collection and environment are included in the `postman` directory. To use them:

1. Import `postman/Oracle_CRUD_API.postman_collection.json` into Postman.
2. Import `postman/Oracle_API_Environment.postman_environment.json` into Postman.
3. Select the "Oracle API Environment" environment.
4. Start your application: `npm run dev`
5. Run the requests in the collection to test each endpoint.

### Automated Testing Flow:

1. Run the "Health Check" request to make sure the API is up.
2. Run the "Create User" request to add a new user.
3. Save the returned user ID as a Postman environment variable.
4. Use that ID to test the "Get User by ID", "Update User", and "Delete User" endpoints. 