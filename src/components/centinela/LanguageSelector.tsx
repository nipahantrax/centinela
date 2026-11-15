import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useI18n, type Language } from "@/lib/i18n";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, languages, currentLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left z-50">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Seleccionar idioma"
        className={`flex items-center gap-1.5 rounded-md border border-primary/40 bg-secondary/60 hover:bg-secondary/90 transition-all font-mono cursor-pointer shadow-sm ${
          compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold text-foreground">
          {currentLanguage.flag} {currentLanguage.code.toUpperCase()}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-44 rounded-lg border border-primary/30 bg-popover/95 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-[9999]"
        >
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
            Idioma / Simi / Language
          </div>
          {languages.map((l) => {
            const isSelected = l.code === lang;
            return (
              <button
                key={l.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left font-mono text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-foreground hover:bg-secondary/70 hover:text-primary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{l.flag}</span>
                  <span>{l.name}</span>
                  {l.nativeName !== l.name && (
                    <span className="text-[10px] text-muted-foreground">({l.nativeName})</span>
                  )}
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
