import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

 const components = await prisma.component.findMany({
  where: { projectId },
  include: {
    partList: true,
    sheathing: true,
  },
})
  return NextResponse.json(components)
}