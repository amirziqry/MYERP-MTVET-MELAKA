import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PdfDropZoneProps {
  label: string;
  file: File | null;
  onFile: (file: File | null) => void;
  className?: string;
}

export function PdfDropZone({ label, file, onFile, className }: PdfDropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") return;
    onFile(f);
  };

  return (
    <div className={className}>
      <label className="text-sm text-foreground/80 mb-2 block">{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => ref.current?.click()}
        className={cn(
          "glass rounded-2xl p-6 text-center cursor-pointer transition-all",
          drag && "ring-2 ring-primary",
        )}
      >
        <input
          ref={ref}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm truncate">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-sm">Drag &amp; drop a PDF or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}