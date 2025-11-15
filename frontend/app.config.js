import "dotenv/config";

export default ({ config }) => ({
  ...config,
  extra: {
    // Puedes cambiar esta IP por la de tu computadora
    // Para encontrarla: ipconfig (Windows) o ifconfig (Mac/Linux)
    // Asegúrate de que el dispositivo móvil y la computadora estén en la misma red WiFi
    BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
  },
});
