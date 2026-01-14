"use client";

import type { APP_BUILD_STATUSES } from "@/lib/validations/app";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AppCard3D } from "./AppCard3D";

interface AppData {
  id: string;
  name: string;
  description: string | null;
  status: (typeof APP_BUILD_STATUSES)[number];
  codespaceUrl: string | null;
  _count: {
    messages: number;
    images: number;
  };
  updatedAt: Date;
}

interface AppCatalogProps {
  apps: AppData[];
}

export function AppCatalog({ apps }: AppCatalogProps) {
  return (
    <LayoutGroup>
      <motion.div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        style={{ perspective: "1200px" }}
      >
        <AnimatePresence mode="popLayout">
          {apps.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
              }}
            >
              <AppCard3D app={app} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
