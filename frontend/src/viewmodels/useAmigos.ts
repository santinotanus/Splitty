import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

export interface Friend {
    id: string;
    name: string;            // lo que usa el front
    groupsInCommon: number;
    online: boolean;
}

function mapRawToFriend(item: any): Friend {
    return {
        id: String(item.id ?? item.idAmigo ?? item.friendId ?? ''),
        name: item.name || item.nombre || 'Sin nombre',
        groupsInCommon: item.groupsInCommon ?? item.gruposEnComun ?? 0,
        online: Boolean(item.online ?? item.estaOnline ?? false),
    };
}

export function useAmigos() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await api.get('/amigos');
            const raw = res.data || [];
            const mapped: Friend[] = (raw as any[]).map(mapRawToFriend);

            setFriends(mapped);
        } catch (err) {
            console.error('Error cargando amigos', err);
            setError('Error cargando amigos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    // 👇 OJO: esto ya NO toca ni `loading` ni `error` global
    const addFriend = useCallback(
        async (friendId: string) => {
            try {
                const res = await api.post('/amigos', { friendId });
                const data = res.data;

                if (Array.isArray(data)) {
                    // si el back devuelve la lista entera
                    const mapped = data.map(mapRawToFriend);
                    setFriends(mapped);
                } else if (data) {
                    // si devuelve solo el amigo nuevo
                    const nuevo = mapRawToFriend(data);
                    setFriends(prev => {
                        const exists = prev.some(f => f.id === nuevo.id);
                        return exists ? prev : [...prev, nuevo];
                    });
                } else {
                    // si no devuelve nada útil, recargo
                    await fetchFriends();
                }
            } catch (err) {
                console.error('Error agregando amigo', err);
                // No setError acá para NO romper toda la pantalla
                throw err; // se maneja en la screen con Alert
            }
        },
        [fetchFriends]
    );

    return { friends, loading, error, refresh: fetchFriends, addFriend };
}
