import { useEffect } from 'react';
import demoteWidgetHeadings from '@/lib/demoteWidgetHeadings';

const SCRIPT_ID = 'leadconnector-chat-widget';

// Injects the LeadConnector chat widget loader. Only mounts once per session.
export default function LeadConnectorChatWidget() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;
    // Load on first interaction or after 5s, whichever comes first.
    const events = ['scroll', 'pointermove', 'touchstart', 'keydown'];
    let done = false;
    const load = () => {
      if (done || document.getElementById(SCRIPT_ID)) return;
      done = true;
      cleanup();
      injectScript();
    };
    const timer = setTimeout(load, 5000);
    events.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
    function cleanup() {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, load));
    }
    return cleanup;
  }, []);

  return null;
}

function injectScript() {
  {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://widgets.leadconnectorhq.com/loader.js';
    script.setAttribute('data-resources-url', 'https://widgets.leadconnectorhq.com/chat-widget/loader.js');
    script.setAttribute('data-widget-id', '6a4b86fa0fa92556976d2ad5');
    script.setAttribute('data-source', 'WEB_USER');
    script.async = true;
    document.body.appendChild(script);
    demoteWidgetHeadings();
  }
}