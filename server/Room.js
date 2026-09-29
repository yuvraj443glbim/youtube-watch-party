// Room.js - all room logic lives here (OOP): Participant + Room classes.
const ROLES = { HOST: 'host', MODERATOR: 'moderator', PARTICIPANT: 'participant' };
const CONTROL_ROLES = [ROLES.HOST, ROLES.MODERATOR];
const ACTIONS = ['play', 'pause', 'seek', 'change_video'];
const DEFAULT_VIDEO = 'M7lc1UVf-VE';

class Participant {
  constructor(id, username, role) {
    this.id = id;
    this.username = username;
    this.role = role;
  }
  get canControl() {
    return CONTROL_ROLES.includes(this.role);
  }
  toJSON() {
    return { userId: this.id, username: this.username, role: this.role };
  }
}

class Room {
  constructor(id) {
    this.id = id;
    this.participants = new Map();
    this.requests = []; // pending change requests from participants
    this.nextRequestId = 1;
    this.state = { videoId: DEFAULT_VIDEO, playState: 'paused', currentTime: 0, updatedAt: Date.now() };
  }

  get isEmpty() {
    return this.participants.size === 0;
  }

  addParticipant(id, username) {
    // first person in the room is the Host, everyone else is a Participant
    const role = this.isEmpty ? ROLES.HOST : ROLES.PARTICIPANT;
    const p = new Participant(id, username, role);
    this.participants.set(id, p);
    return p;
  }

  removeParticipant(id) {
    const p = this.participants.get(id);
    if (!p) return null;
    this.participants.delete(id);
    this.requests = this.requests.filter((r) => r.userId !== id);
    let newHost = null;
    if (p.role === ROLES.HOST && !this.isEmpty) {
      // host left: promote a moderator first, otherwise the oldest participant
      const all = [...this.participants.values()];
      newHost = all.find((x) => x.role === ROLES.MODERATOR) || all[0];
      newHost.role = ROLES.HOST;
    }
    return { removed: p, newHost };
  }

  list() {
    return [...this.participants.values()].map((p) => p.toJSON());
  }

  // current video state; if playing, time keeps moving so we add elapsed time
  currentState() {
    const s = this.state;
    const elapsed = s.playState === 'playing' ? (Date.now() - s.updatedAt) / 1000 : 0;
    return { videoId: s.videoId, playState: s.playState, currentTime: s.currentTime + elapsed };
  }

  applyAction(action, payload = {}) {
    const now = this.currentState();
    let time = Number(payload.time);
    if (!Number.isFinite(time) || time < 0) time = now.currentTime;
    const stamp = Date.now();
    switch (action) {
      case 'play':
        this.state = { videoId: now.videoId, playState: 'playing', currentTime: time, updatedAt: stamp };
        return true;
      case 'pause':
        this.state = { videoId: now.videoId, playState: 'paused', currentTime: time, updatedAt: stamp };
        return true;
      case 'seek':
        this.state = { videoId: now.videoId, playState: now.playState, currentTime: time, updatedAt: stamp };
        return true;
      case 'change_video':
        if (!/^[\w-]{11}$/.test(payload.videoId || '')) return false;
        this.state = { videoId: payload.videoId, playState: 'playing', currentTime: 0, updatedAt: stamp };
        return true;
      default:
        return false;
    }
  }

  addRequest(user, action, payload) {
    if (this.requests.length >= 20) return null;
    const req = { id: this.nextRequestId++, userId: user.id, username: user.username, action, payload };
    this.requests.push(req);
    return req;
  }

  takeRequest(id) {
    const i = this.requests.findIndex((r) => r.id === id);
    return i === -1 ? null : this.requests.splice(i, 1)[0];
  }

  assignRole(targetId, role) {
    this.participants.get(targetId).role = role;
  }

  transferHost(fromId, toId) {
    this.participants.get(fromId).role = ROLES.MODERATOR;
    this.participants.get(toId).role = ROLES.HOST;
  }
}

module.exports = { Room, Participant, ROLES, ACTIONS };
