import { useCallback, useState, type DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";

interface Props {
  file: File | null;
  onFile: (file: File | null) => void;
}

export function FileDropZone({ file, onFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFile(dropped);
    },
    [onFile],
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
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary-soft"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
      }`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
        <Upload className="h-6 w-6 text-primary" />
      </div>
      <p className="font-serif text-lg text-foreground">Drop your project brief here</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag &amp; drop a <span className="font-medium">.pdf</span> or{" "}
        <span className="font-medium">.md</span> file, or click to browse
      </p>
      <input
        type="file"
        accept=".pdf,.md,application/pdf,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}
