import { useNetwork } from '../contexts/NetworkContext';
import { showInlineAlert } from '../components/InlineAlert';

export function useOfflineGuard() {
  const { isConnected, isInternetReachable } = useNetwork();
  const isOnline = Boolean(isConnected && isInternetReachable);

  const guardOnlineAction = (
    action: () => void | Promise<void>,
    message?: string
  ): boolean => {
    if (!isOnline) {
      showInlineAlert(message || 'Necesitas conexión a internet para esta acción');
      return false;
    }

    // Ejecutar la acción (no esperamos el resultado aquí)
    try {
      const res = action();
      if (res instanceof Promise) res.catch((e) => console.warn('Acción en línea falló:', e));
    } catch (e) {
      console.warn('Acción en línea falló:', e);
    }

    return true;
  };

  return {
    isOnline,
    guardOnlineAction,
  };
}
