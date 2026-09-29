import { useEffect, useRef, useState } from 'react';
import { socket } from './socket';
import Player from './Player';
import Home from './components/Home';
import RoomHeader from './components/RoomHeader';
import VideoControls from './components/VideoControls';
import PeoplePanel from './components/PeoplePanel';
import RequestPanel from './components/RequestPanel';
import Chat from './components/Chat';

// App owns all the state and the socket listeners.
// The smaller components only display things and call send().
export default function App() {
  const [session, setSession] = useState(null); // { roomId, userId }
  const [participants, setParticipants] = useState([]);
  const [state, setState] = useState(null);
  const [requests, setRequests] = useState([]);
  const [chat, setChat] = useState([]);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const toastTimer = useRef(null);

  const flash = (t) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };
  const send = (event, data) => socket.emit(event, data);

  const resetLocal = () => {
    setSession(null);
    setState(null);
    setParticipants([]);
    setRequests([]);
    setChat([]);
  };

  useEffect(() => {
    const setList = (d) => setParticipants(d.participants);
    const handlers = {
      sync_state: (s) => setState(s),
      user_joined: (d) => {
        setList(d);
        flash(`${d.username} joined`);
      },
      user_left: (d) => {
        setList(d);
        flash(`${d.username} left`);
      },
      role_assigned: setList,
      participant_removed: setList,
      requests_updated: (d) => setRequests(d.requests),
      chat_message: (m) => setChat((c) => [...c.slice(-99), m]),
      notice: flash,
      error_message: flash,
      removed: () => {
        resetLocal();
        setError('You were removed from the room by the host.');
      },
    };
    Object.entries(handlers).forEach(([e, fn]) => socket.on(e, fn));
    return () => Object.entries(handlers).forEach(([e, fn]) => socket.off(e, fn));
  }, []);

  const enter = (event, data) => {
    setError('');
    socket.emit(event, data, (res) => {
      if (!res.ok) return setError(res.error);
      setSession({ roomId: res.roomId, userId: res.userId });
      setParticipants(res.participants);
      setState(res.state);
      setRequests(res.requests);
    });
  };

  const leave = () => {
    send('leave_room');
    resetLocal();
  };

  if (!session || !state) return <Home onEnter={enter} error={error} />;

  const me = participants.find((p) => p.userId === session.userId);
  const role = me ? me.role : 'participant';
  const isHost = role === 'host';
  const canControl = isHost || role === 'moderator';
  const shareLink = `${window.location.origin}/?room=${session.roomId}`;
  const copyLink = () => navigator.clipboard.writeText(shareLink).then(() => flash('Invite link copied'));

  return (
    <div className="room">
      <RoomHeader roomId={session.roomId} role={role} onCopy={copyLink} onLeave={leave} />

      <div className="layout">
        <section className="stage">
          <Player state={state} canControl={canControl} myId={session.userId} send={send} />
          <VideoControls canControl={canControl} send={send} flash={flash} />
        </section>

        <aside>
          <PeoplePanel participants={participants} myId={session.userId} isHost={isHost} send={send} />
          <RequestPanel requests={requests} canControl={canControl} myId={session.userId} send={send} />
          <Chat chat={chat} myId={session.userId} send={send} />
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
