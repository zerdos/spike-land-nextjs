/**
 * Admin Dashboard Home Page
 *
 * Overview page showing key metrics and quick links to admin sections.
 */

import Link from "next/link"
import { Card } from "@/components/ui/card"
import prisma from "@/lib/prisma"
import { UserRole, JobStatus } from "@prisma/client"

async function getDashboardMetrics() {
  const [
    totalUsers,
    adminCount,
    totalEnhancements,
    activeJobs,
    totalTokensPurchased,
    totalTokensSpent,
    activeVouchers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        OR: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
      },
    }),
    prisma.imageEnhancementJob.count(),
    prisma.imageEnhancementJob.count({
      where: {
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING],
        },
      },
    }),
    prisma.tokenTransaction.aggregate({
      where: {
        type: {
          in: ["EARN_PURCHASE", "EARN_BONUS", "EARN_REGENERATION"],
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.tokenTransaction.aggregate({
      where: {
        type: "SPEND_ENHANCEMENT",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.voucher.count({
      where: {
        status: "ACTIVE",
      },
    }),
  ])

  return {
    totalUsers,
    adminCount,
    totalEnhancements,
    activeJobs,
    totalTokensPurchased: totalTokensPurchased._sum.amount || 0,
    totalTokensSpent: Math.abs(totalTokensSpent._sum.amount || 0),
    activeVouchers,
  }
}

export default async function AdminDashboard() {
  const metrics = await getDashboardMetrics()

  const quickLinks = [
    {
      title: "User Analytics",
      description: "View user growth, retention, and engagement metrics",
      href: "/admin/analytics",
      icon: "📈",
    },
    {
      title: "Token Economics",
      description: "Monitor token purchases, spending, and revenue",
      href: "/admin/tokens",
      icon: "💰",
    },
    {
      title: "System Health",
      description: "Check enhancement jobs, processing times, and errors",
      href: "/admin/system",
      icon: "🏥",
    },
    {
      title: "Voucher Management",
      description: "Create and manage promotional vouchers",
      href: "/admin/vouchers",
      icon: "🎟️",
    },
    {
      title: "User Management",
      description: "Search users, adjust roles, and manage tokens",
      href: "/admin/users",
      icon: "👥",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Platform overview and quick actions
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Total Users
              </p>
              <p className="mt-2 text-3xl font-bold">{metrics.totalUsers}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics.adminCount} admin{metrics.adminCount !== 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Enhancements
              </p>
              <p className="mt-2 text-3xl font-bold">
                {metrics.totalEnhancements}
              </p>
            </div>
            <div className="text-4xl">🎨</div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics.activeJobs} active job{metrics.activeJobs !== 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Tokens Purchased
              </p>
              <p className="mt-2 text-3xl font-bold">
                {metrics.totalTokensPurchased.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics.totalTokensSpent.toLocaleString()} spent
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Active Vouchers
              </p>
              <p className="mt-2 text-3xl font-bold">
                {metrics.activeVouchers}
              </p>
            </div>
            <div className="text-4xl">🎟️</div>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Promotional campaigns
          </p>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Links</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="p-6 transition-shadow hover:shadow-md">
                <div className="mb-3 text-4xl">{link.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{link.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {link.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
