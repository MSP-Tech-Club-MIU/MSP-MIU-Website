import React, { useMemo } from 'react';
import {
  normalizeLiveDemoEmbedUrl,
  normalizeLiveDemoOpenUrl,
  liveDemoHttpEmbedBlocked
} from '../utils/taskQuizAssets';
import './LiveDemoEmbed.css';

export default function LiveDemoEmbed({ liveUrl, embedTitle = 'Live demo preview', className = '' }) {
  const openUrl = useMemo(() => normalizeLiveDemoOpenUrl(liveUrl), [liveUrl]);
  const embedSrc = useMemo(() => normalizeLiveDemoEmbedUrl(liveUrl), [liveUrl]);
  const blocked = useMemo(() => liveDemoHttpEmbedBlocked(liveUrl), [liveUrl]);

  if (!openUrl) return null;

  if (embedSrc) {
    return (
      <div className={`LiveDemoEmbed ${className}`.trim()}>
        <p className="LiveDemoEmbed__note">
          In-page preview. Many hosts send X-Frame-Options or CSP that block embedding; if the frame is empty, open
          the live link in a new tab.
        </p>
        <div className="LiveDemoEmbed__wrap">
          <iframe
            key={embedSrc}
            title={embedTitle}
            src={embedSrc}
            className="LiveDemoEmbed__frame"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className={`LiveDemoEmbed LiveDemoEmbed--blocked ${className}`.trim()}>
        <p className="LiveDemoEmbed__note">
          This live URL uses HTTP while the app is on HTTPS, so it cannot be embedded. Use the live link to open it in
          a new tab.
        </p>
      </div>
    );
  }

  return null;
}
