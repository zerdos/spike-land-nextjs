"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TopPost } from "@/types/analytics";

interface TopPostsTableProps {
  data: TopPost[];
}

export function TopPostsTable({ data }: TopPostsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Posts</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No posts available yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="text-right">Engagement Rate</TableHead>
                <TableHead className="text-right">Engagements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Badge variant="outline">{post.platform}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {post.content}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {post.engagementRate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {post.engagements.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
