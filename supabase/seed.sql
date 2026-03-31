begin;

insert into public.calls (
  id,
  external_id,
  caller_name,
  caller_phone,
  direction,
  started_at,
  ended_at,
  recording_filename,
  source_system,
  assigned_owner,
  status,
  revenue_estimate,
  currency_code
)
values
  (
    '11111111-1111-1111-1111-111111111001',
    'CR-20260328-001',
    'Adam Spencer',
    '+1 (949) 256-9004',
    'inbound',
    '2026-03-28T11:12:00Z',
    '2026-03-28T11:15:18Z',
    '2026-03-28_adam-spencer_inbound.mp3',
    'CallRail',
    'M. Patel',
    'action_required',
    250.00,
    'GBP'
  ),
  (
    '11111111-1111-1111-1111-111111111002',
    'CR-20260328-002',
    'Emily Green',
    '+1 (714) 818-0193',
    'inbound',
    '2026-03-28T14:45:00Z',
    '2026-03-28T14:49:06Z',
    '2026-03-28_emily-green_inbound.wav',
    'Dialpad',
    'R. Chen',
    'under_review',
    250.00,
    'GBP'
  ),
  (
    '11111111-1111-1111-1111-111111111003',
    'CR-20260327-003',
    'Brian Thompson',
    '+1 (657) 341-2280',
    'inbound',
    '2026-03-27T16:08:00Z',
    '2026-03-27T16:13:11Z',
    '2026-03-27_brian-thompson_inbound.m4a',
    'Aircall',
    'L. Mercer',
    'resolved',
    500.00,
    'GBP'
  ),
  (
    '11111111-1111-1111-1111-111111111004',
    'CR-20260327-004',
    'Sarah Lee',
    '+1 (310) 440-7818',
    'inbound',
    '2026-03-27T09:36:00Z',
    '2026-03-27T09:37:42Z',
    '2026-03-27_sarah-lee_voicemail.mp3',
    'Front Desk Voicemail',
    'Front Desk Ops',
    'escalated',
    200.00,
    'GBP'
  ),
  (
    '11111111-1111-1111-1111-111111111005',
    'CR-20260329-005',
    'Maria Gomez',
    '+1 (818) 555-0177',
    'inbound',
    '2026-03-29T10:22:00Z',
    '2026-03-29T10:26:34Z',
    '2026-03-29_maria-gomez_inbound.wav',
    'CallRail',
    'J. Walker',
    'action_required',
    420.00,
    'GBP'
  )
on conflict (id) do update
set
  external_id = excluded.external_id,
  caller_name = excluded.caller_name,
  caller_phone = excluded.caller_phone,
  direction = excluded.direction,
  started_at = excluded.started_at,
  ended_at = excluded.ended_at,
  recording_filename = excluded.recording_filename,
  source_system = excluded.source_system,
  assigned_owner = excluded.assigned_owner,
  status = excluded.status,
  revenue_estimate = excluded.revenue_estimate,
  currency_code = excluded.currency_code;

insert into public.transcripts (
  id,
  call_id,
  transcript_text,
  transcript_source,
  language_code,
  confidence_score,
  version
)
values
  (
    '22222222-2222-2222-2222-222222222001',
    '11111111-1111-1111-1111-111111111001',
    'Caller: Hi, this is Adam Spencer. I wanted to check whether you have an appointment available for tomorrow afternoon. Agent: I can review the schedule and have someone call you back shortly. Caller: The air conditioning has stopped working and I am ready to book if there is availability. System: Interaction closed without booking confirmation or callback log.',
    'system',
    'en',
    94.60,
    1
  ),
  (
    '22222222-2222-2222-2222-222222222002',
    '11111111-1111-1111-1111-111111111002',
    'Caller: I need to know if someone can come out today. Agent: I will route this to dispatch and someone should follow up this afternoon. Caller: I need a callback as soon as possible so I can confirm. System: No completed callback event was recorded within the configured response window.',
    'system',
    'en',
    92.10,
    1
  ),
  (
    '22222222-2222-2222-2222-222222222003',
    '11111111-1111-1111-1111-111111111003',
    'Caller: I need to schedule a system inspection this week if possible. Agent: I can capture the request and have the office confirm the exact appointment slot. Caller: Please call me back once the schedule is confirmed. System: Follow-up completed and appointment confirmed during recovery outreach.',
    'system',
    'en',
    95.20,
    1
  ),
  (
    '22222222-2222-2222-2222-222222222004',
    '11111111-1111-1111-1111-111111111004',
    'Caller voicemail: I would like to schedule an appointment as soon as possible for a heating issue at my home. Please call me back this morning if you have anything available. System: Voicemail received before operating hours with no same-day callback recorded.',
    'system',
    'en',
    90.40,
    1
  ),
  (
    '22222222-2222-2222-2222-222222222005',
    '11111111-1111-1111-1111-111111111005',
    'Caller: This is Maria Gomez. I need to book a technician because my furnace is making a loud grinding noise. Agent: I can document the issue and have the office call you back with availability. Caller: I am ready to confirm an appointment today if possible. System: No booking attempt or outbound callback was logged after the interaction.',
    'system',
    'en',
    93.70,
    1
  )
