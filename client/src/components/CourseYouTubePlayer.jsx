import React, { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { extractYouTubeId } from '../utils/youtube';
import './CourseYouTubePlayer.css';

/**
 * Custom-styled Plyr player fed by a YouTube URL (video stays on YouTube).
 */
export default function CourseYouTubePlayer({ url, title = 'Course video' }) {
  const targetRef = useRef(null);
  const playerRef = useRef(null);
  const videoId = extractYouTubeId(url);

  useEffect(() => {
    if (!targetRef.current || !videoId) return undefined;

    const player = new Plyr(targetRef.current, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'settings',
        'fullscreen'
      ],
      youtube: {
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        modestbranding: 1
      }
    });

    playerRef.current = player;

    return () => {
      try {
        player.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="CourseYouTubePlayer CourseYouTubePlayer--invalid">
        Invalid YouTube link
      </div>
    );
  }

  return (
    <div className="CourseYouTubePlayer">
      {title ? <p className="CourseYouTubePlayer__title">{title}</p> : null}
      <div
        ref={targetRef}
        data-plyr-provider="youtube"
        data-plyr-embed-id={videoId}
      />
    </div>
  );
}
