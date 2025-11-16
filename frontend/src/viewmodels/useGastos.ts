import { useEffect, useState } from 'react';
import { api, getCurrentUser } from '../api/client';

interface EnrichedExpense extends Record<string, any> {
  groupId: string;
  groupName?: string;
  participantes?: Array<any>;
  owedAmount?: number; // >0 means current user is owed this amount; <0 means current user owes this amount
}

/**
 * useGastos: obtiene los gastos del usuario.
 *
 * Nota: el backend actual expone gastos a nivel de grupo en
 * `/groups/:groupId/expenses`. Para mantener la pestaña "Gastos"
 * funcionando (que muestra todos los gastos del usuario), aquí
 * recuperamos los grupos del usuario y pedimos los gastos por grupo,
 * luego combinamos los resultados.
 */
export function useGastos() {
  const [data, setData] = useState<EnrichedExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // initial fetch
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const gruposRes = await api.get('/grupos');
        const grupos: any[] = gruposRes.data || [];
        console.log('useGastos: grupos obtenidos:', grupos.map(g => ({ id: g.id, nombre: g.nombre })));
        // get current user to compute who owes/who is owed
        let currentUser: any = null;
        try { currentUser = await getCurrentUser(); } catch (e) { console.warn('No current user available', e); }

        // For each group, fetch expenses list then fetch details for each expense
        const allEnriched: EnrichedExpense[] = [];

        for (const g of grupos) {
          let list: any[] = [];
          try {
            const res = await api.get(`/groups/${g.id}/expenses`);
            list = Array.isArray(res.data) ? res.data : [];
          } catch (e) {
            console.warn('Error obteniendo gastos para grupo', g.id, e?.message || e);
            list = [];
          }

          for (const exp of list) {
            try {
              const detailRes = await api.get(`/groups/${g.id}/expenses/${exp.id}`);
              const detail = detailRes.data || exp;
              const enriched: EnrichedExpense = { ...detail, groupId: g.id, groupName: g.nombre };

              // compute owedAmount relative to currentUser
              if (currentUser && currentUser.id) {
                const meId = currentUser.id;
                if (enriched.pagador_id === meId) {
                  // I'm payer -> others owe me sum of their parts (exclude my own share)
                  const othersShare = (enriched.participantes || []).reduce((sum: number, p: any) => {
                    if (p.usuarioId === meId) return sum;
                    return sum + (p.parte_importe || 0);
                  }, 0);
                  enriched.owedAmount = othersShare; // positive -> I'm owed
                } else {
                  // I'm participant -> I owe my part to the payer
                  const mePart = (enriched.participantes || []).find((p: any) => p.usuarioId === meId);
                  enriched.owedAmount = mePart ? -Math.abs(mePart.parte_importe || 0) : 0; // negative -> I owe
                }
              }

              // Only include expenses that the current user paid (personal expenses view)
              if (!currentUser || enriched.pagador_id === currentUser.id) {
                allEnriched.push(enriched);
              }
            } catch (e) {
              // If detail fetch fails, fall back to list item with group info
              if (!currentUser || exp.pagador_id === currentUser.id) {
                allEnriched.push({ ...exp, groupId: g.id, groupName: g.nombre });
              }
            }
          }
        }

        console.log('useGastos: gastos enriquecidos total:', allEnriched.length);
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

  // expose manual refresh function so screens can refresh on focus
  const refresh = async () => {
    setLoading(true);
    try {
      const gruposRes = await api.get('/grupos');
      const grupos: any[] = gruposRes.data || [];
      // refresh: replicate enrichment logic but slightly optimized
      let currentUser: any = null;
      try { currentUser = await getCurrentUser(); } catch (e) { }
      const allEnriched: EnrichedExpense[] = [];
      for (const g of grupos) {
        let list: any[] = [];
        try { const res = await api.get(`/groups/${g.id}/expenses`); list = Array.isArray(res.data) ? res.data : []; } catch (e) { list = []; }
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
              // Only include expenses that the current user paid (personal expenses view)
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

  return { data, loading, error, refresh };
}
