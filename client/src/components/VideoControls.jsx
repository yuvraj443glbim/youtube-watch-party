import { useState } from 'react';
import { videoIdFrom, parseTime } from '../utils';

// Under the player. Host/moderator: change video directly.
// Participant: send requests that a host/moderator must approve.
export default function VideoControls({ canControl, send, flash }) {
  const [link, setLink] = useState('');
  const [seekText, setSeekText] = useState('');

  const submitVideo = (asRequest) => {
    const videoId = videoIdFrom(link);
    if (!videoId) return flash('That is not a valid YouTube link.');
    send(asRequest ? 'request_change' : 'change_video', { action: 'change_video', videoId });
    setLink('');
  };
  const submitSeek = () => {
    const time = parseTime(seekText);
    if (time === null) return flash('Use seconds (90) or minutes:seconds (1:30).');
    send('request_change', { action: 'seek', time });
    setSeekText('');
  };

  if (canControl) {
    return (
      <div className="card">
        <h2>Change video</h2>
        <div className="row">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube link" />
          <button className="primary" disabled={!link.trim()} onClick={() => submitVideo(false)}>
            Change video
          </button>
        </div>
        <p className="hint">Use the player controls to play, pause and seek. Everyone follows you.</p>
      </div>
    );
  }

  return (
    <div className="card restricted">
      <h2>Ask the host</h2>
      <p className="hint">You are watching in view-only mode. Send a request and the host or a moderator can approve it.</p>
      <div className="row">
        <button onClick={() => send('request_change', { action: 'play' })}>Request play</button>
        <button onClick={() => send('request_change', { action: 'pause' })}>Request pause</button>
      </div>
      <div className="row">
        <input value={seekText} onChange={(e) => setSeekText(e.target.value)} placeholder="Seek to 1:30" />
        <button disabled={!seekText.trim()} onClick={submitSeek}>
          Request seek
        </button>
      </div>
      <div className="row">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube link" />
        <button disabled={!link.trim()} onClick={() => submitVideo(true)}>
          Request video
        </button>
      </div>
    </div>
  );
}
