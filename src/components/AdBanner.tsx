import React, { useEffect } from 'react';

interface AdBannerProps {
  slot: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot }) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-2 overflow-hidden min-h-[50px] bg-zinc-900/50 rounded-lg border border-zinc-800">
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-YOUR_ID"
           data-ad-slot={slot}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};
