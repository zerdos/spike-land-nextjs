import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { appCreationSchema } from "@/lib/validations/app"
import { ZodError } from "zod"
import type { RequirementPriority, RequirementStatus, MonetizationType } from "@prisma/client"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const app = await prisma.app.findFirst({
      where: {
        id,
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
    })

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(app)
  } catch (error) {
    console.error("Error fetching app:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const existingApp = await prisma.app.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
    })

    if (!existingApp) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = appCreationSchema.partial().parse(body)

    const updateData: {
      name?: string
      description?: string
      requirements?: { create: { description: string; priority: RequirementPriority; status: RequirementStatus } }
      monetizationModels?: { create: { type: MonetizationType; features: string[] } }
    } = {}

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }

    const app = await prisma.app.update({
      where: { id },
      data: updateData,
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
    })

    return NextResponse.json(app)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating app:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const existingApp = await prisma.app.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: {
          not: "DELETED",
        },
      },
    })

    if (!existingApp) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      )
    }

    await prisma.app.update({
      where: { id },
      data: { status: "DELETED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting app:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
