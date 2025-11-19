import { useEffect, useState, useCallback } from 'react';
import { getFriends, inviteByEmail as apiInviteByEmail, getPendingReceived, acceptRequest as apiAcceptRequest, rejectRequest as apiRejectRequest, deleteFriend as apiDeleteFriend} from '../api/friends';
import { sendFriendRequest } from '../api/friends';
import * as groupsApi from '../api/groups';

export interface Friend {
    id: string;
    name: string;            // lo que usa el front
    foto_url?: string | null; // 🔥 FIX: Faltaba la foto en la interfaz
    groupsInCommon: number;
    groupsNames?: string[];
    online: boolean;
}

function mapRawToFriend(item: any): Friend {
    return {
        id: String(item.id ?? item.idAmigo ?? item.friendId ?? ''),
        name: item.name || item.nombre || 'Sin nombre',
        foto_url: item.foto_url || null, // 🔥 FIX: Faltaba copiar la foto
        groupsInCommon: item.groupsInCommon ?? item.gruposEnComun ?? 0,
        online: Boolean(item.online ?? item.estaOnline ?? false),
    };
}

export function useAmigos() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [pendingLoading, setPendingLoading] = useState<boolean>(true);

    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const raw = await getFriends(); // Esto ya viene mapeado de api/friends.ts
            const mapped: Friend[] = (raw as any[]).map(mapRawToFriend); // Este es el mapeo final

            // Compute groups in common by fetching my groups and their members
            try {
                const myGroups = await groupsApi.getMyGroups();
                const groupsArr: any[] = Array.isArray(myGroups) ? myGroups : [];

                // Build map groupId -> memberIds
                const groupMembersMap: Record<string, Set<string>> = {};
                for (const g of groupsArr) {
                    try {
                        const members = await groupsApi.getGroupMembers(g.id);
                        const memberIds = (Array.isArray(members) ? members : []).map((m: any) => String(m.id));
                        groupMembersMap[g.id] = new Set(memberIds);
                    } catch (e) {
                        groupMembersMap[g.id] = new Set();
                    }
                }

                const enriched = mapped.map((f) => {
                    const commonGroups: string[] = [];
                    for (const g of groupsArr) {
                        const memberSet = groupMembersMap[g.id] || new Set();
                        if (memberSet.has(String(f.id))) {
                            commonGroups.push(g.nombre || g.name || 'Grupo');
                        }
                    }
                    return { ...f, groupsInCommon: commonGroups.length, groupsNames: commonGroups };
                });

                setFriends(enriched);
                return enriched;
            } catch (e) {
                // If groups fetch fails, fall back to raw mapped
                setFriends(mapped);
                return mapped;
            }
        } catch (err) {
            console.error('Error cargando amigos', err);
            setError('Error cargando amigos');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const removeFriend = useCallback(async (amigoId: string) => {
            try {
                await apiDeleteFriend(amigoId);
                // Recargar la lista para que desaparezca de la UI
                await fetchFriends();
            } catch (err) {
                console.error('Error eliminando amigo', err);
                throw err;
            }
        }, [fetchFriends]);

    const fetchPending = useCallback(async () => {
        try {
            setPendingLoading(true);
            const rows = await getPendingReceived(); // api/friends.ts ya mapea esto
                const normalized = (rows || []).map((r: any) => ({
                    id: r.solicitudId || r.solicitud_id || r.id,
                    solicitanteId: r.solicitanteId || r.solicitante_id || r.fromId,
                    solicitanteNombre: r.solicitanteNombre || r.solicitante_nombre || r.solicitanteNombre || r.solicitante_nombre || r.nombre || r.fromName,
                    solicitanteCorreo: r.solicitanteCorreo || r.solicitante_correo || r.correo || r.fromEmail,
                    // 🔥 FIX: Faltaba copiar la foto de la solicitud
                    solicitanteFotoUrl: r.solicitanteFotoUrl || null,
                    fecha: r.fecha || r.createdAt || r.created_at,
                }));
                setPendingRequests(normalized);
        } catch (err) {
            console.error('Error cargando solicitudes pendientes', err);
        } finally {
            setPendingLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    // addFriend ahora usa el API helper `sendFriendRequest` (POST /amigos/solicitudes)
    // Este método lanza si hay error (por ejemplo ALREADY_FRIENDS, PENDING_REQUEST_EXISTS)
    const addFriend = useCallback(
        async (friendId: string) => {
            try {
                const data = await sendFriendRequest(friendId);

                // Si el backend devuelve el amigo nuevo o lista, mejor refrescar
                await fetchFriends();
                return data;
            } catch (err) {
                console.error('Error agregando amigo', err);
                throw err;
            }
        },
        [fetchFriends]
    );

    const inviteByEmail = useCallback(async (email: string) => {
        // Delegar en la API frontend: buscar por email y crear solicitud
        try {
            const result = await apiInviteByEmail(email);
            // refrescar la lista de amigos (si aplica)
            await fetchFriends();
            return result;
        } catch (err) {
            console.error('Error invitando por email', err);
            throw err;
        }
    }, [fetchFriends]);

    const refreshAll = useCallback(async () => {
            // Ejecutamos ambas cargas y retornamos la lista de amigos actualizada
            const friendsResult = await fetchFriends();
            await fetchPending();
            return friendsResult;
        }, [fetchFriends, fetchPending]);

    const acceptPending = useCallback(async (solicitudId: string) => {
        try {
            await apiAcceptRequest(solicitudId);
            // refresh both lists
            await fetchPending();
            await fetchFriends();
        } catch (err) {
            console.error('Error aceptando solicitud', err);
            throw err;
        }
    }, [fetchFriends, fetchPending]);

    const rejectPending = useCallback(async (solicitudId: string) => {
        try {
            await apiRejectRequest(solicitudId);
            await fetchPending();
        } catch (err) {
            console.error('Error rechazando solicitud', err);
            throw err;
        }
    }, [fetchPending]);

    return { friends, loading, error, refresh: refreshAll, addFriend, inviteByEmail, pendingRequests, pendingLoading, acceptPending, rejectPending, removeFriend};
}