// Top bar: brand, room code, your role, invite + leave buttons
export default function RoomHeader({ roomId, role, onCopy, onLeave }) {
  return (
    <header className="room-header">
      <div className="room-title">
        <span className="brand">
          Watch<span>Party</span>
        </span>
        <span className="room-code">Room {roomId}</span>
        <span className={`badge ${role}`}>{role}</span>
      </div>
      <div className="row">
        <button onClick={onCopy}>Copy invite link</button>
        <button className="danger" onClick={onLeave}>
          Leave
        </button>
      </div>
    </header>
  );
}
