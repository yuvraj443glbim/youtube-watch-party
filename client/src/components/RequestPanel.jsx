import { fmt } from '../utils';

const describe = (r) => {
  if (r.action === 'seek') return `seek to ${fmt(r.payload.time)}`;
  if (r.action === 'change_video') return `change the video (${r.payload.videoId})`;
  return r.action;
};

// Pending requests from participants. Host/moderators can approve or reject.
export default function RequestPanel({ requests, canControl, myId, send }) {
  if (requests.length === 0) return null;
  return (
    <div className="card requests">
      <h2>
        Requests <span className="count">{requests.length}</span>
      </h2>
      <ul className="people">
        {requests.map((r) => (
          <li key={r.id} className="request">
            <span>
              <b>{r.username}</b> wants to {describe(r)}
            </span>
            {canControl ? (
              <div className="actions">
                <button className="sm primary" onClick={() => send('resolve_request', { requestId: r.id, approve: true })}>
                  Approve
                </button>
                <button className="sm" onClick={() => send('resolve_request', { requestId: r.id, approve: false })}>
                  Reject
                </button>
              </div>
            ) : (
              r.userId === myId && <span className="pending">waiting for approval</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
