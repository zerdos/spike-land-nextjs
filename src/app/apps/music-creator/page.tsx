import MusicCreatorPage from "@apps/music-creator/pages/MusicCreatorPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music Creator - Layer and Record Audio",
  description: "A web app where you can layer audio tracks and record your own.",
};

export default function Page() {
  return <MusicCreatorPage />;
}
