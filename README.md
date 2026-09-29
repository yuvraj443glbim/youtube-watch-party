# YouTube Watch Party

Watch YouTube together in real time. One room, one shared video state (play, pause, seek, current video), with role-based control.

**Live demo:** _add your Render URL here after deploying_

## Features
- Create a room or join with a 6-letter code or invite link
- Real-time sync of play / pause / seek / change video (WebSockets via Socket.IO)
- Roles: **Host** (room creator), **Moderator**, **Participant**
- Host can assign roles, remove participants and transfer the host role
- Participants can **request** a change; the host or a moderator approves or rejects it
- Participant list with roles, live updates
- Bonus: chat, automatic new host if the host leaves

## Tech stack
- Frontend: React + Vite, YouTube IFrame API
- Backend: Node.js + Express + Socket.IO
- Storage: in memory (rooms disappear when the server restarts or the room is empty)

## Run locally
Requires Node 18+.

```bash
npm install
npm install --prefix client
# terminal 1
npm run dev:server        # http://localhost:3000 (WebSocket server)
# terminal 2
npm run dev:client        # http://localhost:5173 (open this one)
```

Open the page in two browser windows (one normal, one private) to test.

Production-style run:
```bash
npm install && npm run build && npm start   # http://localhost:3000
```

## Deploy on Render
1. Push this folder to GitHub.
2. Render > New > Web Service > pick the repo.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Deploy, then paste the URL at the top of this README.

(`render.yaml` already has these settings.) Render's free tier sleeps after inactivity, so the first load can take about 30 seconds.

## Architecture
```
Browser (React + YouTube player)  <== Socket.IO (WebSocket) ==>  Express + Socket.IO server
                                                                   |- MessageHandler (one per socket)
                                                                   '- Room / Participant (in-memory state)
```
1. A user creates or joins a room. The server puts the socket in a Socket.IO room and returns the current state, so late joiners start at the right moment.
2. Host/Moderator actions (`play`, `pause`, `seek`, `change_video`) go to the server. The server **checks the role first**, updates the Room state, then broadcasts `sync_state` to everyone in the room.
3. Every client applies `sync_state` to its YouTube player. A "remote" flag stops the player from re-sending events caused by a remote update.
4. Participants send `request_change`. It is stored as a pending request and shown to the host/moderators, who send `resolve_request` (approve or reject). Only on approval does the server apply it.
5. Role events (`assign_role`, `remove_participant`, `transfer_host`) are host-only on the server. The server broadcasts the updated participant list.

## Files
- `server/Room.js` - `Room` and `Participant` classes: state, roles, requests
- `server/MessageHandler.js` - every socket event, with permission checks
- `server/index.js` - Express + Socket.IO setup, serves the built client
- `client/src/App.jsx` - screens and UI, socket listeners
- `client/src/Player.jsx` - YouTube player and sync logic

## Socket events
| Event | Direction | Who can send |
|---|---|---|
| create_room / join_room | client to server | anyone |
| play, pause, seek, change_video | client to server | host, moderator |
| request_change, chat_message | client to server | anyone in the room |
| resolve_request | client to server | host, moderator |
| assign_role, remove_participant, transfer_host | client to server | host |
| sync_state, user_joined, user_left, role_assigned, participant_removed, requests_updated | server to clients | server |

## Known limits
- State is in memory, so it runs on a single server instance. To scale, add the Socket.IO Redis adapter.
- No login; a user is identified by their socket connection (refreshing the page rejoins as a new participant).
