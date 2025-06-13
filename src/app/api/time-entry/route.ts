import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      componentId,
      warehouse,
      workstation,
      teamLead,
      process,
      duration
    } = body

    if (
      !componentId ||
      !warehouse ||
      !workstation ||
      !teamLead ||
      !process ||
      duration === undefined
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const minutes = Number(duration) / 60

    const entry = await prisma.timeEntry.create({
      data: {
        componentId,
        warehouse,
        workstation,
        teamLead,
        process,
        duration: minutes,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}