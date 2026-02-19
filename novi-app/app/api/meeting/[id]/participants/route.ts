import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export interface Participant {
  id: string
  name: string
  isHost: boolean
  isCameraOn: boolean
  isMicOn: boolean
  lastSeen: number // epoch ms
}

const STALE_THRESHOLD_SECS = 10

/** GET /api/meeting/[id]/participants → { participants: Participant[] } */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const staleTime = new Date(Date.now() - STALE_THRESHOLD_SECS * 1000).toISOString()

  const { data, error } = await supabase
    .from('meeting_participants')
    .select('*')
    .eq('meeting_id', id)
    .gt('last_seen', staleTime)

  if (error) {
    console.error('[participants GET]', error)
    return NextResponse.json({ participants: [] })
  }

  const participants: Participant[] = (data ?? []).map((row) => ({
    id: row.participant_id,
    name: row.name,
    isHost: row.is_host,
    isCameraOn: row.is_camera_on,
    isMicOn: row.is_mic_on,
    lastSeen: new Date(row.last_seen).getTime(),
  }))

  return NextResponse.json({ participants })
}

/** POST /api/meeting/[id]/participants → register / heartbeat */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as Omit<Participant, 'lastSeen'>

  const { error } = await supabase
    .from('meeting_participants')
    .upsert({
      meeting_id: id,
      participant_id: body.id,
      name: body.name,
      is_host: body.isHost,
      is_camera_on: body.isCameraOn,
      is_mic_on: body.isMicOn,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'meeting_id,participant_id' })

  if (error) console.error('[participants POST]', error)
  return NextResponse.json({ ok: true })
}

/** DELETE /api/meeting/[id]/participants?participantId=xxx */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const participantId = req.nextUrl.searchParams.get('participantId')

  if (participantId) {
    const { error } = await supabase
      .from('meeting_participants')
      .delete()
      .eq('meeting_id', id)
      .eq('participant_id', participantId)

    if (error) console.error('[participants DELETE]', error)
  }

  return NextResponse.json({ ok: true })
}
