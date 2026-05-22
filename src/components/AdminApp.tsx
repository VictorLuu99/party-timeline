import { useEffect, useState } from 'react';

interface Party { id: number; date: string; type: string; title: string; description?: string|null; location?: string|null; crew?: string|null; epicLevel: number; isSpecial: boolean }

export default function AdminApp() {
  const [list, setList] = useState<Party[]>([]);
  const [editing, setEditing] = useState<Partial<Party> | null>(null);

  async function load() {
    const r = await fetch('/api/parties'); setList(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const method = editing.id ? 'PATCH' : 'POST';
    const url = editing.id ? `/api/parties/${editing.id}` : '/api/parties';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setEditing(null); load();
  }

  async function del(id: number) {
    if (!confirm('Xoá?')) return;
    await fetch(`/api/parties/${id}`, { method: 'DELETE' });
    load();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.href = '/admin/login';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-ink">
      <header className="flex justify-between items-center mb-4">
        <h1 className="font-display text-3xl text-neon-pink">ADMIN</h1>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ date: new Date().toISOString().slice(0,10), type: 'bia', title: '', epicLevel: 3, isSpecial: false })} className="px-3 py-1 bg-neon-yellow text-bg-deep rounded">+ New</button>
          <button onClick={logout} className="px-3 py-1 border border-ink/30 rounded">Logout</button>
        </div>
      </header>

      <table className="w-full text-sm">
        <thead><tr className="text-left border-b border-ink/20"><th>Date</th><th>Type</th><th>Title</th><th>Crew</th><th></th></tr></thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id} className="border-b border-ink/10">
              <td>{p.date}</td><td>{p.type}</td><td>{p.title}</td><td>{p.crew ?? ''}</td>
              <td className="text-right">
                <button onClick={() => setEditing(p)} className="text-neon-cyan mr-2">edit</button>
                <button onClick={() => del(p.id)} className="text-red-400">del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <form onSubmit={save} className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bg-deep border border-ink/20 rounded-xl max-w-md w-full p-4 space-y-2 my-8">
            <h2 className="font-display text-xl">{editing.id ? 'Edit' : 'New'}</h2>
            <input type="date" required value={editing.date ?? ''} onChange={e => setEditing({...editing, date: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <select value={editing.type ?? 'bia'} onChange={e => setEditing({...editing, type: e.target.value})} className="w-full p-2 bg-black/40 rounded">
              <option value="bia">bia</option><option value="ruou">ruou</option><option value="bia_ruou">bia+ruou</option><option value="coca">coca</option><option value="voi">voi</option><option value="other">other</option>
            </select>
            <input required placeholder="Title" value={editing.title ?? ''} onChange={e => setEditing({...editing, title: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <input placeholder="Location" value={editing.location ?? ''} onChange={e => setEditing({...editing, location: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <input placeholder="Crew" value={editing.crew ?? ''} onChange={e => setEditing({...editing, crew: e.target.value})} className="w-full p-2 bg-black/40 rounded" />
            <label className="flex items-center gap-2"><input type="range" min={1} max={5} value={editing.epicLevel ?? 3} onChange={e => setEditing({...editing, epicLevel: Number(e.target.value)})} /> Epic {editing.epicLevel ?? 3}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!editing.isSpecial} onChange={e => setEditing({...editing, isSpecial: e.target.checked})} /> Đặc biệt</label>
            {editing.id && <PhotoUploader partyId={editing.id} />}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 border border-ink/30 rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 bg-neon-pink text-bg-deep rounded">Save</button>
            </div>
            {!editing.id && <p className="text-xs text-ink/50">Photos can be added after saving.</p>}
          </div>
        </form>
      )}
    </div>
  );
}

function PhotoUploader({ partyId }: { partyId: number }) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setMsg(null);
    try {
      for (const file of Array.from(files)) {
        const sig = await fetch(`/api/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        }).then(r => r.json()) as { url: string; key: string };
        const put = await fetch(sig.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!put.ok) throw new Error('R2 upload failed');
        const attach = await fetch(`/api/parties/${partyId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ r2Key: sig.key }),
        });
        if (!attach.ok) throw new Error('attach failed');
      }
      setMsg(`✓ Uploaded ${files.length} file(s)`);
    } catch (e: any) {
      setMsg(`✗ ${e.message ?? 'error'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-ink/10 pt-2 mt-2">
      <label className="text-xs text-ink/60 block mb-1">Photos</label>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={uploading}
        onChange={(e) => onFiles(e.target.files)}
        className="text-xs"
      />
      {uploading && <p className="text-xs text-neon-cyan mt-1">Uploading...</p>}
      {msg && <p className="text-xs text-ink/70 mt-1">{msg}</p>}
    </div>
  );
}
