const initials = (name) => name.trim().slice(0, 2).toUpperCase();

// List of everyone in the room. Only the host sees the management buttons.
export default function PeoplePanel({ participants, myId, isHost, send }) {
  return (
    <div className="card">
      <h2>
        People <span className="count">{participants.length}</span>
      </h2>
      <ul className="people">
        {participants.map((p) => (
          <li key={p.userId}>
            <div className="person">
              <span className="avatar">{initials(p.username)}</span>
              <span className="name">
                {p.username}
                {p.userId === myId && <em> (you)</em>}
              </span>
              <span className={`badge ${p.role}`}>{p.role}</span>
            </div>
            {isHost && p.userId !== myId && (
              <div className="actions">
                <select value={p.role} onChange={(e) => send('assign_role', { userId: p.userId, role: e.target.value })}>
                  <option value="participant">participant</option>
                  <option value="moderator">moderator</option>
                </select>
                <button className="sm" onClick={() => send('transfer_host', { userId: p.userId })}>
                  Make host
                </button>
                <button className="sm danger" onClick={() => send('remove_participant', { userId: p.userId })}>
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