on conflict (call_id, version) do update
set
  transcript_text = excluded.transcript_text,
  transcript_source = excluded.transcript_source,
  language_code = excluded.language_code,
  confidence_score = excluded.confidence_score;

insert into public.analysis (
  id,
  call_id,
  transcript_id,
  analysis_status,
  failure_type,
  conversion_failure_detected,
  no_booking_attempt,
  no_callback_logged,
  response_sla_breach,
  lead_intent_level,
  recommended_action,
  summary,
  analyst_note,
  revenue_impact_estimate,
  resolved_at
)
values
  (
    '33333333-3333-3333-3333-333333333001',
    '11111111-1111-1111-1111-111111111001',
    '22222222-2222-2222-2222-222222222001',
    'completed',
    'unconverted_high_intent_lead',
    true,
    true,
    true,
    false,
    'high',
    'Immediate outbound follow-up required. Lead exhibited high purchase intent and requested appointment availability. No booking attempt was made during the initial interaction.',
    'Inbound caller requested next-day availability and indicated readiness to book. The interaction ended without a booking workflow or confirmed callback.',
    'Queue as action required and assign same-day follow-up ownership.',
    250.00,
    null
  ),
  (
    '33333333-3333-3333-3333-333333333002',
    '11111111-1111-1111-1111-111111111002',
    '22222222-2222-2222-2222-222222222002',
    'completed',
    'response_sla_breach',
    true,
    true,
    true,
    true,
    'high',
    'Validate callback ownership immediately. Response timing exceeded the defined service-level window and customer outreach should be completed before end of day.',
    'Same-day service request was captured, but the required callback was not completed inside the configured response SLA.',
    'Leave in under review status until callback completion is documented.',
    250.00,
    null
  ),
  (
    '33333333-3333-3333-3333-333333333003',
    '11111111-1111-1111-1111-111111111003',
    '22222222-2222-2222-2222-222222222003',
    'completed',
    'resolved_recovery_case',
    true,
    true,
    true,
    false,
    'high',
    'No further remediation required. Revenue recovery workflow has been completed and the interaction record may remain available for audit review.',
    'Originally at-risk booking was successfully reinstated through outbound remediation and the appointment has been confirmed.',
    'Resolved revenue recovery case. No additional operational action required.',
    500.00,
    '2026-03-27T17:05:00Z'
  ),
  (
    '33333333-3333-3333-3333-333333333004',
    '11111111-1111-1111-1111-111111111004',
    '22222222-2222-2222-2222-222222222004',
    'completed',
    'missed_booking_failure',
    true,
    true,
    true,
    true,
    'high',
    'Escalation required. Booking intent was communicated by voicemail and no same-day response was issued. Assign front desk ownership and schedule immediate outbound contact.',
    'Voicemail-based booking request remained without documented outreach during the same business day, creating conversion failure exposure.',
    'Escalated for front desk follow-up and same-day management review.',
    200.00,
    null
  ),
  (
    '33333333-3333-3333-3333-333333333005',
    '11111111-1111-1111-1111-111111111005',
    '22222222-2222-2222-2222-222222222005',
    'completed',
    'unconverted_high_intent_lead',
    true,
    true,
    true,
    true,
    'high',
    'Immediate outbound follow-up required within two hours. Customer expressed readiness to confirm a technician visit and no booking workflow was completed.',
    'High-intent furnace repair lead requested same-day scheduling. The interaction ended with no booking attempt and no callback logged.',
    'Prioritize for revenue recovery outreach due to elevated appointment value.',
    420.00,
    null
  )
on conflict (call_id) do update
set
  transcript_id = excluded.transcript_id,
  analysis_status = excluded.analysis_status,
  failure_type = excluded.failure_type,
  conversion_failure_detected = excluded.conversion_failure_detected,
  no_booking_attempt = excluded.no_booking_attempt,
  no_callback_logged = excluded.no_callback_logged,
  response_sla_breach = excluded.response_sla_breach,
  lead_intent_level = excluded.lead_intent_level,
  recommended_action = excluded.recommended_action,
  summary = excluded.summary,
  analyst_note = excluded.analyst_note,
  revenue_impact_estimate = excluded.revenue_impact_estimate,
  resolved_at = excluded.resolved_at;

commit;
