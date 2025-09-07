import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { randomUUID } from "crypto"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get user's current organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_org_id')
      .eq('id', session.user.id)
      .single()

    if (!profile?.current_org_id) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 })
    }

    // Get the change and verify it belongs to user's organization
    const { data: change, error: changeError } = await supabase
      .from('rescan_changes')
      .select(`
        id,
        status,
        change_type,
        event_name,
        old_data,
        new_data,
        rescan_jobs!inner(id, org_id, repo_id)
      `)
      .eq('id', id)
      .eq('rescan_jobs.org_id', profile.current_org_id)
      .single()

    if (changeError || !change) {
      return NextResponse.json({ error: "Change not found or access denied" }, { status: 404 })
    }

    if (change.status !== 'pending') {
      return NextResponse.json({ error: "Change is not in pending status" }, { status: 400 })
    }

    // Apply the change based on its type
    let eventId: string | null = null

    switch (change.change_type) {
      case 'new_event':
        // Create new event
        const { data: newEvent, error: newEventError } = await supabase
          .from('user_events')
          .insert({
            id: randomUUID(),
            event_name: change.new_data.name,
            context: change.new_data.description || change.new_data.context,
            file_path: change.new_data.file_path,
            line_number: change.new_data.line_number,
            repo_id: change.rescan_jobs.repo_id,
            rescan_job_id: change.rescan_jobs.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (newEventError) {
          console.error('Error creating new event:', newEventError)
          return NextResponse.json({ error: "Failed to create new event" }, { status: 500 })
        }
        eventId = newEvent.id
        break

      case 'updated_event':
        // Find existing event and update it
        const { data: existingEvent } = await supabase
          .from('user_events')
          .select('id')
          .eq('event_name', change.event_name)
          .eq('repo_id', change.rescan_jobs.repo_id)
          .single()

        if (existingEvent) {
          const { error: updateError } = await supabase
            .from('user_events')
            .update({
              context: change.new_data.description || change.new_data.context,
              file_path: change.new_data.file_path,
              line_number: change.new_data.line_number,
              rescan_job_id: change.rescan_jobs.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEvent.id)

          if (updateError) {
            console.error('Error updating event:', updateError)
            return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
          }
          eventId = existingEvent.id
        } else {
          // If event doesn't exist, create it as new
          const { data: newEvent, error: newEventError } = await supabase
            .from('user_events')
            .insert({
              id: randomUUID(),
              event_name: change.new_data.name,
              context: change.new_data.description || change.new_data.context,
              file_path: change.new_data.file_path,
              line_number: change.new_data.line_number,
              repo_id: change.rescan_jobs.repo_id,
              rescan_job_id: change.rescan_jobs.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single()

          if (newEventError) {
            console.error('Error creating event from update:', newEventError)
            return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
          }
          eventId = newEvent.id
        }
        break

      case 'removed_event':
        // Mark event as removed or delete it
        const { data: eventToRemove } = await supabase
          .from('user_events')
          .select('id')
          .eq('event_name', change.event_name)
          .eq('repo_id', change.rescan_jobs.repo_id)
          .single()

        if (eventToRemove) {
          // For now, we'll delete the event. In a production system, you might want to mark it as removed instead
          const { error: deleteError } = await supabase
            .from('user_events')
            .delete()
            .eq('id', eventToRemove.id)

          if (deleteError) {
            console.error('Error removing event:', deleteError)
            return NextResponse.json({ error: "Failed to remove event" }, { status: 500 })
          }
        }
        break
    }

    // Update the change status to approved
    const { error: updateError } = await supabase
      .from('rescan_changes')
      .update({
        status: 'approved',
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating change status:', updateError)
      return NextResponse.json({ error: "Failed to approve change" }, { status: 500 })
    }

    console.log(`Change ${id} approved and applied by user ${session.user.id}`)

    return NextResponse.json({ 
      message: "Change approved and applied successfully",
      changeId: id,
      eventId: eventId
    })
  } catch (error) {
    console.error('Error in approve change endpoint:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
