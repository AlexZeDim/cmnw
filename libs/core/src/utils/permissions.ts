import { ChannelCreationOverwrites, RoleResolvable, UserResolvable } from 'discord.js';
import { DISCORD_TEXT_READ_ONLY, DISCORD_TEXT_WRITE_ONLY } from '@app/core/constants';

export const permissionManager = (
  id: RoleResolvable | UserResolvable,
  permission: 'read' | 'write' = 'read'
): ChannelCreationOverwrites => {
  const permissionsManager = { id };
  if (permission === 'write') {
    Object.assign(permissionsManager, DISCORD_TEXT_WRITE_ONLY);
    return permissionsManager;
  }
  Object.assign(permissionsManager, DISCORD_TEXT_READ_ONLY);
  return permissionsManager;
};
