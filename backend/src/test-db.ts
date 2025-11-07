import { db } from './config/db';

async function testConnection() {
  console.log('================================');
  console.log('🔌 INICIANDO TEST DE CONEXIÓN');
  console.log('================================\n');

  try {
    console.log('📡 Intentando conectar a SQL Server...');
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT);
    console.log('Database:', process.env.DB_NAME);
    console.log('User:', process.env.DB_USER || '(Windows Auth)');
    console.log();

    // Test 1: Query simple
    console.log('🧪 Test 1: Ejecutando query simple...');
    const result = await db.raw('SELECT GETDATE() AS currentTime, @@VERSION AS version');
    console.log('✅ Query ejecutada exitosamente!');
    console.log('📅 Hora del servidor:', result[0].currentTime);
    console.log('💾 SQL Server:', result[0].version.split('\n')[0]);
    console.log();

    // Test 2: Listar bases de datos
    console.log('🧪 Test 2: Listando bases de datos...');
    const databases = await db.raw('SELECT name FROM sys.databases ORDER BY name');
    console.log('✅ Bases de datos encontradas:');
    databases.forEach((d: any) => {
      console.log('  📁', d.name);
    });
    console.log();

    // Test 3: Listar tablas
    console.log('🧪 Test 3: Listando tablas de splitty...');
    const tables = await db.raw(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    if (tables.length === 0) {
      console.log('⚠️  No se encontraron tablas. Ejecuta el script SQL primero.');
    } else {
      console.log('✅ Tablas encontradas:');
      tables.forEach((t: any) => {
        console.log('  📋', t.TABLE_NAME);
      });
    }
    console.log();

    // Test 4: Verificar tabla usuarios
    console.log('🧪 Test 4: Verificando estructura de tabla usuarios...');
    const columns = await db.raw(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'usuarios'
      ORDER BY ORDINAL_POSITION
    `);

    if (columns.length === 0) {
      console.log('⚠️  Tabla usuarios no existe. Debes crear las tablas primero.');
    } else {
      console.log('✅ Columnas de tabla usuarios:');
      columns.forEach((c: any) => {
        const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLen = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`  • ${c.COLUMN_NAME}: ${c.DATA_TYPE}${maxLen} ${nullable}`);
      });
    }
    console.log();

    console.log('================================');
    console.log('✅ CONEXIÓN EXITOSA');
    console.log('================================');
    console.log('\n📝 SIGUIENTE PASO:');
    console.log('Ejecuta el script SQL para crear las tablas:\n');
    console.log('sqlcmd -S 192.168.100.10,52534 -U splitty_user -P SplittyPass123! -d splitty -i schema.sql');

    await db.destroy();
    process.exit(0);

  } catch (error: any) {
    console.log('\n================================');
    console.log('❌ ERROR');
    console.log('================================\n');
    console.error('Tipo:', error.constructor.name);
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);

    await db.destroy();
    process.exit(1);
  }
}

console.log('🚀 Iniciando script...\n');
testConnection();