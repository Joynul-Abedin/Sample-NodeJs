const oracledb = require('oracledb');
require('dotenv').config();
const logger = require('./logger');

// Database configuration loaded from environment variables
const dbConfig = {
    user: process.env.DB_USER || 'sys',
    password: process.env.DB_PASSWORD || 'password',
    connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1'
};

// Add SYSDBA privilege if connecting as SYS user
if (dbConfig.user.toLowerCase() === 'sys') {
    dbConfig.privilege = oracledb.SYSDBA;
}

async function checkConnection() {
    let connection;
    try {
        // Set auto-commit to true
        oracledb.autoCommit = true;
        
        console.log('----------------------------------------------');
        console.log('ORACLE DATABASE CONNECTION CHECK');
        console.log('----------------------------------------------');
        console.log(`Attempting to connect with:`);
        console.log(`- User: ${dbConfig.user}`);
        console.log(`- Connect String: ${dbConfig.connectString}`);
        console.log(`- Privilege: ${dbConfig.privilege === oracledb.SYSDBA ? 'SYSDBA' : 'None'}`);
        console.log('----------------------------------------------');
        
        // Attempt to connect
        console.log('Connecting to Oracle database...');
        
        // Get a connection
        connection = await oracledb.getConnection(dbConfig);
        
        // Execute a simple query to verify connection
        const result = await connection.execute('SELECT 1 FROM DUAL');
        
        console.log('\n✅ CONNECTION SUCCESSFUL');
        console.log('----------------------------------------------');
        console.log('Database connection information:');
        
        // Get server version
        const serverInfo = await connection.execute(
            `SELECT 
                instance_name, 
                host_name, 
                version, 
                startup_time 
            FROM v$instance`
        );
        
        if (serverInfo.rows && serverInfo.rows.length > 0) {
            console.log(`- Instance Name: ${serverInfo.rows[0][0]}`);
            console.log(`- Host Name: ${serverInfo.rows[0][1]}`);
            console.log(`- Version: ${serverInfo.rows[0][2]}`);
            console.log(`- Started: ${serverInfo.rows[0][3]}`);
        }
        
        // Get current session info
        const sessionInfo = await connection.execute(
            `SELECT 
                sys_context('USERENV', 'SESSION_USER') as session_user,
                sys_context('USERENV', 'CON_NAME') as container,
                sys_context('USERENV', 'SERVER_HOST') as server_host
            FROM dual`
        );
        
        if (sessionInfo.rows && sessionInfo.rows.length > 0) {
            console.log(`- Connected as: ${sessionInfo.rows[0][0]}`);
            console.log(`- Container: ${sessionInfo.rows[0][1]}`);
            console.log(`- Server Host: ${sessionInfo.rows[0][2]}`);
        }
        
        console.log('----------------------------------------------');
        
        return true;
    } catch (err) {
        console.log('\n❌ CONNECTION FAILED');
        console.log('----------------------------------------------');
        console.log('Error details:');
        console.log(`- Error Code: ${err.errorNum || 'N/A'}`);
        console.log(`- Error Message: ${err.message}`);
        
        // Provide helpful suggestions based on error codes
        if (err.errorNum === 1017) {
            console.log('\nPossible solutions:');
            console.log('1. Check if the password in .env file matches the one used when creating the Docker container');
            console.log('2. Try resetting the password: docker exec your_container_name resetPassword new_password');
            console.log('3. Consider creating and using a regular database user instead of SYS:');
            console.log('   docker exec your_container_name createAppUser app_user app_password');
        } else if (err.errorNum === 12514 || err.errorNum === 12505) {
            console.log('\nPossible solutions:');
            console.log('1. Verify that the Oracle container is running: docker ps');
            console.log('2. Check if the service name is correct (should be FREEPDB1)');
            console.log('3. Make sure the port is correctly mapped: docker port your_container_name');
        } else if (err.message.includes('Connection refused') || err.message.includes('could not establish')) {
            console.log('\nPossible solutions:');
            console.log('1. Check if the Oracle container is running: docker ps');
            console.log('2. Verify the host and port (localhost:1521) are correct');
            console.log('3. Ensure the container port is properly exposed: docker port your_container_name');
        }
        
        console.log('----------------------------------------------');
        
        return false;
    } finally {
        if (connection) {
            try {
                // Release the connection
                await connection.close();
                console.log('Connection properly closed.');
            } catch (err) {
                console.error('Error closing connection:', err.message);
            }
        }
    }
}

// Run the check if script is executed directly
if (require.main === module) {
    checkConnection()
        .then(success => {
            if (!success) {
                process.exit(1);
            }
        })
        .catch(err => {
            console.error('Unexpected error:', err);
            process.exit(1);
        });
}

module.exports = { checkConnection }; 