import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/meeting/[id]/signal?toId=<id>&since=<iso>
 * Returns all signals addressed to `toId` created after `since`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params
  const toId = req.nextUrl.searchParams.get('toId') ?? ''
  const since = req.nextUrl.searchParams.get('since') ?? new Date(0).toISOString()

  const { data, error } = await supabase
    .from('webrtc_signals')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('to_id', toId)
    .gt('created_at', since)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[signal GET]', error)
    return NextResponse.json({ signals: [] })
  }

  return NextResponse.json({ signals: data ?? [] })
}

/**
 * POST /api/meeting/[id]/signal
 * Body: { fromId, toId, type, payload }
 * Inserts a new signal row.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params
  const body = await req.json() as {
    fromId: string
    toId: string
    type: string
    payload: unknown
  }

  const { error } = await supabase
    .from('webrtc_signals')
    .insert({
      meeting_id: meetingId,
      from_id: body.fromId,
      to_id: body.toId,
      type: body.type,
      payload: body.payload,
    })

  if (error) console.error('[signal POST]', error)
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/meeting/[id]/signal?meetingId=<id>
 * Cleans up all signals for a meeting (called when host ends the call).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params

  const { error } = await supabase
    .from('webrtc_signals')
    .delete()
    .eq('meeting_id', meetingId)

  if (error) console.error('[signal DELETE]', error)
  return NextResponse.json({ ok: true })
}
