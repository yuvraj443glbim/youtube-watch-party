import { useState } from 'react';

// Landing screen: create a room or join one with a code
export default function Home({ onEnter, error }) {
  const params = new URLSearchParams(window.location.search);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState((params.get('room') || '').toUpperCase());
  const hasName = username.trim().length > 0;

  return (
    <main className="home">
      <div className="home-card">
        <h1 className="logo">
          Watch<span>Party</span>
        </h1>
        <p className="tagline">Watch YouTube together. Stay perfectly in sync.</p>

        <label className="field">
          Your name
          <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} placeholder="e.g. Aman" />
        </label>

        <button className="primary wide" disabled={!hasName} onClick={() => onEnter('create_room', { username })}>
          Create a room
        </button>

        <div className="divider">
          <span>or join a friend</span>
        </div>

        <div className="row">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Room code" maxLength={6} />
          <button disabled={!hasName || !code} onClick={() => onEnter('join_room', { username, roomId: code })}>
            Join room
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
