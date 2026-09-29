import { useEffect, useRef, useState } from 'react';

// Simple room chat. Your own messages sit on the right.
export default function Chat({ chat, myId, send }) {
  const [msg, setMsg] = useState('');
  const end = useRef(null);

  useEffect(() => {
    end.current && end.current.scrollIntoView({ block: 'nearest' });
  }, [chat]);

  return (
    <div className="card chat">
      <h2>Chat</h2>
      <div className="messages">
        {chat.length === 0 && <p className="hint">No messages yet. Say hi!</p>}
        {chat.map((m, i) => (
          <div key={i} className={`bubble ${m.userId === myId ? 'mine' : ''}`}>
            {m.userId !== myId && <b>{m.username}</b>}
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          send('chat_message', { text: msg });
          setMsg('');
        }}
      >
        <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Say something" maxLength={300} />
        <button className="primary" disabled={!msg.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
