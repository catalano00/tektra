import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const clients = await prisma.client.findMany();
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, address, city, state, zip } = body;

    // Optionally, check if client exists before creating
    const existing = await prisma.client.findFirst({
      where: {
        firstName,
        lastName,
      },
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const client = await prisma.client.create({
      data: { firstName, lastName, phone, address, city, state, zip },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}