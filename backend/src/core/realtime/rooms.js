function toUserRoom(userId) {
  return `user:${userId}`;
}

function toRoleRoom(role) {
  return `role:${role}`;
}

function toTeamRoom(teamId) {
  return `team:${teamId}`;
}

export {
  toUserRoom,
  toRoleRoom,
  toTeamRoom,
};
