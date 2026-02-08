"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Progress } from "@/components/ui/progress";
import { useWorkspaceCredits } from "@/hooks/useWorkspaceCredits";
import { cn } from "@/lib/utils";
import { AlertTriangle, ImageIcon, Sparkles } from "lucide-react";

interface CreditBalanceDisplayProps {
    showEstimates?: boolean;
    showUsage?: boolean;
    className?: string;
}

export function CreditBalanceDisplay({
    showEstimates = true,
    showUsage = true,
    className,
}: CreditBalanceDisplayProps) {
    const {
        remaining,
        limit,
        used,
        tier,
        isLoading,
        isLowCredits,
        isCriticalCredits,
        usagePercent,
        estimatedEnhancements,
    } = useWorkspaceCredits();

    if (isLoading) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center gap-2 p-4">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            className={cn(
                isCriticalCredits && "border-destructive",
                isLowCredits && !isCriticalCredits && "border-yellow-500",
                className,
            )}
        >
            <CardContent className="p-4 space-y-4">
                {/* Credit Balance Display */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles
                            className={cn(
                                "h-5 w-5",
                                isCriticalCredits
                                    ? "text-destructive"
                                    : isLowCredits
                                        ? "text-yellow-500"
                                        : "text-primary",
                            )}
                        />
                        <div>
                            <p className="text-sm font-medium">{remaining} credits</p>
                            <p className="text-xs text-muted-foreground">
                                {tier ? `${tier} tier` : "Available this month"}
                            </p>
                        </div>
                    </div>

                    {/* Low Credits Warning */}
                    {isLowCredits && (
                        <div
                            className={cn(
                                "flex items-center gap-1 text-xs",
                                isCriticalCredits ? "text-destructive" : "text-yellow-600",
                            )}
                            data-testid="low-credits-warning"
                        >
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                                {isCriticalCredits ? "Very low credits" : "Low credits"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Usage Progress */}
                {showUsage && limit > 0 && (
                    <div className="space-y-1.5" data-testid="credit-usage">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Monthly usage</span>
                            <span>{used} / {limit} credits used ({usagePercent}%)</span>
                        </div>
                        <Progress
                            value={usagePercent}
                            className="h-1.5"
                            data-testid="usage-progress"
                        />
                    </div>
                )}

                {/* Estimated Enhancements */}
                {showEstimates && (
                    <div
                        className="bg-muted/50 rounded-lg p-3 space-y-2"
                        data-testid="estimated-enhancements"
                    >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ImageIcon className="h-3 w-3" />
                            <span>Estimated enhancements remaining</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-lg font-semibold">
                                    {estimatedEnhancements.tier1K}
                                </p>
                                <p className="text-xs text-muted-foreground">1K quality</p>
                            </div>
                            <div>
                                <p className="text-lg font-semibold">
                                    {estimatedEnhancements.tier2K}
                                </p>
                                <p className="text-xs text-muted-foreground">2K quality</p>
                            </div>
                            <div>
                                <p className="text-lg font-semibold">
                                    {estimatedEnhancements.tier4K}
                                </p>
                                <p className="text-xs text-muted-foreground">4K quality</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upgrade CTA for low credits */}
                {isLowCredits && (
                    <div className="pt-2" data-testid="upgrade-cta">
                        <Button
                            asChild
                            size="sm"
                            variant={isCriticalCredits ? "default" : "outline"}
                            className="w-full"
                        >
                            <Link href="/pricing">
                                {isCriticalCredits ? "Upgrade Now" : "View Plans"}
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
