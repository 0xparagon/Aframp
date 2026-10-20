import { NextResponse } from 'next/server'

export const revalidate = 86400

export async function GET() {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (process.env.PAYSTACK_SECRET_KEY) {
      headers['Authorization'] = `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
    }

    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      headers,
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch banks from Paystack' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
