import knex, { Knex } from 'knex';
import 'dotenv/config';

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '1433');
const database = process.env.DB_NAME || 'Splitty'; // Nota: SQL Server es case-sensitive en algunos casos
const useWindowsAuth = !process.env.DB_USER;

console.log('📊 Configuración de base de datos:');
console.log('   Server:', host);
console.log('   Port:', port);
console.log('   Database:', database);
console.log('   Auth:', useWindowsAuth ? 'Windows Authentication' : 'SQL Server Authentication');
if (!useWindowsAuth) {
  console.log('   User:', process.env.DB_USER);
}

// Configuración de conexión
let connectionConfig: any;

if (useWindowsAuth) {
  // Windows Authentication - usar cadena de conexión o configuración sin user/password
  connectionConfig = {
    server: host,
    port: port,
    database: database,
    options: {
      trustedConnection: true,
      enableArithAbort: true,
      trustServerCertificate: true,
      encrypt: false
    }
    // IMPORTANTE: No incluir 'user' ni 'password' para Windows Auth
  };
} else {
  // SQL Server Authentication
  connectionConfig = {
    server: host,
    port: port,
    database: database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      enableArithAbort: true,
      trustServerCertificate: true,
      encrypt: false
    }
  };
}

export const db: Knex = knex({
  client: 'mssql',
  connection: connectionConfig,
  pool: {
    min: 0,
    max: 10
  }
});