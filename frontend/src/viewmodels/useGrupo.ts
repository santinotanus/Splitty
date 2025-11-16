import { useEffect, useState } from 'react';
import * as groupsApi from '../api/groups';
import * as balancesApi from '../api/balances';

export function useGrupo(grupoId?: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [groupTotal, setGroupTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMembers = async () => {
    if (!grupoId) return;
    setLoading(true);
    try {
      const res = await groupsApi.getGroupMembers(grupoId);
      const arr = Array.isArray(res) ? res : res?.members ?? [];
      // fetch richer group summary and merge
      try {
        const summary = await balancesApi.getGroupSummary(grupoId);
        const porUsuario = summary?.porUsuario ?? [];
        setGroupTotal(summary?.total ?? 0);
        const map: Record<string, any> = {};
        porUsuario.forEach((p: any) => { map[p.usuarioId] = p; });
        const merged = arr.map((m: any) => ({
          ...m,
          balance: (map[m.id]?.balance ?? 0),
          totalPagado: (map[m.id]?.totalPagado ?? 0),
          totalAdeudado: (map[m.id]?.totalAdeudado ?? 0)
        }));
        setMembers(merged);
      } catch (e) {
        // If balances/summary fail, set members without balances
        setMembers(arr);
      }
    } catch (e) {
      console.error('getGroupMembers error', e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [grupoId]);

  return { members, loading, refreshMembers: fetchMembers, groupTotal };
}

export type UseGrupoReturn = ReturnType<typeof useGrupo> & { groupTotal?: number };
