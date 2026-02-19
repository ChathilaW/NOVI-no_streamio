import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const STALE_THRESHOLD_SECS = 10

/** GET /api/meeting/[id]/distraction → { distractedCount, totalCount, participants[] } */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const staleTime = new Date(Date.now() - STALE_THRESHOLD_SECS * 1000).toISOString()

  const { data, error } = await supabase
    .from('meeting_distraction')
    .select('*')
    .eq('meeting_id', id)
    .gt('last_seen', staleTime)

  if (error) {
    console.error('[distraction GET]', error)
    return NextResponse.json({ distractedCount: 0, totalCount: 0, participants: [] })
  }

  let distractedCount = 0
  let totalCount = 0
  const participants = (data ?? []).map((row) => {
    const distractionPct =
      row.total_checks > 0
        ? Math.round((row.distracted_checks / row.total_checks) * 100)
        : 0

    if (row.status === 'FOCUSED' || row.status === 'DISTRACTED') {
      totalCount++
      if (row.status === 'DISTRACTED') distractedCount++
    }

    return {
      participantId: row.participant_id,
      name: row.name,
      totalChecks: row.total_checks,
      distractedChecks: row.distracted_checks,
      distractionPct,
      peakDistractionPct: row.peak_distraction_pct,
      peakDistractionTime: row.peak_distraction_time
        ? new Date(row.peak_distraction_time).getTime()
        : 0,
    }
  })

  return NextResponse.json({ distractedCount, totalCount, participants })
}

/** POST /api/meeting/[id]/distraction — client sends full snapshot */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as {
    participantId: string
    name: string
    status: string
    totalChecks: number
    distractedChecks: number
    peakDistractionPct: number
    peakDistractionTime: number
  }

  const { error } = await supabase
    .from('meeting_distraction')
    .upsert({
      meeting_id: id,
      participant_id: body.participantId,
      name: body.name,
      status: body.status,
      total_checks: body.totalChecks ?? 0,
      distracted_checks: body.distractedChecks ?? 0,
      peak_distraction_pct: body.peakDistractionPct ?? 0,
      peak_distraction_time: body.peakDistractionTime
        ? new Date(body.peakDistractionTime).toISOString()
        : null,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'meeting_id,participant_id' })

  if (error) console.error('[distraction POST]', error)
  return NextResponse.json({ ok: true })
}

/** DELETE /api/meeting/[id]/distraction?participantId=xxx */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const participantId = req.nextUrl.searchParams.get('participantId')

  if (participantId) {
    const { error } = await supabase
      .from('meeting_distraction')
      .delete()
      .eq('meeting_id', id)
      .eq('participant_id', participantId)

    if (error) console.error('[distraction DELETE]', error)
  }

  return NextResponse.json({ ok: true })
}
