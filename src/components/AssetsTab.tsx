import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AssetsTab({ opportunityId }: { opportunityId: string }) {
  const [assetType, setAssetType] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [generatedAsset, setGeneratedAsset] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const generateAsset = async (type: string, basePrompt: string) => {
    setIsGenerating(true);
    setAssetType(type);
    setGeneratedAsset('');
    setIsEditing(false);

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, prompt: customPrompt || basePrompt }),
      });

      if (!res.ok) throw new Error('Failed to generate asset');
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          // Simple parsing of text streams (data streams are usually prefixed with data:)
          const lines = chunk.split('\n').filter(l => l.startsWith('0:'));
          for (const line of lines) {
            try {
              const text = JSON.parse(line.slice(2));
              setGeneratedAsset(prev => prev + text);
            } catch (e) {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert('Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 border border-primary/20">
        <h2 className="text-sm font-semibold text-foreground mb-2">Tailored Asset Generator</h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">Generate specific assets (like a 1-min video script or tailored CV) perfectly tuned for this opportunity. The AI uses your Master Resources + Opportunity criteria to draft them.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => generateAsset('Video Script', 'Draft a 1-minute video script introducing the founder and startup, focusing specifically on the evaluation criteria of this opportunity. Include camera/emotion cues.')}
            className="p-3 bg-elevated border border-border rounded-xl text-left hover:border-primary/50 transition-colors group"
          >
            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors mb-1">🎥 Video Script</p>
            <p className="text-[10px] text-muted">A 1-min pitch script</p>
          </button>

          <button 
            onClick={() => generateAsset('Tailored CV', 'Draft a tailored Markdown CV highlighting the founder\'s background. Emphasize experiences that directly align with this opportunity\'s winner archetype and unfair advantages.')}
            className="p-3 bg-elevated border border-border rounded-xl text-left hover:border-primary/50 transition-colors group"
          >
            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors mb-1">📄 Tailored CV</p>
            <p className="text-[10px] text-muted">Highlight relevant skills</p>
          </button>

          <button 
            onClick={() => generateAsset('Pitch Deck Outline', 'Draft a 10-slide Pitch Deck Outline tailored to what this specific program/investor cares about most. Provide a title and 3 bullet points per slide.')}
            className="p-3 bg-elevated border border-border rounded-xl text-left hover:border-primary/50 transition-colors group"
          >
            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors mb-1">📊 Deck Outline</p>
            <p className="text-[10px] text-muted">Slide-by-slide narrative</p>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
           <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Custom Instructions (Optional)</label>
           <input 
             value={customPrompt}
             onChange={e => setCustomPrompt(e.target.value)}
             placeholder="e.g. Make the video script 2 minutes and focus heavily on our revenue growth..."
             className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
           />
        </div>
      </div>

      {(generatedAsset || isGenerating) && (
        <div className="glass-card flex flex-col min-h-[500px]">
          <div className="px-5 py-3 border-b border-border flex justify-between items-center bg-surface/50 rounded-t-2xl">
            <h3 className="text-sm font-semibold text-primary">{assetType} {isGenerating ? '(Generating...)' : ''}</h3>
            {!isGenerating && generatedAsset && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-foreground transition-colors"
              >
                {isEditing ? 'View Rendered' : 'Edit Markdown'}
              </button>
            )}
          </div>

          <div className="flex-1 p-5 overflow-y-auto">
            {isEditing ? (
              <textarea 
                value={generatedAsset}
                onChange={e => setGeneratedAsset(e.target.value)}
                className="w-full h-full min-h-[400px] bg-transparent text-sm text-foreground font-mono focus:outline-none resize-none leading-relaxed"
              />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-foreground prose-a:text-primary">
                <ReactMarkdown>{generatedAsset}</ReactMarkdown>
                {isGenerating && (
                   <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
