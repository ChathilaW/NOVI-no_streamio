import { NextRequest, NextResponse } from 'next/server'

interface DistractionEntry {
  participantId: string
  status: 'FOCUSED' | 'DISTRACTED' | 'NO FACE' | 'ERROR'
  lastSeen: number
}

/** In-memory store: meetingId → Map<participantId, DistractionEntry> */
const meetingDistraction = new Map<string, Map<string, DistractionEntry>>()

const STALE_THRESHOLD_MS = 10_000

function getRoom(meetingId: string): Map<string, DistractionEntry> {
  if (!meetingDistraction.has(meetingId)) {
    meetingDistraction.set(meetingId, new Map())
  }
  return meetingDistraction.get(meetingId)!
}

function pruneStale(room: Map<string, DistractionEntry>) {
  const now = Date.now()
  for (const [id, entry] of room.entries()) {
    if (now - entry.lastSeen > STALE_THRESHOLD_MS) {
      room.delete(id)
    }
  }
}

/**
 * GET /api/meeting/[id]/distraction
 * Returns { distractedCount, totalCount }
 * Only FOCUSED and DISTRACTED statuses count toward totalCount.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const room = getRoom(id)
  pruneStale(room)

  let distractedCount = 0
  let totalCount = 0

  for (const entry of room.values()) {
    if (entry.status === 'FOCUSED' || entry.status === 'DISTRACTED') {
      totalCount++
      if (entry.status === 'DISTRACTED') distractedCount++
    }
  }

  return NextResponse.json({ distractedCount, totalCount })
}

/**
 * POST /api/meeting/[id]/distraction
 * Body: { participantId, status }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as { participantId: string; status: DistractionEntry['status'] }
  const room = getRoom(id)
  room.set(body.participantId, {
    participantId: body.participantId,
    status: body.status,
    lastSeen: Date.now(),
  })
  pruneStale(room)
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/meeting/[id]/distraction?participantId=xxx
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const participantId = req.nextUrl.searchParams.get('participantId')
  if (participantId) getRoom(id).delete(participantId)
  return NextResponse.json({ ok: true })
}
