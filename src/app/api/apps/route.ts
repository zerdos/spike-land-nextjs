import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { appCreationSchema } from "@/lib/validations/app"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = appCreationSchema.parse(body)

    const app = await prisma.app.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        userId: session.user.id,
        status: "DRAFT",
        requirements: {
          create: {
            description: validatedData.requirements,
            priority: "MEDIUM",
            status: "PENDING",
          },
        },
        monetizationModels: {
          create: {
            type: mapMonetizationModelToEnum(validatedData.monetizationModel),
            features: [],
          },
        },
      },
      include: {
        requirements: true,
        monetizationModels: true,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating app:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const apps = await prisma.app.findMany({
      where: {
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
      include: {
        requirements: {
          orderBy: {
            createdAt: "asc",
          },
        },
        monetizationModels: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(apps)
  } catch (error) {
    console.error("Error fetching apps:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function mapMonetizationModelToEnum(model: string) {
  const mapping: Record<string, "FREE" | "FREEMIUM" | "SUBSCRIPTION" | "ONE_TIME" | "USAGE_BASED"> = {
    "free": "FREE",
    "freemium": "FREEMIUM",
    "subscription": "SUBSCRIPTION",
    "one-time": "ONE_TIME",
    "usage-based": "USAGE_BASED",
  }
  return mapping[model] || "FREE"
}
