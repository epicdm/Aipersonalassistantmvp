/**
 * GET /api/isola/available-numbers
 * Returns up to 5 available 818-XXXX numbers from Magnus.
 * Used by Path B onboarding — business picks a number from EPIC's pool.
 */
import { NextResponse } from 'next/server'
import { findAvailableDIDs } from '@/app/lib/did-provisioner'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const numbers = await findAvailableDIDs(5)
    if (numbers.length === 0) {
      return NextResponse.json(
        { error: 'No numbers available right now. Please try again shortly.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ numbers })
  } catch (err: any) {
    console.error('[available-numbers]', err.message)
    return NextResponse.json({ error: 'Could not load numbers — please try again.' }, { status: 500 })
  }
}
