"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Hash, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface TopicKeywords {
  and?: string[];
  or?: string[];
  not?: string[];
}

interface ScoutTopic {
  id: string;
  name: string;
  keywords: TopicKeywords;
  isActive: boolean;
  createdAt: string;
  _count?: {
    results: number;
  };
}

interface TopicsClientProps {
  workspaceSlug: string;
}

export function TopicsClient({ workspaceSlug }: TopicsClientProps) {
  const [topics, setTopics] = useState<ScoutTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ScoutTopic | null>(null);

  // Form state
  const [searchQuery, setSearchQuery] = useState("");
  const [formName, setFormName] = useState("");
  const [formAndKeywords, setFormAndKeywords] = useState("");
  const [formOrKeywords, setFormOrKeywords] = useState("");
  const [formNotKeywords, setFormNotKeywords] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchTopics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/topics`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch topics (${response.status})`,
        );
      }

      const data = await response.json();
      setTopics(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not load topics.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const resetForm = () => {
    setFormName("");
    setFormAndKeywords("");
    setFormOrKeywords("");
    setFormNotKeywords("");
    setFormIsActive(true);
    setEditingTopic(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (topic: ScoutTopic) => {
    setEditingTopic(topic);
    setFormName(topic.name);
    setFormAndKeywords(topic.keywords.and?.join(", ") || "");
    setFormOrKeywords(topic.keywords.or?.join(", ") || "");
    setFormNotKeywords(topic.keywords.not?.join(", ") || "");
    setFormIsActive(topic.isActive);
    setIsDialogOpen(true);
  };

  const handleSaveTopic = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a topic name");
      return;
    }

    setIsSaving(true);

    const keywords: TopicKeywords = {
      and: formAndKeywords
        .split(",")
        .map((kw) => kw.trim())
        .filter(Boolean),
      or: formOrKeywords
        .split(",")
        .map((kw) => kw.trim())
        .filter(Boolean),
      not: formNotKeywords
        .split(",")
        .map((kw) => kw.trim())
        .filter(Boolean),
    };

    const payload = {
      name: formName.trim(),
      keywords,
      isActive: formIsActive,
    };

    try {
      const endpoint = editingTopic
        ? `/api/orbit/${workspaceSlug}/scout/topics/${editingTopic.id}`
        : `/api/orbit/${workspaceSlug}/scout/topics`;
      const method = editingTopic ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to save topic");
      }

      const savedTopic = await response.json();

      if (editingTopic) {
        setTopics(topics.map((t) => (t.id === savedTopic.id ? savedTopic : t)));
        toast.success("Topic updated successfully");
      } else {
        setTopics([savedTopic, ...topics]);
        toast.success("Topic created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/topics/${topicId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to delete topic");
      }

      setTopics(topics.filter((t) => t.id !== topicId));
      toast.success("Topic deleted");
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "An unknown error occurred while deleting topic.";
      toast.error(errorMessage);
    }
  };

  const handleToggleActive = async (topic: ScoutTopic) => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/topics/${topic.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...topic,
            isActive: !topic.isActive,
          }),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to update topic");
      }

      const updatedTopic = await response.json();
      setTopics(topics.map((t) => (t.id === updatedTopic.id ? updatedTopic : t)));
      toast.success(`Topic ${updatedTopic.isActive ? "activated" : "paused"}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast.error(errorMessage);
    }
  };

  // Filter topics
  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = searchQuery === "" ||
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.keywords.and?.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase())) ||
      topic.keywords.or?.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="pl-9"
              />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingTopic ? "Edit Topic" : "Create Topic"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure keywords to monitor for this topic
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Topic Name</Label>
                    <Input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., AI in Healthcare"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="andKeywords">Keywords (AND)</Label>
                    <Input
                      id="andKeywords"
                      value={formAndKeywords}
                      onChange={(e) => setFormAndKeywords(e.target.value)}
                      placeholder="e.g., ai, healthcare (comma-separated)"
                    />
                    <p className="text-xs text-muted-foreground">
                      All these keywords must be present
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orKeywords">Keywords (OR)</Label>
                    <Input
                      id="orKeywords"
                      value={formOrKeywords}
                      onChange={(e) => setFormOrKeywords(e.target.value)}
                      placeholder="e.g., diagnosis, treatment (comma-separated)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Any of these keywords can match
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notKeywords">Keywords (NOT)</Label>
                    <Input
                      id="notKeywords"
                      value={formNotKeywords}
                      onChange={(e) => setFormNotKeywords(e.target.value)}
                      placeholder="e.g., crypto, blockchain (comma-separated)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Exclude results containing these keywords
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Monitor this topic for new mentions
                      </p>
                    </div>
                    <Switch
                      checked={formIsActive}
                      onCheckedChange={setFormIsActive}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTopic} disabled={isSaving}>
                    {isSaving
                      ? "Saving..."
                      : editingTopic
                      ? "Save Changes"
                      : "Create Topic"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Topics List */}
      <Card>
        <CardHeader>
          <CardTitle>Monitored Topics</CardTitle>
          <CardDescription>
            {filteredTopics.length} topic{filteredTopics.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading
            ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[300px]" />
                    </div>
                  </div>
                ))}
              </div>
            )
            : filteredTopics.length === 0
            ? (
              <div className="text-center py-12">
                <Hash className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No topics found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {topics.length === 0
                    ? "Create your first topic to start monitoring"
                    : "Try adjusting your search"}
                </p>
              </div>
            )
            : (
              <div className="space-y-3">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Hash className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{topic.name}</span>
                          {!topic.isActive && <Badge variant="outline">Paused</Badge>}
                          {topic._count?.results !== undefined && (
                            <Badge variant="secondary">
                              {topic._count.results} results
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {topic.keywords.and?.map((kw) => (
                            <Badge key={kw} variant="default" className="text-xs">
                              +{kw}
                            </Badge>
                          ))}
                          {topic.keywords.or?.map((kw) => (
                            <Badge
                              key={kw}
                              variant="secondary"
                              className="text-xs"
                            >
                              {kw}
                            </Badge>
                          ))}
                          {topic.keywords.not?.map((kw) => (
                            <Badge
                              key={kw}
                              variant="outline"
                              className="text-xs text-destructive"
                            >
                              -{kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={topic.isActive}
                        onCheckedChange={() => handleToggleActive(topic)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(topic)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit topic</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete topic</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
