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
    // Forzar la conversión a `string` para evitar que objetos o valores
    // inesperados queden expuestos a la app (causa frecuente de errores).
    BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL ? String(process.env.EXPO_PUBLIC_BACKEND_URL) : (process.env.BACKEND_URL ? String(process.env.BACKEND_URL) : null),
    // Cloudinary unsigned upload settings (no secret here).
    // Asegúrate de exportar estas variables como strings antes de arrancar Expo.
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? String(process.env.CLOUDINARY_CLOUD_NAME) : null,
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET ? String(process.env.CLOUDINARY_UPLOAD_PRESET) : null,
  },
});
