// 🔥 Firebase Admin SDK Configuration
import admin from 'firebase-admin';
import 'dotenv/config';
import * as path from 'path';

let serviceAccount: admin.ServiceAccount | undefined;
const FIREBASE_ADMIN_JSON = process.env.FIREBASE_ADMIN_JSON;

// 1. Priorizar la carga desde la VARIABLE DE ENTORNO (Producción/Railway)
if (FIREBASE_ADMIN_JSON) {
  try {
    // Railway guarda el JSON como una cadena de texto. Debemos parsearla.
    serviceAccount = JSON.parse(FIREBASE_ADMIN_JSON);
    console.log('✅ Credenciales de Firebase cargadas desde la variable de entorno.');
  } catch (error) {
    console.error('❌ Error al parsear la variable FIREBASE_ADMIN_JSON. Verifique el formato JSON:', error);
    process.exit(1);
  }
}
// 2. Usar archivo local como fallback (Desarrollo)
else {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  try {
    // Intentar cargar el archivo localmente (solo funciona en desarrollo)
    serviceAccount = require(serviceAccountPath);
    console.log('✅ Credenciales de Firebase cargadas desde el archivo local (Desarrollo).');
  } catch (error) {
    console.warn('⚠️ ADVERTENCIA: serviceAccountKey.json no encontrado. Asegúrese de que la variable FIREBASE_ADMIN_JSON esté configurada en producción.');
    // En un entorno de producción sin la variable, esto causará el error más adelante.
  }
}

// 3. Inicializar el SDK si se encontró la cuenta de servicio
try {
  if (!serviceAccount) {
    throw new Error("No se pudo obtener la Service Account Key de Firebase.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'splitty-102b4',
    databaseURL: `https://splitty-102b4.firebaseio.com`,
    storageBucket: 'splitty-102b4.appspot.com'
  });

  console.log('✅ Firebase Admin SDK inicializado correctamente');

  const db = admin.firestore();
  console.log('✅ Firestore inicializado correctamente');

} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin SDK:', error);
  process.exit(1);
}

export const firebaseAdmin = admin;
export const auth = admin.auth();
export const db = admin.firestore();