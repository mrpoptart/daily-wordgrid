"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { formatPartOfSpeech } from "@/lib/dictionary/utils";

interface WordDefinitionPopupProps {
  word: string;
  children: React.ReactNode;
}

interface WordDefinition {
  word: string;
  definitions: string[];
  partOfSpeech?: string;
}

export function WordDefinitionPopup({ word, children }: WordDefinitionPopupProps) {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !definition && !loading && !error) {
      setLoading(true);
      fetch(`/api/definition?word=${encodeURIComponent(word)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "ok") {
            setDefinition({
              word: data.word,
              definitions: data.definitions,
              partOfSpeech: data.partOfSpeech,
            });
          } else {
            setError(true);
          }
        })
        .catch(() => {
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, word, definition, loading, error]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-slate-100 capitalize">
              {word.toLowerCase()}
            </h3>
            {definition?.partOfSpeech && (
              <span className="text-xs text-slate-400 italic">
                {formatPartOfSpeech(definition.partOfSpeech)}
              </span>
            )}
          </div>

          {loading && (
            <div className="text-sm text-slate-400">Loading definition...</div>
          )}

          {error && !loading && (
            <div className="text-sm text-slate-400">
              No definition found for this word.
            </div>
          )}

          {definition && !loading && (
            <div className="space-y-2">
              {definition.definitions.map((def, index) => (
                <div key={index} className="text-sm text-slate-300">
                  <span className="font-semibold text-emerald-400">{index + 1}.</span>{" "}
                  {def}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
