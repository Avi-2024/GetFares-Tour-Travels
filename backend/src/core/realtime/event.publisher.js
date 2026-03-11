const { randomUUID } = require('node:crypto');
const { toUserRoom, toRoleRoom, toTeamRoom } = require('./rooms');

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

function createSocketEventPublisher({ logger }) {
  let socketServer = null;

  function attachSocketServer(server) {
    socketServer = server;
    logger.info('Socket event publisher attached to Socket.IO server');
  }

  function hasSocketServer() {
    return Boolean(socketServer);
  }

  function resolveRooms(recipients = {}) {
    const rooms = [];

    uniqueIds(recipients.userIds).forEach((userId) => rooms.push(toUserRoom(userId)));
    uniqueIds(recipients.roles).forEach((role) => rooms.push(toRoleRoom(role)));
    uniqueIds(recipients.teamIds).forEach((teamId) => rooms.push(toTeamRoom(teamId)));

    return [...new Set(rooms)];
  }

  async function publish(event = {}) {
    const envelope = {
      id: event.id || randomUUID(),
      eventName: event.eventName || 'notification.event',
      title: event.title || null,
      message: event.message || null,
      entityType: event.entityType || null,
      entityId: event.entityId || null,
      payload: event.payload || {},
      createdAt: new Date().toISOString(),
    };

    if (!socketServer) {
      return {
        envelope,
        delivered: false,
        attempts: 0,
        successful: 0,
        results: [],
        error: 'SOCKET_SERVER_NOT_ATTACHED',
      };
    }

    const rooms = resolveRooms(event.recipients || {});
    const deliveryOptions = {
      ackRequired: event.ackRequired === true,
      timeoutMs: event.timeoutMs,
    };

    if (!rooms.length) {
      const broadcastResult = await socketServer.emitBroadcast('notification', envelope, deliveryOptions);
      return {
        envelope,
        delivered: broadcastResult.delivered,
        attempts: 1,
        successful: broadcastResult.delivered ? 1 : 0,
        results: [broadcastResult],
        error: broadcastResult.error,
      };
    }

    const results = [];
    for (const room of rooms) {
      const result = await socketServer.emitToRoom(room, 'notification', envelope, deliveryOptions);
      results.push(result);
    }

    const successful = results.filter((result) => result.delivered).length;
    const overallError = successful > 0 ? null : results[0]?.error || 'DELIVERY_FAILED';

    return {
      envelope,
      delivered: successful > 0,
      attempts: results.length,
      successful,
      results,
      error: overallError,
    };
  }

  return Object.freeze({
    attachSocketServer,
    hasSocketServer,
    publish,
  });
}

module.exports = { createSocketEventPublisher };
