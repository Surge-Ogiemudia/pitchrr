'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';

const getMessageText = (m: any) =>
  (m.parts as any[])
    ?.filter((p: any) => p.type === 'text')
    .map((p: any) => p.text as string)
    .join('') ?? '';

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'founder' | 'startup'>('founder');
  const [inputValue, setInputValue] = useState('');

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

  useEffect(() => {
    fetchProfile(true);
  }, []); // eslint-disable-line

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { mode: 'profile' },
    }),
    messages: [
      {
        id: '1',
        role: 'assistant',
        parts: [{ type: 'text', text: `I'm tracking your founder profile across all opportunities. What's new? Any recent traction, new team members, or evolved thinking on your business model?` }],
      }
    ],
    onError: (err) => alert('Chat Error: ' + err.message),
    onFinish: () => {
      fetchProfile();
    },
  });

  const isActive = status === 'submitted' || status === 'streaming';

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isActive) return;
    setInputValue('');
    sendMessage({ text: trimmed });
  };

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-6 overflow-hidden">
        {/* Left Column - Current Profile Summary */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 pb-8">
          {loading ? (
            <div className="text-center text-muted py-10">Loading profile...</div>
          ) : profileData ? (
            <>
              <div className="flex gap-2 mb-4 bg-elevated/50 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('founder')}
                  className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${activeTab === 'founder' ? 'bg-primary text-[#0A0A0F]' : 'text-muted hover:text-foreground'}`}
                >
                  Founder Profile
                </button>
                <button
                  onClick={() => setActiveTab('startup')}
                  className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${activeTab === 'startup' ? 'bg-primary text-[#0A0A0F]' : 'text-muted hover:text-foreground'}`}
                >
                  Startup Profile
                </button>
              </div>

              {activeTab === 'founder' ? (
                <div className="space-y-4">
                  <div className="mb-2 px-1">
                    <h2 className="text-sm font-bold text-foreground">Founder & Team</h2>
                    <p className="text-xs text-muted">Who is building this?</p>
                  </div>

                  {profileData.team && profileData.team.length > 0 ? (
                    profileData.team.map((member: any, i: number) => (
                      <div key={i} className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-primary mb-1 uppercase tracking-wide">
                          {member.name} <span className="text-muted font-normal lowercase">- {member.role || 'Founder'}</span>
                        </h3>
                        <p className="text-foreground text-sm leading-relaxed">{member.background || 'No background provided.'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="glass-card p-5">
                      <p className="text-foreground text-sm">No founder/team data set.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-2 px-1">
                    <h2 className="text-sm font-bold text-foreground">Startup Profile</h2>
                    <p className="text-xs text-muted">What are you building?</p>
                  </div>

                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">One Liner</h3>
                    <p className="text-foreground font-medium text-sm">{profileData.oneLiner?.value || 'Not set'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Core Problem</h3>
                      <p className="text-foreground text-sm leading-relaxed">{profileData.problem?.value || 'Not set'}</p>
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Solution</h3>
                      <p className="text-foreground text-sm leading-relaxed">{profileData.solution?.value || 'Not set'}</p>
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Business Model</h3>
                      <p className="text-foreground text-sm leading-relaxed">{profileData.businessModel?.value || 'Not set'}</p>
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Market Size / Target</h3>
                      <p className="text-foreground text-sm leading-relaxed">{profileData.marketSize?.value || 'Not set'}</p>
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Uniqueness / Moat</h3>
                      <p className="text-foreground text-sm leading-relaxed">{profileData.uniqueness?.value || 'Not set'}</p>
                    </div>

                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Mission / Vision</h3>
                      <p className="text-foreground text-sm leading-relaxed">{profileData.mission?.value || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">Traction Signals</h3>
                    {profileData.traction && profileData.traction.length > 0 ? (
                      <ul className="text-foreground text-sm space-y-2 list-disc pl-4">
                        {profileData.traction.map((tr: any, i: number) => (
                          <li key={i}>
                            <span className="font-medium text-primary-light">{tr.type}: </span>
                            {tr.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-foreground text-sm">No traction data yet.</p>
                    )}
                  </div>

                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wide">Dynamic FAQ & Extracted Facts</h3>
                    {profileData.dynamicFields && profileData.dynamicFields.length > 0 ? (
                      <div className="space-y-4">
                        {profileData.dynamicFields.map((field: any, i: number) => (
                          <div key={i} className="border-l-2 border-primary/50 pl-4">
                            <span className="text-xs font-semibold text-muted uppercase block mb-1">{field.key}</span>
                            <p className="text-sm text-foreground">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-foreground text-sm">No dynamic facts extracted yet.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted py-10">No profile found in Preparr database.</div>
          )}

          <p className="text-xs text-muted text-center mt-4">
            This profile is shared with Preparr. Any changes here instantly update your interview contexts.
          </p>
        </div>

        {/* Right Column - Profile Building Chat */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-4 ${m.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown>{getMessageText(m)}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="chat-message-assistant px-5 py-4 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-primary rounded-full typing-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-surface">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Tell Pitchrr about new traction, metrics, or pivots..."
                disabled={isActive}
                className="flex-1 bg-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isActive || !inputValue.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActive ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
