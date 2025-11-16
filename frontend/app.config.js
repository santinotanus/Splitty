import "dotenv/config";

// Expo reads `extra` from app.config.js and lo expone en runtime a través de
// `Constants.expoConfig.extra`. En algunos entornos usamos la variable
// `EXPO_PUBLIC_BACKEND_URL`, pero el proyecto actualmente define `BACKEND_URL`
// en `.env`. Aquí soportamos ambos para evitar que `BACKEND_URL` quede `undefined`.
export default ({ config }) => ({
  ...config,
  extra: {
    // Preferir la variable pensada para Expo (`EXPO_PUBLIC_BACKEND_URL`) pero
    // caer en `BACKEND_URL` si no existe.
    BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || null,
  },
});
