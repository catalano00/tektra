import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET() {
  const projects = await prisma.project.findMany()
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const body = await req.json()

  const created = await prisma.project.create({
    data: {
      name: body.name,
      client: body.client,
    },
  })

  return NextResponse.json(created)
}