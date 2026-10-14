// Supabase Edge Function: webhook-trigger
// Ingests external webhook events and triggers the configured agent run pipeline.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agentos-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const token = url.searchParams.get('token') || req.headers.get('x-agentos-token')

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing webhook verification token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Match schedule or webhook record by secret token
    const { data: schedule, error: schErr } = await supabase
      .from('schedules')
      .select('*, agents(*)')
      .eq('webhook_secret', token)
      .eq('is_enabled', true)
      .single()

    if (schErr || !schedule) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive webhook secret' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let payloadBody = {}
    if (req.method === 'POST') {
      try {
        payloadBody = await req.json()
      } catch {
        payloadBody = {}
      }
    }

    // Resolve latest version of target agent
    const { data: latestVersion, error: verErr } = await supabase
      .from('agent_versions')
      .select('id')
      .eq('agent_id', schedule.agent_id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (verErr || !latestVersion) {
      return new Response(
        JSON.stringify({ error: 'Agent version blueprint not found for scheduled target' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create run record
    const { data: run, error: runErr } = await supabase
      .from('runs')
      .insert({
        workspace_id: schedule.workspace_id,
        agent_id: schedule.agent_id,
        agent_version_id: latestVersion.id,
        trigger_type: 'webhook',
        status: 'queued',
        input_data: {
          webhook_payload: payloadBody,
          triggered_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (runErr || !run) {
      throw new Error(runErr?.message || 'Failed to dispatch webhook run')
    }

    // Update last run timestamp on schedule
    await supabase
      .from('schedules')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', schedule.id)

    // Append initial telemetry log
    await supabase.from('run_logs').insert({
      run_id: run.id,
      agent_node_id: 'webhook-listener',
      step_index: 0,
      level: 'info',
      message: `Triggered autonomously via Webhook [Schedule: ${schedule.cron_expression || 'Instant'}]. Run queued.`,
      metadata: { scheduleId: schedule.id },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received. Agent run dispatched.',
        run_id: run.id,
        agent_id: schedule.agent_id,
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Webhook invocation error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
