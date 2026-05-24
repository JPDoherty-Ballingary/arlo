import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { nagTask } from '@/lib/nag-task'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: allActiveTasks, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('status', 'active')

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  const now = Date.now()
  const dueTasks = (allActiveTasks || []).filter((task) => {
    if (task.scheduled_start_at && new Date(task.scheduled_start_at).getTime() > now) return false
    if (!task.last_nagged_at) return true
    const nextNagAt = new Date(task.last_nagged_at).getTime() + task.frequency_hours * 3600 * 1000
    return now >= nextNagAt
  })

  const results: unknown[] = []

  for (const task of dueTasks) {
    try {
      // Abuse limit: max 3 nag emails per recipient per day per owner
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: ownerTaskIds } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('owner_id', task.owner_id)
        .eq('recipient_email', task.recipient_email)

      const taskIds = (ownerTaskIds || []).map((t: { id: string }) => t.id)

      if (taskIds.length > 0) {
        const { count: nagsToday } = await supabaseAdmin
          .from('nag_logs')
          .select('*', { count: 'exact', head: true })
          .in('task_id', taskIds)
          .gte('sent_at', todayStart.toISOString())

        if ((nagsToday || 0) >= 3) {
          results.push({ taskId: task.id, skipped: 'abuse_limit' })
          continue
        }
      }

      const result = await nagTask(task)
      results.push({ taskId: task.id, ...result })
    } catch (err) {
      results.push({ taskId: task.id, error: String(err) })
    }
  }

  return NextResponse.json({
    total_active: allActiveTasks?.length ?? 0,
    due: dueTasks.length,
    results,
  })
}
