import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBA-LCc-LBjbTuv2Uw3v4UpOm-yzIhtOWg",
  authDomain: "splitty-102b4.firebaseapp.com",
  projectId: "splitty-102b4",
  storageBucket: "splitty-102b4.firebasestorage.app",
  messagingSenderId: "616662074521",
  appId: "1:616662074521:web:c8dd41c8cf51fadc912408"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Configurar Auth con persistencia en AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { auth };
export default app;
