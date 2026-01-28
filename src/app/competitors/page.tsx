"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

interface Competitor {
  id: string;
  platform: string;
  handle: string;
  name: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [formData, setFormData] = useState({
    platform: "",
    handle: "",
    name: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCompetitor = () => {
    if (!formData.platform || !formData.handle || !formData.name) {
      return;
    }

    const newCompetitor: Competitor = {
      id: crypto.randomUUID(),
      platform: formData.platform,
      handle: formData.handle,
      name: formData.name,
    };

    setCompetitors((prev) => [...prev, newCompetitor]);
    setFormData({ platform: "", handle: "", name: "" });
  };

  const handleDeleteCompetitor = (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
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
            <Input
              name="platform"
              placeholder="Platform (e.g., TWITTER)"
              value={formData.platform}
              onChange={handleInputChange}
            />
            <Input
              name="handle"
              placeholder="Handle (e.g., @username)"
              value={formData.handle}
              onChange={handleInputChange}
            />
            <Input
              name="name"
              placeholder="Display Name"
              value={formData.name}
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
