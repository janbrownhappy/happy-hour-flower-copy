import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Check } from 'lucide-react';

export default function BlogTopicCard({ suggestion, generating, disabled, generated, onGenerate }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
      <p className="font-heading font-semibold leading-snug">{suggestion.topic}</p>
      {suggestion.angle && (
        <p className="text-sm text-muted-foreground mt-2">{suggestion.angle}</p>
      )}
      {suggestion.rationale && (
        <p className="text-xs text-muted-foreground/80 mt-2 italic">{suggestion.rationale}</p>
      )}
      <Button
        size="sm"
        variant={generated ? 'outline' : 'default'}
        className="mt-4 self-start"
        onClick={onGenerate}
        disabled={disabled || generated}
      >
        {generated ? (
          <>
            <Check className="w-3.5 h-3.5" /> Draft created
          </>
        ) : generating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing...
          </>
        ) : (
          <>
            <Wand2 className="w-3.5 h-3.5" /> Generate draft
          </>
        )}
      </Button>
    </div>
  );
}