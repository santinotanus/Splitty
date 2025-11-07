// 🔥 Firebase Admin SDK Configuration
import admin from 'firebase-admin';
import 'dotenv/config';
import * as path from 'path';

// Cargar el Service Account Key desde el archivo JSON
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'splitty-102b4'
  });

  console.log('✅ Firebase Admin SDK inicializado correctamente');
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin SDK:', error);
  process.exit(1);
}

export const firebaseAdmin = admin;
export const auth = admin.auth();