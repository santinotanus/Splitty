import * as groupsApi from '../api/groups';

export function useUnirseGrupo() {
  const joinByInvite = async (groupId: string, inviteId: string) => {
    return groupsApi.joinByInvite(groupId, inviteId);
  };

  const joinGroup = async (grupoId: string) => {
    return groupsApi.joinGroup(grupoId);
  };

  return { joinByInvite, joinGroup };
}