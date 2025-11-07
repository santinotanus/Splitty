import knex, { Knex } from 'knex';
import 'dotenv/config';

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '52534');
const useWindowsAuth = !process.env.DB_USER;

console.log('📊 Configuración de base de datos:');
console.log('   Server:', host);
console.log('   Port:', port);
console.log('   Database:', process.env.DB_NAME || 'splitty');
console.log('   Auth:', useWindowsAuth ? 'Windows Authentication' : 'SQL Server Authentication');
if (!useWindowsAuth) {
  console.log('   User:', process.env.DB_USER);
}

export const db: Knex = knex({
  client: 'mssql',
  connection: {
    server: host,
    port: port,
    database: process.env.DB_NAME || 'splitty',
    ...(useWindowsAuth ? {
      options: {
        trustedConnection: true,
        enableArithAbort: true,
        trustServerCertificate: true,
        encrypt: false
      }
    } : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        enableArithAbort: true,
        trustServerCertificate: true,
        encrypt: false
      }
    })
  },
  pool: {
    min: 0,
    max: 10
  }
});