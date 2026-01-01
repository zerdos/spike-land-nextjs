import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { createGameDocument } from "../lib/crdt/game-document";

export function useYjsSync(roomId: string) {
  const [doc] = useState(() => createGameDocument());
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const persistence = new IndexeddbPersistence(roomId, doc);

    persistence.on("synced", () => {
      setIsSynced(true);
    });

    return () => {
      persistence.destroy();
    };
  }, [doc, roomId]);

  return { doc, isSynced };
}
