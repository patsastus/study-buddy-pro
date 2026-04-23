import { useCallback, useRef, useState, type DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
}

const ACCEPTED_EXT = [".pdf", ".md", ".markdown", ".txt"];

function isAccepted(file: File) {
  const name = file.name.toLowerCase();
  if (ACCEPTED_EXT.some((ext) => name.endsWith(ext))) return true;
  const type = file.type;
  return (
    type === "application/pdf" ||
    type === "text/markdown" ||
    type === "text/plain" ||
    type === ""
  );
}

export function FileDropZone({ file, onFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const dropped = files?.[0];
      if (!dropped) return;
      if (!isAccepted(dropped)) {
        setLocalError("Unsupported file. Please upload a .pdf or .md file.");
        return;
      }
      setLocalError(null);
      onFile(dropped);
    },
    [onFile],
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.items?.length) setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      handleFiles(e.dataTransfer?.files ?? null);
    },
    [handleFiles],
  );

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary-soft"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
        }`}
      >
        <div className="pointer-events-none mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="pointer-events-none font-heading text-lg text-foreground">
          Drop your project brief here
        </p>
        <p className="pointer-events-none mt-1 text-sm text-muted-foreground">
          Drag &amp; drop a <span className="font-medium">.pdf</span> or{" "}
          <span className="font-medium">.md</span> file, or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {localError && (
        <p className="text-xs text-destructive" role="alert">
          {localError}
        </p>
      )}
    </div>
  );
}
