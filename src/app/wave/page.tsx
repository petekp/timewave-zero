import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import WaveLoader from "@/components/wave/WaveLoader";
import "./wave.css";

export const metadata: Metadata = {
  title: "Timewave Zero, reimagined",
  description: "Terence McKenna's timewave as a place to travel through: the fractal curve of novelty in 3D, from a single hour to 72 billion years.",
};

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export default function WavePage() {
  return (
    <div className={`wave-page ${sans.variable} ${mono.variable}`}>
      <WaveLoader />
    </div>
  );
}
