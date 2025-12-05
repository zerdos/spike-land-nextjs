"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";

interface VoucherInputProps {
  onRedeemed?: (tokensGranted: number, newBalance: number) => void;
}

export function VoucherInput({ onRedeemed }: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<
    {
      success: boolean;
      message: string;
      tokensGranted?: number;
    } | null
  >(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Successfully redeemed! You received ${data.tokensGranted} tokens.`,
          tokensGranted: data.tokensGranted,
        });
        setCode("");
        onRedeemed?.(data.tokensGranted, data.newBalance);
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to redeem voucher",
        });
      }
    } catch (error) {
      console.error("[VoucherInput] Redemption error:", error);
      setResult({
        success: false,
        message: "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="voucher-code">Have a voucher code?</Label>
        <div className="flex gap-2">
          <Input
            id="voucher-code"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isLoading}
          />
          <Button
            onClick={handleRedeem}
            disabled={isLoading || !code.trim()}
            variant="outline"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
