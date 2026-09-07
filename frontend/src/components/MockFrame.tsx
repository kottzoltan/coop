import { useCallback, useRef } from 'react';

interface MockFrameProps {
  src: string;
  title: string;
  /** Toborzás mock: melyik nézet legyen aktív betöltéskor */
  embedInit?: string;
}

/** Mock HTML betöltése — a beágyazott oldal saját sidebarját elrejti. */
export function MockFrame({ src, title, embedInit }: MockFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const onLoad = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    if (!doc.getElementById('ice-embed-style')) {
      const style = doc.createElement('style');
      style.id = 'ice-embed-style';
      style.textContent = `
        .sidebar { display: none !important; }
        .app { display: block !important; min-height: 100vh; }
        .main { padding: 22px 26px !important; }
        body { background: #F6F4EF; }
      `;
      doc.head.appendChild(style);
    }

    if (embedInit && win) {
      const setView = (win as Window & { setView?: (v: string) => void }).setView;
      setView?.(embedInit);
    }
  }, [embedInit]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      onLoad={onLoad}
      className="h-full w-full border-0 bg-cream"
    />
  );
}
