'use client';

import { useState } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

export type ReasoningProps = {
  text?: string;
  className?: string;
  initiallyOpen?: boolean;
  title?: string;
};

// Minimal Reasoning panel inspired by AI Elements reasoning component
export const Reasoning = ({
  text,
  className,
  initiallyOpen = true,
  title = 'Reasoning',
}: ReasoningProps) => {
  const [open, setOpen] = useState(initiallyOpen);
  if (!text || text.trim().length === 0) return null;
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-background text-foreground shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-sm font-medium opacity-80">{title}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((o) => !o)}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            {open ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3">
          <pre className="whitespace-pre-wrap text-xs leading-5 opacity-90">{text}</pre>
        </div>
      )}
    </div>
  );
};

export default Reasoning;

