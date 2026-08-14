export async function writeAudit(auth, entry) {
  try {
    const db = auth?.db;
    if (!db) return;
    await db.from('audit_logs').insert({
      actor_id: auth?.user?.id || '',
      actor_name: auth?.profile?.name || '',
      actor_email: auth?.user?.email || auth?.profile?.email || '',
      action: entry.action || 'update',
      module: entry.module || '',
      entity: entry.entity || '',
      entity_id: entry.entity_id != null ? String(entry.entity_id) : '',
      summary: entry.summary || '',
      details: entry.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('audit log', err);
  }
}
