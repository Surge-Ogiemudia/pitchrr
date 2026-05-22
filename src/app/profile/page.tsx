'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';

type ProfileTab = 'founder' | 'startup' | 'traction' | 'facts';

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

const getMessageText = (m: any) =>
  (m.parts as any[])
    ?.filter((p: any) => p.type === 'text')
    .map((p: any) => p.text as string)
    .join('') ?? '';

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('founder');
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { mode: 'profile' },
    }),
    messages: [
      {
        id: '1',
        role: 'assistant',
        parts: [{ type: 'text', text: `I'm your profile brain. Tell me anything — your email, phone, latest traction, team updates, startup name, stage, anything. I'll save it all so every new application autofills from here.` }],
      }
    ],
    onError: (err) => alert('Chat Error: ' + err.message),
    onFinish: () => { fetchProfile(); },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    ? CORE_FIELDS.filter((f) => profileData[f]?.value?.trim()).length + (profileData.traction?.length > 0 ? 1 : 0)
    : 0;
  const totalFields = CORE_FIELDS.length + 1;
  const completenessPercent = Math.round((filledCount / totalFields) * 100);

  const founderName = profileData?.founderName?.value;
  const initials = founderName ? getInitials(founderName) : '?';

  const tabs: { key: ProfileTab; label: string; count?: number }[] = [
    { key: 'founder', label: 'Founder' },
    { key: 'startup', label: 'Startup' },
    { key: 'traction', label: 'Traction', count: profileData?.traction?.length || 0 },
    { key: 'facts', label: 'Facts', count: profileData?.dynamicFields?.length || 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-6 overflow-hidden">
        {/* Left Column — Visual Profile */}
        <div className="w-[42%] flex flex-col gap-4 overflow-y-auto pr-2 pb-8">
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
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">Team Members</p>
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
                      <p className="text-lg font-bold text-foreground">{profileData?.startupName?.value || <span className="text-muted italic font-normal text-base">Startup name not set</span>}</p>
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
                    { field: 'startupName', label: 'Startup Name' },
                    { field: 'stage', label: 'Stage' },
                    { field: 'industry', label: 'Industry' },
                    { field: 'website', label: 'Website' },
                    { field: 'oneLiner', label: 'One Liner' },
                    { field: 'problem', label: 'Problem Statement' },
                    { field: 'solution', label: 'Solution' },
                    { field: 'businessModel', label: 'Business Model' },
                    { field: 'marketSize', label: 'Market Size / Target' },
                    { field: 'uniqueness', label: 'Uniqueness / Moat' },
                    { field: 'mission', label: 'Mission / Vision' },
                    { field: 'useOfFunds', label: 'Use of Funds' },
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

        {/* Right Column — Chat */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden">
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
    </div>
  );
}
