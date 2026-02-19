import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/** GET /api/meeting/[id]/status → { ended: boolean } */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('meeting_status')
    .select('ended')
    .eq('meeting_id', id)
    .maybeSingle()

  if (error) {
    console.error('[status GET]', error)
    return NextResponse.json({ ended: false })
  }

  return NextResponse.json({ ended: data?.ended ?? false })
}

/** POST /api/meeting/[id]/status → marks meeting as ended */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase
    .from('meeting_status')
    .upsert({
      meeting_id: id,
      ended: true,
      ended_at: new Date().toISOString(),
    }, { onConflict: 'meeting_id' })

  if (error) console.error('[status POST]', error)
  return NextResponse.json({ ended: true })
}
