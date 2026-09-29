import { useEffect, useRef } from 'react';

// Wraps the YouTube IFrame API.
// - Everyone APPLIES the server's sync_state to their player.
// - Only host/moderators SEND events (play/pause/seek) when they use the player.
// "remote" flag stops us from re-sending events caused by applying a remote state.
export default function Player({ state, canControl, myId, send }) {
  const holder = useRef(null);
  const player = useRef(null);
  const ready = useRef(false);
  const remote = useRef(false);
  const lastTime = useRef(0);
  const stateRef = useRef(state);
  const canRef = useRef(canControl);
  const myIdRef = useRef(myId);
  stateRef.current = state;
  canRef.current = canControl;
  myIdRef.current = myId;

  const apply = (s) => {
    const p = player.current;
    if (!p || !ready.current || !s) return;
    // my own play/pause/seek already happened on my player
    if (s.by === myIdRef.current && s.action !== 'change_video') return;
    remote.current = true;
    const playing = s.playState === 'playing';
    const current = p.getVideoData && p.getVideoData().video_id;
    if (current !== s.videoId) {
      if (playing) p.loadVideoById(s.videoId, s.currentTime);
      else p.cueVideoById(s.videoId, s.currentTime);
    } else {
      if (Math.abs(p.getCurrentTime() - s.currentTime) > 1.5) p.seekTo(s.currentTime, true);
      if (playing) p.playVideo();
      else p.pauseVideo();
    }
    setTimeout(() => {
      remote.current = false;
      lastTime.current = p.getCurrentTime();
    }, 900);
  };

  // create the player once
  useEffect(() => {
    const create = () => {
      player.current = new window.YT.Player(holder.current, {
        videoId: stateRef.current.videoId,
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onReady: () => {
            ready.current = true;
            apply({ ...stateRef.current, by: null });
          },
          onStateChange: (e) => {
            if (remote.current || !canRef.current) return;
            const t = player.current.getCurrentTime();
            if (e.data === 1) send('play', { time: t });
            if (e.data === 2) send('pause', { time: t });
          },
        },
      });
    };
    if (window.YT && window.YT.Player) create();
    else {
      window.onYouTubeIframeAPIReady = create;
      if (!document.getElementById('yt-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }
    // detect seeking: time jumps more than expected between two checks
    const timer = setInterval(() => {
      const p = player.current;
      if (!p || !ready.current || remote.current || !canRef.current) return;
      const t = p.getCurrentTime();
      const expected = lastTime.current + (p.getPlayerState() === 1 ? 0.5 : 0);
      if (Math.abs(t - expected) > 1.5) send('seek', { time: t });
      lastTime.current = t;
    }, 500);
    return () => {
      clearInterval(timer);
      if (player.current && player.current.destroy) player.current.destroy();
      player.current = null;
      ready.current = false;
    };
  }, []);

  // apply every new state from the server
  useEffect(() => {
    apply(state);
  }, [state]);

  return (
    <div className="player">
      <div className="player-frame">
        <div ref={holder} />
        {!canControl && <div className="player-lock">Playback is controlled by the host and moderators</div>}
      </div>
    </div>
  );
}
