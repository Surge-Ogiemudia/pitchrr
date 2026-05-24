'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import { useSession } from 'next-auth/react';

type ProfileTab = 'founder' | 'startup' | 'traction' | 'stories' | 'facts' | 'resources';

const TRACTION_COLORS: Record<string, string> = {
  revenue: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  users: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  partnerships: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  wordOfMouth: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  milestone: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  other: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

const CORE_FIELDS = [
  'founderName', 'founderEmail', 'founderBio', 'founderLocation',
  'startupName', 'stage', 'industry', 'oneLiner', 'problem', 'solution',
  'businessModel', 'marketSize', 'uniqueness', 'mission',
];

const STORY_THEME_STYLES: Record<string, string> = {
  origin: 'text-primary bg-primary/10 border-primary/30',
  impact: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  credibility: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  customer: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
  'turning-point': 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  team: 'text-teal-300 bg-teal-500/10 border-teal-500/30',
  other: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
};

const STORY_THEME_LABELS: Record<string, string> = {
  origin: 'Why I Started',
  impact: 'Human Impact',
  credibility: 'Credibility',
  customer: 'Customer Moment',
  'turning-point': 'Turning Point',
  team: 'Team Story',
  other: 'Other',
};

function getInitials(name: string): string {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
}

function FieldCard({ label, value, field, onSave }: { label: string; value: string; field: string; onSave: (field: string, value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const handleSave = () => {
    onSave(field, draft);
    setEditing(false);
  };

  return (
    <div className="glass-card p-4 group relative">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:text-primary-light transition-all"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full bg-elevated border border-primary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-[#0A0A0F] font-semibold">Save</button>
            <button onClick={() => { setEditing(false); setDraft(value); }} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground leading-relaxed">{value || <span className="text-muted italic">Not set — tell the chat or click Edit</span>}</p>
      )}
    </div>
  );
}

function FactsTab({ facts, onSave, onDelete }: {
  facts: { key: string; value: string }[];
  onSave: (field: string, value: string) => void;
  onDelete: (key: string) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const startEdit = (key: string, value: string) => {
    setEditingKey(key);
    setDraftKey(key);
    setDraftValue(value);
  };

  const commitEdit = (originalKey: string) => {
    const k = draftKey.trim();
    const v = draftValue.trim();
    if (!k || !v) return;
    if (k !== originalKey) onDelete(originalKey);
    onSave(k, v);
    setEditingKey(null);
  };

  const commitNew = () => {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k || !v) return;
    onSave(k, v);
    setNewKey('');
    setNewValue('');
    setAddingNew(false);
  };

  return (
    <div className="space-y-2">
      {facts.length > 0 ? (
        facts.map((field) => (
          <div key={field.key} className="glass-card p-4 group">
            {editingKey === field.key ? (
              <div className="space-y-2">
                <input
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="Key"
                  className="w-full bg-elevated border border-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-primary focus:outline-none"
                />
                <textarea
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  rows={2}
                  className="w-full bg-elevated border border-primary rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => commitEdit(field.key)} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-[#0A0A0F] font-semibold">Save</button>
                  <button onClick={() => setEditingKey(null)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider w-32 flex-shrink-0 pt-0.5 break-all">{field.key}</span>
                <p className="text-sm text-foreground leading-relaxed flex-1">{field.value}</p>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0 transition-all">
                  <button onClick={() => startEdit(field.key, field.value)} className="text-xs text-muted hover:text-primary px-1.5 py-0.5 rounded">Edit</button>
                  <button onClick={() => onDelete(field.key)} className="text-xs text-muted hover:text-red-400 px-1.5 py-0.5 rounded">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="glass-card p-6 text-center">
          <p className="text-muted text-sm italic">No facts yet.</p>
          <p className="text-muted text-xs mt-1">Facts appear here automatically as you draft and chat. You can also add them manually below.</p>
        </div>
      )}

      {addingNew ? (
        <div className="glass-card p-4 space-y-2 border border-primary/30">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key (e.g. awards, incorporation_date)"
            className="w-full bg-elevated border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground"
          />
          <textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
            rows={2}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex gap-2">
            <button onClick={commitNew} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-[#0A0A0F] font-semibold">Add</button>
            <button onClick={() => { setAddingNew(false); setNewKey(''); setNewValue(''); }} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
        >
          + Add a fact manually
        </button>
      )}
    </div>
  );
}

function StoriesTab({ stories, writingVoice, onSaveField, onSaveStory, onDeleteStory }: {
  stories: { title: string; content: string; theme: string }[];
  writingVoice: string;
  onSaveField: (field: string, value: string) => void;
  onSaveStory: (story: { title: string; content: string; theme: string }) => void;
  onDeleteStory: (title: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTheme, setNewTheme] = useState('origin');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const commit = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    onSaveStory({ title: newTitle.trim(), content: newContent.trim(), theme: newTheme });
    setNewTitle(''); setNewContent(''); setNewTheme('origin'); setAdding(false);
  };

  return (
    <div className="space-y-3">
      <FieldCard label="Writing Voice" field="writingVoice" value={writingVoice} onSave={onSaveField} />
      <p className="text-xs text-muted px-1">Describe how you naturally communicate — direct vs. warm, data-first vs. story-first, what you avoid, your sentence rhythm. The AI will match this in every draft.</p>

      <div className="flex items-center justify-between px-1 pt-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Stories</p>
        <span className="text-xs text-subtle">{stories.length} saved — tell the chat to add more</span>
      </div>

      {stories.length === 0 ? (
        <div className="glass-card p-5 text-center">
          <p className="text-sm text-muted italic">No stories yet.</p>
          <p className="text-xs text-muted mt-1">Tell the profile chat "here's why I started..." or "there was this moment when..." and it will save it automatically. Or add one manually below.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stories.map((story, i) => (
            <div key={i} className="glass-card p-4 group">
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${STORY_THEME_STYLES[story.theme] || STORY_THEME_STYLES.other}`}>
                      {STORY_THEME_LABELS[story.theme] || story.theme}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{story.title}</p>
                  {expandedIdx !== i && (
                    <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{story.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteStory(story.title); }}
                    className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-danger transition-all"
                  >
                    Delete
                  </button>
                  <svg className={`w-3.5 h-3.5 text-muted flex-none transition-transform ${expandedIdx === i ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {expandedIdx === i && (
                <p className="text-sm text-foreground leading-relaxed mt-3 pt-3 border-t border-border whitespace-pre-wrap">{story.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="glass-card p-4 space-y-3 border border-primary/30">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder='Story title, e.g. "The moment I knew this was real"'
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
          <select
            value={newTheme}
            onChange={e => setNewTheme(e.target.value)}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            {Object.entries(STORY_THEME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Tell the story in full. The more detail the better — the AI uses this verbatim in applications."
            rows={5}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none leading-relaxed"
          />
          <div className="flex gap-2">
            <button onClick={commit} disabled={!newTitle.trim() || !newContent.trim()} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-[#0A0A0F] font-semibold disabled:opacity-40">Save Story</button>
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewContent(''); setNewTheme('origin'); }} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
        >
          + Add a story manually
        </button>
      )}
    </div>
  );
}

function ResourcesTab({ resources, fetchProfile }: { resources: any[], fetchProfile: () => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('pitch-deck');
  const [format, setFormat] = useState('pdf');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !type || !format) return;
    if (format !== 'link' && format !== 'youtube' && !file) return;
    if ((format === 'link' || format === 'youtube') && !url) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('format', format);
      if (file) formData.append('file', file);
      if (url) formData.append('url', url);

      const res = await fetch('/api/profile/resources', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setAdding(false);
        setTitle('');
        setFile(null);
        setUrl('');
        fetchProfile();
      } else {
        alert('Failed to save resource.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while saving.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await fetch('/api/profile/resources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    'pitch-deck': 'Pitch Deck',
    'cv': 'CV / Resume',
    'intro-video': 'Intro Video',
    'product-demo': 'Product Demo',
    'executive-summary': 'Executive Summary',
    'financial-model': 'Financial Model',
    'other': 'Other',
  };

  return (
    <div className="space-y-3">
      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Master Resources</p>
        <p className="text-xs text-muted leading-relaxed">Upload your core Pitch Deck, CVs, and Intro Videos here. The AI will extract the text from PDFs and YouTube links to learn deeply about your startup, making your future applications even better. Other formats (DOCX, PPT) are safely stored for future reference.</p>
      </div>

      {resources.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-muted text-sm italic">No resources added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r: any, i: number) => (
            <div key={i} className="glass-card p-4 group flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                {r.format === 'pdf' ? '📄' : r.format === 'youtube' ? '🎥' : r.format === 'link' ? '🔗' : '📎'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                  <button onClick={() => handleDelete(r._id)} className="opacity-0 group-hover:opacity-100 text-xs text-danger hover:text-red-400 transition-opacity ml-2">Delete</button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted bg-elevated px-2 py-0.5 rounded-full">{TYPE_LABELS[r.type] || r.type}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted bg-elevated px-2 py-0.5 rounded-full">{r.format}</span>
                  {r.extractedContext && r.extractedContext.length > 0 && r.format === 'pdf' && (
                     <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">AI Parsed</span>
                  )}
                </div>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block truncate max-w-full">
                  {r.url}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="glass-card p-4 space-y-3 border border-primary/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Seed Deck v2"
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Resource Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {Object.entries(TYPE_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Format</label>
             <div className="flex gap-2 flex-wrap">
               {['pdf', 'docx', 'ppt', 'youtube', 'link'].map(f => (
                 <button
                   key={f}
                   onClick={() => { setFormat(f); setFile(null); setUrl(''); }}
                   className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${format === f ? 'bg-primary text-[#0A0A0F] border-primary font-bold' : 'bg-elevated text-muted border-border hover:border-primary/50'}`}
                 >
                   {f.toUpperCase()}
                 </button>
               ))}
             </div>
          </div>

          {(format === 'link' || format === 'youtube') ? (
            <div>
               <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">URL</label>
               <input
                 value={url}
                 onChange={e => setUrl(e.target.value)}
                 placeholder="https://..."
                 className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
               />
            </div>
          ) : (
            <div>
               <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">File Upload</label>
               <input
                 type="file"
                 accept={format === 'pdf' ? '.pdf' : format === 'docx' ? '.docx' : format === 'ppt' ? '.ppt,.pptx' : undefined}
                 onChange={e => setFile(e.target.files?.[0] || null)}
                 className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
               />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button 
              onClick={handleSubmit} 
              disabled={uploading || !title || (!file && !url)} 
              className="text-xs px-4 py-2 rounded-lg bg-primary text-[#0A0A0F] font-semibold disabled:opacity-40"
            >
              {uploading ? 'Uploading...' : 'Save Resource'}
            </button>
            <button onClick={() => { setAdding(false); setFile(null); setUrl(''); }} disabled={uploading} className="text-xs px-4 py-2 rounded-lg border border-border text-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:text-foreground hover:border-primary/50 transition-colors"
        >
          + Add new resource
        </button>
      )}
    </div>
  );
}

const getMessageText = (m: any) =>
  (m.parts as any[])
    ?.filter((p: any) => p.type === 'text')
    .map((p: any) => p.text as string)
    .join('') ?? '';

export default function ProfilePage() {
  const { data: session } = useSession();
  const isCareer = session?.user?.persona === 'career';
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('founder');
  const [inputValue, setInputValue] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const overlayMessagesEndRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async (isInitial = false) => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(true); }, []); // eslint-disable-line

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setShowHint(true), 1200);
      return () => clearTimeout(t);
    }
  }, [loading]);


  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { mode: 'profile' },
    }),
    messages: [
      {
        id: '1',
        role: 'assistant',
        parts: [{ type: 'text', text: isCareer ? `I'm your profile brain. Tell me anything — your email, latest experience, career goals, past achievements. I'll save it all so every new job application autofills from here.` : `I'm your profile brain. Tell me anything — your email, phone, latest traction, team updates, startup name, stage, anything. I'll save it all so every new application autofills from here.` }],
      }
    ],
    onError: (err) => alert('Chat Error: ' + err.message),
    onFinish: () => { fetchProfile(); },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    overlayMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isActive = status === 'submitted' || status === 'streaming';

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isActive) return;
    setInputValue('');
    sendMessage({ text: trimmed });
  };

  const handleFieldSave = async (field: string, value: string) => {
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      await fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFactDelete = async (key: string) => {
    try {
      await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      await fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // Completeness score
  const filledCount = profileData
    ? CORE_FIELDS.filter((f) => profileData[f]?.value?.trim()).length
      + (profileData.traction?.length > 0 ? 1 : 0)
      + (profileData.writingVoice?.value?.trim() ? 1 : 0)
      + (profileData.stories?.length > 0 ? 1 : 0)
    : 0;
  const totalFields = CORE_FIELDS.length + 3;
  const completenessPercent = Math.round((filledCount / totalFields) * 100);

  const founderName = profileData?.founderName?.value;
  const initials = founderName ? getInitials(founderName) : '?';

  const handleSaveStory = async (story: { title: string; content: string; theme: string }) => {
    try {
      await fetch('/api/profile/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story),
      });
      await fetchProfile();
    } catch (err) { console.error(err); }
  };

  const handleDeleteStory = async (title: string) => {
    try {
      await fetch('/api/profile/stories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      await fetchProfile();
    } catch (err) { console.error(err); }
  };

  const tabs: { key: ProfileTab; label: string; count?: number }[] = [
    { key: 'founder', label: isCareer ? 'Candidate' : 'Founder' },
    { key: 'startup', label: isCareer ? 'Experience' : 'Startup' },
    { key: 'traction', label: isCareer ? 'Achievements' : 'Traction', count: profileData?.traction?.length || 0 },
    { key: 'stories', label: 'Stories', count: profileData?.stories?.length || 0 },
    { key: 'resources', label: 'Resources', count: profileData?.resources?.length || 0 },
    { key: 'facts', label: 'Facts', count: profileData?.dynamicFields?.length || 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:h-screen lg:overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-6 lg:overflow-hidden">
        {/* Profile Column — full width on mobile, 42% on desktop */}
        <div className="w-full lg:w-[42%] flex flex-col gap-4 overflow-y-auto pb-28 lg:pb-8 pr-0 lg:pr-2">
          {loading ? (
            <div className="text-center text-muted py-10">Loading profile...</div>
          ) : (
            <>
              {/* Completeness bar */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Profile Completeness</span>
                  <span className="text-xs font-bold text-primary">{completenessPercent}%</span>
                </div>
                <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                    style={{ width: `${completenessPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2">{filledCount} of {totalFields} fields set — use the chat to fill gaps</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-elevated/50 p-1 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 text-xs font-semibold px-2 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      activeTab === tab.key ? 'bg-primary text-[#0A0A0F]' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-[#0A0A0F]/20' : 'bg-primary/20 text-primary'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* FOUNDER TAB */}
              {activeTab === 'founder' && (
                <div className="space-y-3">
                  {/* Avatar + identity */}
                  <div className="glass-card p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-[#0A0A0F] font-bold text-xl flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground font-bold text-base truncate">{founderName || <span className="text-muted italic font-normal text-sm">Name not set</span>}</p>
                      <p className="text-xs text-muted mt-0.5">{profileData?.founderLocation?.value || 'Location not set'}</p>
                    </div>
                  </div>

                  {/* Contact chips */}
                  <div className="glass-card p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Contact Info</p>
                    {[
                      { field: 'founderEmail', label: 'Email', icon: '✉' },
                      { field: 'founderPhone', label: 'Phone', icon: '📱' },
                      { field: 'founderLinkedIn', label: 'LinkedIn', icon: '🔗' },
                    ].map(({ field, label, icon }) => (
                      <div key={field} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-sm w-5">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted block">{label}</span>
                          <span className="text-sm text-foreground truncate block">{profileData?.[field]?.value || <span className="text-muted italic">Not set</span>}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <FieldCard label="Founder Bio" field="founderBio" value={profileData?.founderBio?.value || ''} onSave={handleFieldSave} />

                  {/* Team */}
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">{isCareer ? 'References / Teammates' : 'Team Members'}</p>
                    {profileData?.team?.length > 0 ? (
                      <div className="space-y-2">
                        {profileData.team.map((member: any, i: number) => (
                          <div key={i} className="glass-card p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {getInitials(member.name)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{member.name}</p>
                                <p className="text-xs text-muted">{member.role || 'Founder'}</p>
                              </div>
                            </div>
                            {member.background && <p className="text-xs text-foreground/80 leading-relaxed mt-2">{member.background}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="glass-card p-4 text-center text-sm text-muted italic">Tell the chat about your team to add members</div>
                    )}
                  </div>
                </div>
              )}

              {/* STARTUP TAB */}
              {activeTab === 'startup' && (
                <div className="space-y-3">
                  {/* Header card */}
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-lg font-bold text-foreground">{profileData?.startupName?.value || <span className="text-muted italic font-normal text-base">{isCareer ? 'Current Role not set' : 'Startup name not set'}</span>}</p>
                      <div className="flex gap-2 flex-wrap">
                        {profileData?.stage?.value && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">{profileData.stage.value}</span>
                        )}
                        {profileData?.industry?.value && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">{profileData.industry.value}</span>
                        )}
                      </div>
                    </div>
                    {profileData?.website?.value && (
                      <p className="text-xs text-muted mt-2">{profileData.website.value}</p>
                    )}
                    {profileData?.oneLiner?.value && (
                      <p className="text-sm text-foreground/80 mt-3 leading-relaxed border-t border-border pt-3">{profileData.oneLiner.value}</p>
                    )}
                  </div>

                  {[
                    { field: 'startupName', label: isCareer ? 'Current Headline' : 'Startup Name' },
                    { field: 'stage', label: isCareer ? 'Experience Level' : 'Stage' },
                    { field: 'industry', label: isCareer ? 'Target Industry' : 'Industry' },
                    { field: 'website', label: isCareer ? 'Portfolio / Website' : 'Website' },
                    { field: 'oneLiner', label: isCareer ? 'Elevator Pitch' : 'One Liner' },
                    { field: 'problem', label: isCareer ? 'Core Skills' : 'Problem Statement' },
                    { field: 'solution', label: isCareer ? 'Certifications / Degrees' : 'Solution' },
                    { field: 'businessModel', label: isCareer ? 'Career Goal' : 'Business Model' },
                    { field: 'marketSize', label: isCareer ? 'Target Salary' : 'Market Size / Target' },
                    { field: 'uniqueness', label: isCareer ? 'Unique Value Proposition' : 'Uniqueness / Moat' },
                    { field: 'mission', label: isCareer ? 'Personal Mission' : 'Mission / Vision' },
                    { field: 'useOfFunds', label: isCareer ? 'Availability' : 'Use of Funds' },
                  ].map(({ field, label }) => (
                    <FieldCard key={field} label={label} field={field} value={profileData?.[field]?.value || ''} onSave={handleFieldSave} />
                  ))}
                </div>
              )}

              {/* TRACTION TAB */}
              {activeTab === 'traction' && (
                <div className="space-y-3">
                  {profileData?.traction?.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(profileData.traction.map((t: any) => t.type))).map((type: any) => (
                          <span key={type} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TRACTION_COLORS[type]}`}>
                            {type}
                          </span>
                        ))}
                      </div>
                      {profileData.traction.map((tr: any, i: number) => (
                        <div key={i} className="glass-card p-4 flex gap-3 items-start">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 mt-0.5 ${TRACTION_COLORS[tr.type]}`}>{tr.type}</span>
                          <p className="text-sm text-foreground leading-relaxed">{tr.description}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="glass-card p-6 text-center">
                      <p className="text-muted text-sm italic">No traction signals yet.</p>
                      <p className="text-muted text-xs mt-1">Tell the chat about your revenue, users, partnerships, or milestones.</p>
                    </div>
                  )}
                </div>
              )}

              {/* STORIES TAB */}
              {activeTab === 'stories' && (
                <StoriesTab
                  stories={profileData?.stories || []}
                  writingVoice={profileData?.writingVoice?.value || ''}
                  onSaveField={handleFieldSave}
                  onSaveStory={handleSaveStory}
                  onDeleteStory={handleDeleteStory}
                />
              )}

              {/* RESOURCES TAB */}
              {activeTab === 'resources' && (
                <ResourcesTab
                  resources={profileData?.resources || []}
                  fetchProfile={fetchProfile}
                />
              )}

              {/* FACTS TAB */}
              {activeTab === 'facts' && (
                <FactsTab
                  facts={profileData?.dynamicFields || []}
                  onSave={handleFieldSave}
                  onDelete={handleFactDelete}
                />
              )}

              <p className="text-xs text-muted text-center mt-2 px-2">
                This profile is shared with Preparr and auto-populates every new application.
              </p>
            </>
          )}
        </div>

        {/* Right Column — Chat (desktop only) */}
        <div className="hidden lg:flex flex-1 flex-col glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Profile Chat</p>
            <p className="text-xs text-muted">Update anything — email, traction, team, stage, all of it</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${(m.role as string) === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 ${(m.role as string) === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown>{getMessageText(m)}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="chat-message-assistant px-4 py-3 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border bg-surface">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="My email is... / We just hit 500 users... / Update my one liner to..."
                disabled={isActive}
                className="flex-1 bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isActive || !inputValue.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isActive ? '...' : 'Update'}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Floating chat FAB — mobile only */}
      {!chatOpen && (
        <div className="fixed bottom-6 right-5 z-40 lg:hidden flex flex-col items-end gap-2">
          {showHint && (
            <div className="bg-surface border border-border/80 rounded-2xl px-3 py-2.5 text-xs text-foreground shadow-xl max-w-[160px] text-center animate-fade-in-up leading-relaxed">
              Update your profile via chat
            </div>
          )}
          <button
            onClick={() => { setChatOpen(true); setShowHint(false); }}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/40 flex items-center justify-center text-[#0A0A0F] hover:shadow-xl hover:shadow-primary/50 transition-all active:scale-95 animate-pulse-glow"
            title="Profile Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Full-screen chat overlay — mobile only */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-slide-up lg:hidden">
          <div className="border-b border-border bg-surface/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <p className="text-base font-semibold text-foreground">Profile Chat</p>
              <p className="text-xs text-muted">Update anything — email, traction, team, stage</p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-elevated transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${(m.role as string) === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 ${(m.role as string) === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed text-sm">
                    <ReactMarkdown>{getMessageText(m)}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="chat-message-assistant px-4 py-3 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                </div>
              </div>
            )}
            <div ref={overlayMessagesEndRef} />
          </div>

          <div className="p-4 border-t border-border bg-surface shrink-0">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="My email is... / We just hit 500 users..."
                disabled={isActive}
                className="flex-1 bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isActive || !inputValue.trim()}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
              >
                {isActive ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
