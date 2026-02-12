"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Check } from "lucide-react";
import { upsertAIProvider, deleteAIProvider, setDefaultProvider } from "./actions";

interface AIProvider {
  id: string;
  name: string;
  token: string;
  isDefault: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any; // Using any for JsonValue compatibility
  createdAt: Date;
  updatedAt: Date;
}

export function AIProvidersClient({ initialProviders }: { initialProviders: AIProvider[] }) {
  const [providers, setProviders] = useState<AIProvider[]>(initialProviders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<Partial<AIProvider>>({
    name: "",
    token: "",
    isDefault: false,
  });

  const handleUpsert = async () => {
    if (!currentProvider.name || !currentProvider.token) {
      toast.error("Name and Token are required");
      return;
    }

    try {
      const providerData = {
        id: currentProvider.id,
        name: currentProvider.name!,
        token: currentProvider.token!,
        isDefault: currentProvider.isDefault,
        config: currentProvider.config,
      };
      const result = await upsertAIProvider(providerData);
      const typedResult = result as unknown as AIProvider;
      if (currentProvider.id) {
        setProviders(providers.map((p) => (p.id === typedResult.id ? typedResult : p)));
        toast.success("Provider updated");
      } else {
        setProviders([...providers, typedResult]);
        toast.success("Provider added");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (_error) {
      toast.error("Failed to save provider");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;

    try {
      await deleteAIProvider(id);
      setProviders(providers.filter((p) => p.id !== id));
      toast.success("Provider deleted");
    } catch (_error) {
      toast.error("Failed to delete provider");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultProvider(id);
      setProviders(
        providers.map((p) => ({
          ...p,
          isDefault: p.id === id,
        })),
      );
      toast.success("Default provider updated");
    } catch (_error) {
      toast.error("Failed to set default provider");
    }
  };

  const resetForm = () => {
    setCurrentProvider({ name: "", token: "", isDefault: false });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Providers</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Provider" : "Add Provider"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name (e.g., anthropic, google)</Label>
                <Input
                  id="name"
                  value={currentProvider.name}
                  onChange={(e) => setCurrentProvider({ ...currentProvider, name: e.target.value })}
                  placeholder="google"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token">API Key / Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={currentProvider.token}
                  onChange={(e) => setCurrentProvider({ ...currentProvider, token: e.target.value })}
                  placeholder="Enter token..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="default"
                  checked={currentProvider.isDefault}
                  onCheckedChange={(checked) => setCurrentProvider({ ...currentProvider, isDefault: checked })}
                />
                <Label htmlFor="default">Set as default provider</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpsert}>{isEditing ? "Update" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Token Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium capitalize">{provider.name}</TableCell>
                <TableCell>
                  {provider.isDefault ? (
                    <Badge variant="default" className="bg-green-600">
                      <Check className="mr-1 h-3 w-3" /> Default
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(provider.id)}
                    >
                      Make Default
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">Configured</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCurrentProvider(provider);
                      setIsEditing(true);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(provider.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {providers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No providers configured. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
