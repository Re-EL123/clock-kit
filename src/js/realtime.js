import { config } from './config.js';
import { createClient } from '@supabase/supabase-js';

export function subscribeAttendance(organisationId, onChange) {
  if (!config.supabaseUrl || !config.supabaseAnon) return () => {};
  const client = createClient(config.supabaseUrl, config.supabaseAnon);
  const channel = client
    .channel(`attendance:${organisationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_sessions', filter: `organisation_id=eq.${organisationId}` },
      onChange,
    )
    .subscribe();
  return () => client.removeChannel(channel);
}
