import knex, { Knex } from 'knex';
import 'dotenv/config';

// Leer variables de entorno
const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '1433');
const database = process.env.DB_NAME || 'splitty';
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;

console.log('📊 Configuración de base de datos:');
console.log('   Server:', host);
console.log('   Port:', port);
console.log('   Database:', database);
console.log('   User:', user);

// Validación simple
if (!user || !password) {
  console.warn('⚠️  ADVERTENCIA: DB_USER o DB_PASSWORD no están configurados.');
  console.warn('   La aplicación puede fallar si se requiere autenticación SQL.');
}

// Configuración de conexión directa para SQL Server Auth
const connectionConfig: any = {
  server: host,
  port: port,
  database: database,
  user: user,
  password: password,
  options: {
    enableArithAbort: true,
    // ¡CORREGIDO! encrypt: true es requerido por Azure
    encrypt: true,
    // trustServerCertificate: true // Puedes mantenerlo para desarrollo local,
                                  // pero en producción Azure es mejor false.
                                  // Dejémoslo en 'true' por ahora para
                                  // asegurar compatibilidad local y nube.
    trustServerCertificate: true,
  }
};

export const db: Knex = knex({
  client: 'mssql',
  connection: connectionConfig,
  pool: {
    min: 0,
    max: 10
  }
});