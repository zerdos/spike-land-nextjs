import { LibraryClient } from "./LibraryClient";

export const metadata = {
  title: "Photo Library | Pixel",
};

export default function LibraryPage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Your Library</h1>
      </div>
      <LibraryClient />
    </div>
  );
}
