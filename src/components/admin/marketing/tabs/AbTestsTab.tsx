"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import CreateAbTestForm from "../ab-tests/CreateAbTestForm";

interface AbTestVariant {
  id: string;
  name: string;
  splitPercentage: number;
}

interface AbTest {
  id: string;
  name: string;
  status: string;
  variants: AbTestVariant[];
  createdAt: string;
}

interface CreateTestInput {
  name: string;
  description?: string;
  variants: { name: string; splitPercentage: number; }[];
}

const AbTestsTab = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const router = useRouter();

  const { data, isLoading } = useQuery<{ tests: AbTest[]; }>({
    queryKey: ["ab-tests"],
    queryFn: () => fetch("/api/ab-tests").then((res) => res.json()),
  });

  const createTestMutation = useMutation<unknown, Error, CreateTestInput>({
    mutationFn: (newTest) =>
      fetch("/api/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTest),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      setCreateDialogOpen(false);
      toast.success("A/B Test created successfully");
    },
    onError: () => {
      toast.error("Failed to create A/B Test");
    },
  });

  const handleRowClick = (testId: string) => {
    router.push(`/admin/marketing/ab-tests/${testId}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">A/B Tests</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Test</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New A/B Test</DialogTitle>
            </DialogHeader>
            <CreateAbTestForm
              onSubmit={createTestMutation.mutate}
              isLoading={createTestMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.tests.map((test) => (
              <TableRow
                key={test.id}
                onClick={() => handleRowClick(test.id)}
                className="cursor-pointer"
              >
                <TableCell>{test.name}</TableCell>
                <TableCell>{test.status}</TableCell>
                <TableCell>{test.variants.length}</TableCell>
                <TableCell>
                  {new Date(test.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AbTestsTab;
