"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateChiSquared, chiSquaredToPValue } from "@/lib/ab-testing";

interface VariantResult {
  converted: boolean;
}

interface Variant {
  id: string;
  name: string;
  results: VariantResult[];
}

interface AbTest {
  variants: Variant[];
  significanceLevel: number;
  winnerVariantId: string | null;
}

interface AbTestResultsProps {
  test: AbTest;
}

const AbTestResults = ({ test }: AbTestResultsProps) => {
  const variantsWithStats = test.variants.map((variant) => {
    const visitors = variant.results.length;
    const conversions = variant.results.filter((r) => r.converted).length;
    const conversionRate = visitors > 0 ? conversions / visitors : 0;
    return { ...variant, visitors, conversions, conversionRate };
  });

  const chiSquared = calculateChiSquared(variantsWithStats);
  const pValue = chiSquaredToPValue(chiSquared);
  const significance = 1 - pValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p>
            <strong>Statistical Significance:</strong> {(significance * 100).toFixed(2)}%
          </p>
          {significance >= test.significanceLevel && (
            <p className="text-green-600">
              A winner has been automatically selected.
            </p>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead>Visitors</TableHead>
              <TableHead>Conversions</TableHead>
              <TableHead>Conversion Rate</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variantsWithStats.map((variant) => (
              <TableRow
                key={variant.id}
                className={test.winnerVariantId === variant.id
                  ? "bg-green-100"
                  : ""}
              >
                <TableCell>
                  {variant.name} {test.winnerVariantId === variant.id && <Badge>Winner</Badge>}
                </TableCell>
                <TableCell>{variant.visitors}</TableCell>
                <TableCell>{variant.conversions}</TableCell>
                <TableCell>
                  {(variant.conversionRate * 100).toFixed(2)}%
                </TableCell>
                <TableCell>{(significance * 100).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AbTestResults;
