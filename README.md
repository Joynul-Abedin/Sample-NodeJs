# Node.js Oracle CRUD Application

A simple CRUD (Create, Read, Update, Delete) application built with Node.js and Oracle Database.

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database (with Oracle Instant Client installed)
- npm (Node Package Manager)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_CONNECT_STRING=your_connection_string
   ```

4. Create the users table in your Oracle database:
   ```sql
   CREATE TABLE users (
       id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
       name VARCHAR2(100) NOT NULL,
       email VARCHAR2(100) NOT NULL UNIQUE,
       age NUMBER
   );
   ```

## Running the Application

Start the server:
```bash
node server.js
```

## API Endpoints

- `POST /api/users` - Create a new user
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Example Requests

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 30}'
```

### Get All Users
```bash
curl http://localhost:3000/api/users
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