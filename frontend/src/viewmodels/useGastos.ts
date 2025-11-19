import { useEffect, useState } from 'react';
import { api, getCurrentUser } from '../api/client';
import { getMyGroupsOffline, getGroupExpensesOffline } from '../api/offlineApi';

interface EnrichedExpense extends Record<string, any> {
  groupId: string;
  groupName?: string;
  participantes?: Array<any>;
  owedAmount?: number;
}

export function useGastos() {
  const [data, setData] = useState<EnrichedExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get groups (with offline fallback)
        const gruposResult = await getMyGroupsOffline();
        const grupos: any[] = Array.isArray(gruposResult.data) ? gruposResult.data : [];
        setFromCache(Boolean(gruposResult.fromCache));

        let currentUser: any = null;
        try { currentUser = await getCurrentUser(); } catch (e) { /* ignore */ }

        const allEnriched: EnrichedExpense[] = [];

        for (const g of grupos) {
          let list: any[] = [];
          try {
            const expensesResult = await getGroupExpensesOffline(g.id);
            list = Array.isArray(expensesResult.data) ? expensesResult.data : [];
            if (expensesResult.fromCache) setFromCache(true);
          } catch (e) {
            console.warn('Error obteniendo gastos para grupo', g.id, e?.message || e);
            list = [];
          }

          for (const exp of list) {
            try {
              // Try to get full detail from server; if it fails we use the list item
              const detailRes = await api.get(`/groups/${g.id}/expenses/${exp.id}`);
              const detail = detailRes.data || exp;
              const enriched: EnrichedExpense = { ...detail, groupId: g.id, groupName: g.nombre };

              if (currentUser && currentUser.id) {
                const meId = currentUser.id;
                if (enriched.pagador_id === meId) {
                  const othersShare = (enriched.participantes || []).reduce((sum: number, p: any) => {
                    if (p.usuarioId === meId) return sum;
                    return sum + (p.parte_importe || 0);
                  }, 0);
                  enriched.owedAmount = othersShare;
                } else {
                  const mePart = (enriched.participantes || []).find((p: any) => p.usuarioId === meId);
                  enriched.owedAmount = mePart ? -Math.abs(mePart.parte_importe || 0) : 0;
                }
              }

              if (!currentUser || enriched.pagador_id === currentUser.id) {
                allEnriched.push(enriched);
              }
            } catch (e) {
              if (!currentUser || exp.pagador_id === currentUser.id) {
                allEnriched.push({ ...exp, groupId: g.id, groupName: g.nombre });
              }
            }
          }
        }

        if (mounted) setData(allEnriched || []);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();

    return () => { mounted = false; };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const gruposResult = await getMyGroupsOffline();
      const grupos: any[] = Array.isArray(gruposResult.data) ? gruposResult.data : [];
      if (gruposResult.fromCache) setFromCache(true);

      let currentUser: any = null;
      try { currentUser = await getCurrentUser(); } catch (e) { }

      const allEnriched: EnrichedExpense[] = [];
      for (const g of grupos) {
        let list: any[] = [];
        try {
          const expensesResult = await getGroupExpensesOffline(g.id);
          list = Array.isArray(expensesResult.data) ? expensesResult.data : [];
          if (expensesResult.fromCache) setFromCache(true);
        } catch (e) { list = []; }

        for (const exp of list) {
          try {
            const detailRes = await api.get(`/groups/${g.id}/expenses/${exp.id}`);
            const detail = detailRes.data || exp;
            const enriched: EnrichedExpense = { ...detail, groupId: g.id, groupName: g.nombre };

            if (currentUser && currentUser.id) {
              const meId = currentUser.id;
              if (enriched.pagador_id === meId) {
                const othersShare = (enriched.participantes || []).reduce((sum: number, p: any) => {
                  if (p.usuarioId === meId) return sum;
                  return sum + (p.parte_importe || 0);
                }, 0);
                enriched.owedAmount = othersShare;
              } else {
                const mePart = (enriched.participantes || []).find((p: any) => p.usuarioId === meId);
                enriched.owedAmount = mePart ? -Math.abs(mePart.parte_importe || 0) : 0;
              }
            }

            if (!currentUser || enriched.pagador_id === currentUser.id) {
              allEnriched.push(enriched);
            }
          } catch (e) {
            if (!currentUser || exp.pagador_id === currentUser.id) {
              allEnriched.push({ ...exp, groupId: g.id, groupName: g.nombre });
            }
          }
        }
      }

      setData(allEnriched || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh, fromCache };
}

