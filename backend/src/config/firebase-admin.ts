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
    projectId: 'splitty-102b4',
    databaseURL: `https://splitty-102b4.firebaseio.com` // 🔥 NUEVO
  });

  console.log('✅ Firebase Admin SDK inicializado correctamente');

  // 🔥 NUEVO: Inicializar Firestore
  const db = admin.firestore();
  console.log('✅ Firestore inicializado correctamente');

} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin SDK:', error);
  process.exit(1);
}

export const firebaseAdmin = admin;
export const auth = admin.auth();
export const db = admin.firestore(); // 🔥 NUEVO: Exportar Firestore