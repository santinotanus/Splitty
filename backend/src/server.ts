import app from './app';

const port = Number(process.env.PORT || 3000);

app.listen(port, '0.0.0.0', () => {
  console.log('================================');
  console.log('🚀 Server running on:');
  console.log(`   Local:    http://localhost:${port}`);
  console.log(`   Network:  http://192.168.1.34:${port}`);
  console.log('================================');
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /health');
  console.log('   POST /auth/sync-user');
  console.log('================================');
});