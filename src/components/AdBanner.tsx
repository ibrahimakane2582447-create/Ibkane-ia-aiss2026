import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot }) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  // Remplacez 'YOUR_ID' par votre vrai ID ca-pub-XXXX
  const pubId = import.meta.env.VITE_ADSENSE_PUB_ID || "YOUR_ID";

  useEffect(() => {
    if (pushedRef.current || pubId === "YOUR_ID") return;

    const pushAd = () => {
      try {
        if (adRef.current && adRef.current.offsetWidth > 0) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushedRef.current = true;
        } else {
          // Retry in a bit if width is 0
          setTimeout(pushAd, 500);
        }
      } catch (e) {
        console.error("AdSense error", e);
      }
    };

    // Give it a moment to render and get width
    const timer = setTimeout(pushAd, 100);
    return () => clearTimeout(timer);
  }, [pubId]);

  if (pubId === "YOUR_ID") {
    return (
      <div className="w-full flex flex-col items-center justify-center my-2 p-4 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Espace Publicitaire</p>
        <p className="text-[8px] text-zinc-700 mt-1 italic">(Configurez votre ID AdSense pour activer)</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center my-2 overflow-hidden min-h-[50px] bg-zinc-900/50 rounded-lg border border-zinc-800">
      <ins 
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minWidth: '250px' }}
        data-ad-client={`ca-pub-${pubId}`}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};
