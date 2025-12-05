"use client";

import type { Requirement } from "@/types/app";
import { useState } from "react";
import { RequirementsManager } from "./requirements-manager";

/**
 * Example usage of the RequirementsManager component
 *
 * This component demonstrates how to integrate the RequirementsManager
 * into your application with proper state management.
 */
export function RequirementsManagerExample() {
  const [requirements, setRequirements] = useState<Requirement[]>([
    {
      id: "req-1",
      text: "User authentication with OAuth",
      priority: "high",
      status: "in-progress",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "req-2",
      text: "Responsive dashboard layout",
      priority: "medium",
      status: "pending",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">My App Requirements</h1>

      {/* Basic Usage */}
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={setRequirements}
      />

      {/* With Maximum Requirements Limit */}
      {
        /*
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={setRequirements}
        maxRequirements={10}
      />
      */
      }

      {/* Without Reordering */}
      {
        /*
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={setRequirements}
        allowReorder={false}
      />
      */
      }

      {/* Read-only Mode */}
      {
        /*
      <RequirementsManager
        requirements={requirements}
        onRequirementsChange={setRequirements}
        readonly
      />
      */
      }
    </div>
  );
}

/**
 * Example with persistence (local storage)
 */
export function RequirementsManagerWithPersistence() {
  const [requirements, setRequirements] = useState<Requirement[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("app-requirements");
    return saved ? JSON.parse(saved) : [];
  });

  const handleChange = (newRequirements: Requirement[]) => {
    setRequirements(newRequirements);
    localStorage.setItem("app-requirements", JSON.stringify(newRequirements));
  };

  return (
    <RequirementsManager
      requirements={requirements}
      onRequirementsChange={handleChange}
    />
  );
}

/**
 * Example with API integration
 */
export function RequirementsManagerWithAPI() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const handleChange = async (newRequirements: Requirement[]) => {
    // Optimistic update
    setRequirements(newRequirements);

    try {
      // Sync with API
      await fetch("/api/apps/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequirements),
      });
    } catch (error) {
      console.error("Failed to save requirements:", error);
      // Handle error (e.g., revert changes, show notification)
    }
  };

  return (
    <RequirementsManager
      requirements={requirements}
      onRequirementsChange={handleChange}
    />
  );
}
