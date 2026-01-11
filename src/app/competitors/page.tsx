"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SocialPlatform } from "@prisma/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Competitor = {
  id: string;
  workspaceId: string;
  platform: string;
  handle: string;
  name: string | null;
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [newCompetitor, setNewCompetitor] = useState({
    platform: "",
    handle: "",
    name: "",
  });

  useEffect(() => {
    const fetchWorkspaceId = async () => {
      try {
        const res = await fetch("/api/workspace/personal");
        if (!res.ok) {
          throw new Error("Failed to get workspace ID");
        }
        const data = await res.json();
        setWorkspaceId(data.workspaceId);
      } catch (_error) {
        toast.error("Failed to get workspace ID.");
      }
    };

    const fetchCompetitors = async () => {
      try {
        const res = await fetch("/api/competitors");
        if (!res.ok) {
          throw new Error("Failed to fetch competitors");
        }
        const data = await res.json();
        setCompetitors(data);
      } catch (_error) {
        toast.error("Failed to fetch competitors.");
      }
    };

    fetchWorkspaceId();
    fetchCompetitors();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCompetitor((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlatformChange = (value: string) => {
    setNewCompetitor((prev) => ({ ...prev, platform: value }));
  };

  const handleAddCompetitor = async () => {
    if (!workspaceId) {
      toast.error("You must be in a workspace to add a competitor.");
      return;
    }

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCompetitor, workspaceId }),
      });

      if (!res.ok) {
        throw new Error("Failed to add competitor");
      }

      const addedCompetitor = await res.json();
      setCompetitors((prev) => [...prev, addedCompetitor]);
      setNewCompetitor({
        platform: "",
        handle: "",
        name: "",
      });
      toast.success("Competitor added successfully.");
    } catch (_error) {
      toast.error("Failed to add competitor.");
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete competitor");
      }

      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      toast.success("Competitor deleted successfully.");
    } catch (_error) {
      toast.error("Failed to delete competitor.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Competitor Tracking</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add New Competitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SocialPlatform).map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              name="handle"
              placeholder="Handle (e.g., @username)"
              value={newCompetitor.handle}
              onChange={handleInputChange}
            />
            <Input
              name="name"
              placeholder="Display Name"
              value={newCompetitor.name}
              onChange={handleInputChange}
            />
            <Button onClick={handleAddCompetitor}>Add Competitor</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Competitors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor) => (
                  <TableRow key={competitor.id}>
                    <TableCell>{competitor.platform}</TableCell>
                    <TableCell>{competitor.handle}</TableCell>
                    <TableCell>{competitor.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCompetitor(competitor.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
