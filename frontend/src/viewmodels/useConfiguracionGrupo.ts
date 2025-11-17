import { useEffect, useState, useCallback } from 'react';
import * as groupsApi from '../api/groups';
import * as balancesApi from '../api/balances';
import { getCurrentUser } from '../api/client';

export function useConfiguracionGrupo(grupoId?: string) {
  const [loading, setLoading] = useState(false);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [grupoInfo, setGrupoInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchGroupData = useCallback(async () => {
    if (!grupoId) return;

    setLoading(true);
    try {
      // Obtener usuario actual
      const user = await getCurrentUser();
      setCurrentUserId(user?.id);

      // Obtener miembros
      const membersRes = await groupsApi.getGroupMembers(grupoId);
      const membersList = Array.isArray(membersRes) ? membersRes : [];
      setMiembros(membersList);

      // Obtener estadísticas del grupo
      try {
        const summary = await balancesApi.getGroupSummary(grupoId);
        setGrupoInfo({
          totalGastado: summary?.total || 0,
          porUsuario: summary?.porUsuario || [],
        });
      } catch (e) {
        console.warn('No se pudieron obtener estadísticas', e);
      }

    } catch (error) {
      console.error('Error cargando datos del grupo', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [grupoId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const updateGroup = async (data: { nombre?: string; descripcion?: string }) => {
    if (!grupoId) throw new Error('No group ID');
    await groupsApi.updateGroup(grupoId, data);
    await fetchGroupData();
  };

  const removeMember = async (usuarioId: string) => {
    if (!grupoId) throw new Error('No group ID');
    await groupsApi.removeGroupMember(grupoId, usuarioId);
    await fetchGroupData();
  };

  const updateMemberRole = async (usuarioId: string, rol: string) => {
    if (!grupoId) throw new Error('No group ID');
    await groupsApi.updateMemberRole(grupoId, usuarioId, rol);
    await fetchGroupData();
  };

  const leaveGroup = async () => {
    if (!grupoId) throw new Error('No group ID');
    await groupsApi.leaveGroup(grupoId);
  };

  const deleteGroup = async () => {
    if (!grupoId) throw new Error('No group ID');
    await groupsApi.deleteGroup(grupoId);
  };

  return {
    loading,
    miembros,
    grupoInfo,
    currentUserId,
    refresh: fetchGroupData,
    updateGroup,
    removeMember,
    updateMemberRole,
    leaveGroup,
    deleteGroup,
  };
}