/**
 * Audit Log Table - Paginated table with expandable rows
 * Resolves #522 (ORB-068): Audit Log UI
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Fragment, useState } from "react";

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-center py-8 text-muted-foreground">Loading audit logs...</p>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No audit logs found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <Fragment key={log.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                >
                  <TableCell>
                    {expandedRow === log.id
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.userId}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{log.targetType}</p>
                      <p className="text-muted-foreground font-mono text-xs">{log.targetId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
                {expandedRow === log.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30">
                      <div className="p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Metadata</h4>
                        <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
