import { DataConnection } from "peerjs";
import { useEffect } from "react";
import * as Y from "yjs";

export function usePeerDataChannel(
  doc: Y.Doc,
  connections: Map<string, { dataConnection: DataConnection | null; }>,
) {
  // Listen for local updates and broadcast
  useEffect(() => {
    const handleUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== "remote") {
        connections.forEach((conn) => {
          if (conn.dataConnection?.open) {
            conn.dataConnection.send(update);
          }
        });
      }
    };

    doc.on("update", handleUpdate);

    return () => {
      doc.off("update", handleUpdate);
    };
  }, [doc, connections]);

  // Helper to process incoming messages
  const handleIncomingData = (data: unknown) => {
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      Y.applyUpdate(doc, new Uint8Array(data), "remote");
    }
  };

  return { handleIncomingData };
}
