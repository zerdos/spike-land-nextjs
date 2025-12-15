"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  tokensEarned: number;
}

interface ReferredUser {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  tokensGranted: number;
}

export default function ReferralsPage() {
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch referral link
      const linkResponse = await fetch("/api/referral/link");
      if (!linkResponse.ok) {
        throw new Error("Failed to fetch referral link");
      }
      const linkData = await linkResponse.json();
      setReferralLink(linkData.url);
      setReferralCode(linkData.code);

      // Fetch stats
      const statsResponse = await fetch("/api/referral/stats");
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch referral stats");
      }
      const statsData = await statsResponse.json();
      setStats(statsData.stats);
      setReferredUsers(statsData.referredUsers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load referral data",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOnTwitter = () => {
    const text = `Join me on Pixel and get 50 free tokens! Use my referral link:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${
      encodeURIComponent(referralLink)
    }`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${
      encodeURIComponent(referralLink)
    }`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground mt-2">
          Invite friends and earn 50 tokens for each successful referral. Your friends get 50 tokens
          too!
        </p>
      </div>

      {/* Referral Link Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
            />
            <Button onClick={copyToClipboard} variant="outline">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={shareOnTwitter}
              variant="outline"
              className="flex-1"
            >
              Share on Twitter
            </Button>
            <Button
              onClick={shareOnFacebook}
              variant="outline"
              className="flex-1"
            >
              Share on Facebook
            </Button>
            <Button
              onClick={shareOnLinkedIn}
              variant="outline"
              className="flex-1"
            >
              Share on LinkedIn
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Referral Code: <code className="px-2 py-1 bg-muted rounded">{referralCode}</code>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalReferrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.completedReferrals}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.pendingReferrals}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tokens Earned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.tokensEarned}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referred Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>
            People who signed up using your referral link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referredUsers.length === 0
            ? (
              <div className="text-center py-8 text-muted-foreground">
                No referrals yet. Share your link to get started!
              </div>
            )
            : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-right py-3 px-4">Tokens Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredUsers.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-3 px-4 font-mono text-sm">
                          {user.email}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={user.status === "COMPLETED"
                              ? "default"
                              : user.status === "PENDING"
                              ? "secondary"
                              : "destructive"}
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {user.tokensGranted > 0
                            ? `+${user.tokensGranted}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold">Share Your Link</h3>
              <p className="text-sm text-muted-foreground">
                Copy your referral link and share it with friends via social media, email, or
                messaging apps.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold">Friend Signs Up</h3>
              <p className="text-sm text-muted-foreground">
                When your friend creates an account using your link, they get 50 free tokens to
                start.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold">Verify Email</h3>
              <p className="text-sm text-muted-foreground">
                After your friend verifies their email address, both of you receive 50 tokens!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold">Repeat</h3>
              <p className="text-sm text-muted-foreground">
                There's no limit! Keep referring friends and earning tokens.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
