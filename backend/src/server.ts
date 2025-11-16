import app from './app';
import os from 'os';

const port = Number(process.env.PORT || 3000);

// Función para obtener la IP de red local
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
}

const localIP = "192.168.1.34"; //HARDCODEADO PARA IP ADRIEL!!!

app.listen(port, '0.0.0.0', () => {
  console.log('================================');
  console.log('🚀 Server running on:');
  console.log(`   Local:    http://localhost:${port}`);
  console.log(`   Network:  http://${localIP}:${port}`);
  console.log('================================');
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /health');
  console.log('   POST /auth/sync-user');
  console.log('================================');
  console.log(`💡 Usa esta IP en tu app móvil: http://${localIP}:${port}`);
});