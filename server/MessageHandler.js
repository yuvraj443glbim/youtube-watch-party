// MessageHandler.js - one instance per connected socket. Handles every event
// and checks permissions on the SERVER before doing anything.
const { Room, ROLES, ACTIONS } = require('./Room');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

class MessageHandler {
  constructor(io, rooms, socket) {
    this.io = io;
    this.rooms = rooms;
    this.socket = socket;
    this.roomId = null;
    this.bind();
  }

  bind() {
    const s = this.socket;
    s.on('create_room', (d, cb) => this.createRoom(d, cb));
    s.on('join_room', (d, cb) => this.joinRoom(d, cb));
    s.on('leave_room', () => this.leave());
    s.on('disconnect', () => this.leave());
    ACTIONS.forEach((a) => s.on(a, (d) => this.control(a, d)));
    s.on('request_change', (d) => this.requestChange(d));
    s.on('resolve_request', (d) => this.resolveRequest(d));
    s.on('assign_role', (d) => this.assignRole(d));
    s.on('remove_participant', (d) => this.removeParticipant(d));
    s.on('transfer_host', (d) => this.transferHost(d));
    s.on('chat_message', (d) => this.chat(d));
  }

  // ---------- helpers ----------
  get room() {
    return this.rooms.get(this.roomId);
  }
  get me() {
    return this.room && this.room.participants.get(this.socket.id);
  }
  error(msg) {
    this.socket.emit('error_message', msg);
  }
  notice(msg) {
    this.io.to(this.roomId).emit('notice', msg);
  }
  broadcastState(action) {
    this.io.to(this.roomId).emit('sync_state', { ...this.room.currentState(), action, by: this.socket.id });
  }
  broadcastRequests() {
    this.io.to(this.roomId).emit('requests_updated', { requests: this.room.requests });
  }
  // returns the target participant or sends an error
  target(userId) {
    const t = this.room.participants.get(userId);
    if (!t) this.error('That user is not in the room.');
    return t;
  }
  mustBeHost() {
    if (!this.me || this.me.role !== ROLES.HOST) {
      this.error('Only the host can do that.');
      return false;
    }
    return true;
  }

  // ---------- join / leave ----------
  createRoom(data, cb) {
    const roomId = makeCode(this.rooms);
    this.rooms.set(roomId, new Room(roomId));
    this.joinRoom({ ...data, roomId }, cb);
  }

  joinRoom(data = {}, cb) {
    const reply = typeof cb === 'function' ? cb : () => {};
    const username = String(data.username || '').trim().slice(0, 24);
    const roomId = String(data.roomId || '').trim().toUpperCase();
    if (!username) return reply({ ok: false, error: 'Enter a name first.' });
    const room = this.rooms.get(roomId);
    if (!room) return reply({ ok: false, error: 'Room not found. Check the code.' });

    this.leave(); // in case the socket was in another room
    this.roomId = roomId;
    this.socket.join(roomId);
    const p = room.addParticipant(this.socket.id, username);

    reply({
      ok: true,
      roomId,
      userId: p.id,
      participants: room.list(),
      state: room.currentState(),
      requests: room.requests,
    });
    this.socket.to(roomId).emit('user_joined', {
      username: p.username,
      userId: p.id,
      role: p.role,
      participants: room.list(),
    });
  }

  leave() {
    const room = this.room;
    if (!room) return;
    const roomId = this.roomId;
    const result = room.removeParticipant(this.socket.id);
    this.socket.leave(roomId);
    this.roomId = null;
    if (!result) return;
    if (room.isEmpty) {
      this.rooms.delete(roomId);
      return;
    }
    this.io.to(roomId).emit('user_left', {
      username: result.removed.username,
      userId: result.removed.id,
      participants: room.list(),
    });
    if (result.newHost) {
      this.io.to(roomId).emit('role_assigned', {
        userId: result.newHost.id,
        username: result.newHost.username,
        role: ROLES.HOST,
        participants: room.list(),
      });
      this.io.to(roomId).emit('notice', `${result.newHost.username} is the new host.`);
    }
    this.io.to(roomId).emit('requests_updated', { requests: room.requests });
  }

  // ---------- playback ----------
  control(action, data = {}) {
    if (!this.me) return;
    if (!this.me.canControl) return this.error('Only the host or a moderator can control the video.');
    if (!this.room.applyAction(action, data)) return this.error('Invalid video link.');
    this.broadcastState(action);
  }

  // participant asks; host/moderator approves or rejects
  requestChange(data = {}) {
    if (!this.me) return;
    const { action } = data;
    if (!ACTIONS.includes(action)) return;
    if (this.me.canControl) return this.control(action, data);
    const payload = { time: Number(data.time), videoId: data.videoId };
    if (action === 'change_video' && !/^[\w-]{11}$/.test(payload.videoId || '')) return this.error('Invalid video link.');
    const req = this.room.addRequest(this.me, action, payload);
    if (!req) return this.error('Too many pending requests.');
    this.broadcastRequests();
  }

  resolveRequest(data = {}) {
    if (!this.me) return;
    if (!this.me.canControl) return this.error('Only the host or a moderator can approve requests.');
    const req = this.room.takeRequest(Number(data.requestId));
    if (!req) return;
    if (data.approve) {
      this.room.applyAction(req.action, req.payload);
      this.broadcastState(req.action);
      this.notice(`${this.me.username} approved ${req.username}'s request.`);
    } else {
      this.notice(`${this.me.username} rejected ${req.username}'s request.`);
    }
    this.broadcastRequests();
  }

  // ---------- roles ----------
  assignRole(data = {}) {
    if (!this.mustBeHost()) return;
    const t = this.target(data.userId);
    if (!t) return;
    if (t.id === this.socket.id) return this.error('You are the host.');
    if (![ROLES.MODERATOR, ROLES.PARTICIPANT].includes(data.role)) return this.error('Invalid role.');
    this.room.assignRole(t.id, data.role);
    this.io.to(this.roomId).emit('role_assigned', {
      userId: t.id,
      username: t.username,
      role: t.role,
      participants: this.room.list(),
    });
  }

  removeParticipant(data = {}) {
    if (!this.mustBeHost()) return;
    const t = this.target(data.userId);
    if (!t) return;
    if (t.id === this.socket.id) return this.error('You cannot remove yourself.');
    const roomId = this.roomId;
    this.io.to(t.id).emit('removed');
    const targetSocket = this.io.sockets.sockets.get(t.id);
    if (targetSocket) targetSocket.leave(roomId);
    this.room.removeParticipant(t.id);
    this.io.to(roomId).emit('participant_removed', { userId: t.id, participants: this.room.list() });
    this.broadcastRequests();
  }

  transferHost(data = {}) {
    if (!this.mustBeHost()) return;
    const t = this.target(data.userId);
    if (!t || t.id === this.socket.id) return;
    this.room.transferHost(this.socket.id, t.id);
    this.io.to(this.roomId).emit('role_assigned', {
      userId: t.id,
      username: t.username,
      role: ROLES.HOST,
      participants: this.room.list(),
    });
    this.notice(`${t.username} is now the host.`);
  }

  // ---------- chat ----------
  chat(data = {}) {
    if (!this.me) return;
    const text = String(data.text || '').trim().slice(0, 300);
    if (!text) return;
    this.io.to(this.roomId).emit('chat_message', {
      userId: this.me.id,
      username: this.me.username,
      text,
      ts: Date.now(),
    });
  }
}

module.exports = { MessageHandler };
