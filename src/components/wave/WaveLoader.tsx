"use client";

import dynamic from "next/dynamic";

// The scene needs WebGL and the window, so it is built on the client only.
const WaveApp = dynamic(() => import("./WaveApp"), {
  ssr: false,
  loading: () => <div className="wave-loading">Loading the wave …</div>,
});

export default function WaveLoader() {
  return <WaveApp />;
}
