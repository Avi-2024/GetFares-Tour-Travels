const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { toUserRoom, toRoleRoom, toTeamRoom } = require('./rooms');

function toOrigins(corsOrigin) {
  if (!corsOrigin || corsOrigin === '*') {
    return true;
  }

  if (Array.isArray(corsOrigin)) {
    return corsOrigin;
  }

  return String(corsOrigin)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function extractAccessToken(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) {
    return authToken;
  }

  const authorizationHeader = socket.handshake?.headers?.authorization;
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function createSocketServer({ httpServer, logger, authConfig, corsOrigin }) {
  const io = new Server(httpServer, {
    cors: {
      origin: toOrigins(corsOrigin),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = extractAccessToken(socket);
    if (!token) {
      const error = new Error('Authentication required');
      error.data = { code: 'SOCKET_AUTH_REQUIRED' };
      return next(error);
    }

    try {
      const payload = jwt.verify(token, authConfig.jwtAccessSecret);
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        roleId: payload.roleId || null,
        teamId: payload.teamId || null,
      };
      return next();
    } catch (error) {
      const authError = new Error('Invalid access token');
      authError.data = { code: 'SOCKET_AUTH_INVALID' };
      return next(authError);
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user || {};
    const rooms = [];

    if (user.id) {
      const userRoom = toUserRoom(user.id);
      rooms.push(userRoom);
      socket.join(userRoom);
    }

    if (user.role) {
      const roleRoom = toRoleRoom(user.role);
      rooms.push(roleRoom);
      socket.join(roleRoom);
    }

    if (user.teamId) {
      const teamRoom = toTeamRoom(user.teamId);
      rooms.push(teamRoom);
      socket.join(teamRoom);
    }

    logger.info(
      {
        socketId: socket.id,
        userId: user.id,
        role: user.role,
        rooms,
      },
      'socket.connected',
    );

    socket.emit('socket.connected', {
      socketId: socket.id,
      userId: user.id,
      role: user.role,
      rooms,
      connectedAt: new Date().toISOString(),
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        {
          socketId: socket.id,
          userId: user.id,
          reason,
        },
        'socket.disconnected',
      );
    });
  });

  async function getRoomConnectionCount(room) {
    const sockets = await io.in(room).fetchSockets();
    return sockets.length;
  }

  async function emitToRoom(room, eventName, payload, options = {}) {
    const connectedCount = await getRoomConnectionCount(room);
    if (connectedCount === 0) {
      return {
        room,
        delivered: false,
        connectedCount,
        ackedCount: 0,
        error: 'NO_ACTIVE_SOCKET',
      };
    }

    if (!options.ackRequired) {
      io.to(room).emit(eventName, payload);
      return {
        room,
        delivered: true,
        connectedCount,
        ackedCount: 0,
        error: null,
      };
    }

    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 5000;

    return new Promise((resolve) => {
      io.to(room).timeout(timeoutMs).emit(eventName, payload, (error, responses = []) => {
        if (error) {
          return resolve({
            room,
            delivered: false,
            connectedCount,
            ackedCount: 0,
            error: error.message || 'ACK_TIMEOUT',
          });
        }

        return resolve({
          room,
          delivered: responses.length > 0,
          connectedCount,
          ackedCount: responses.length,
          error: null,
        });
      });
    });
  }

  async function emitBroadcast(eventName, payload, options = {}) {
    const connectedCount = (await io.fetchSockets()).length;
    if (connectedCount === 0) {
      return {
        room: '*',
        delivered: false,
        connectedCount,
        ackedCount: 0,
        error: 'NO_ACTIVE_SOCKET',
      };
    }

    if (!options.ackRequired) {
      io.emit(eventName, payload);
      return {
        room: '*',
        delivered: true,
        connectedCount,
        ackedCount: 0,
        error: null,
      };
    }

    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 5000;

    return new Promise((resolve) => {
      io.timeout(timeoutMs).emit(eventName, payload, (error, responses = []) => {
        if (error) {
          return resolve({
            room: '*',
            delivered: false,
            connectedCount,
            ackedCount: 0,
            error: error.message || 'ACK_TIMEOUT',
          });
        }

        return resolve({
          room: '*',
          delivered: responses.length > 0,
          connectedCount,
          ackedCount: responses.length,
          error: null,
        });
      });
    });
  }

  async function close() {
    await io.close();
  }

  return Object.freeze({
    io,
    emitToRoom,
    emitBroadcast,
    close,
  });
}

module.exports = { createSocketServer };
