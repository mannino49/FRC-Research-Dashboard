alter table public.ai_outputs drop constraint if exists ai_outputs_output_type_check;

alter table public.ai_outputs add constraint ai_outputs_output_type_check
  check (
    output_type in (
      'abstract',
      'outline',
      'collaborator_suggestions',
      'project_direction',
      'status_summary',
      'next_action',
      'stalled_waiting_check',
      'followup_email',
      'progress_note',
      'metadata_audit'
    )
  );
