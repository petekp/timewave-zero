"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

export default function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur intensity={0.9} radius={0.7} />
      <Vignette eskil={false} offset={0.18} darkness={0.75} />
    </EffectComposer>
  );
}
