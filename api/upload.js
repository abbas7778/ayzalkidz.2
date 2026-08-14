import supabase from './db-client.js';
import { setCors, requireUser } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { fileName, fileBase64, contentType } = req.body || {};
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'fileName and fileBase64 required' });

    const safe = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safe}`;
    const buffer = Buffer.from(fileBase64, 'base64');
    const { error } = await supabase.storage
      .from('hospital-docs')
      .upload(path, buffer, { contentType: contentType || 'application/octet-stream', upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('hospital-docs').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl, path, bucket: 'hospital-docs' });
  } catch (err) {
    console.error('upload API', err);
    return res.status(500).json({ error: err.message });
  }
}
