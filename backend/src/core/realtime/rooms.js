function toUserRoom(userId) {
  return `user:${userId}`;
}

function toRoleRoom(role) {
  return `role:${role}`;
}

function toTeamRoom(teamId) {
  return `team:${teamId}`;
}

module.exports = {
  toUserRoom,
  toRoleRoom,
  toTeamRoom,
};
