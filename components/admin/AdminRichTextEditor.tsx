"use client";

import type React from "react";
import { useRef } from "react";
import { Bold, Eraser, Italic, Link, List, ListOrdered, Redo2, Underline, Undo2 } from "lucide-react";

type AdminRichTextEditorProps = Readonly<{
  name: string;
  initialHtml: string;
  ariaLabel: string;
}>;

type ToolbarCommand = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  command: string;
  value?: string;
  isPrimary?: boolean;
};

const INLINE_COMMANDS: ToolbarCommand[] = [
  { label: "Bold", icon: Bold, command: "bold", isPrimary: true },
  { label: "Italic", icon: Italic, command: "italic", isPrimary: true },
  { label: "Underline", icon: Underline, command: "underline" },
  { label: "Bullets", icon: List, command: "insertUnorderedList" },
  { label: "Numbers", icon: ListOrdered, command: "insertOrderedList" },
  { label: "Undo", icon: Undo2, command: "undo" },
  { label: "Redo", icon: Redo2, command: "redo" }
];

export function AdminRichTextEditor({
  name,
  initialHtml,
  ariaLabel
}: AdminRichTextEditorProps): React.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);

  function syncEditor(): void {
    if (inputRef.current) {
      inputRef.current.value = editorRef.current?.innerHTML ?? "";
    }
  }

  function saveSelection(): void {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (isRangeInsideEditor(editor, range)) {
      selectionRef.current = range.cloneRange();
    }
  }

  function restoreSelection(): void {
    const range = selectionRef.current;
    const selection = window.getSelection();

    if (!range || !selection) {
      editorRef.current?.focus();
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
    editorRef.current?.focus();
  }

  function runCommand(command: string, value?: string): void {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    syncEditor();
  }

  function createLink(): void {
    restoreSelection();
    const href = window.prompt("Paste a link URL");

    if (href?.trim()) {
      document.execCommand("createLink", false, href.trim());
    }

    saveSelection();
    syncEditor();
  }

  function clearFormatting(): void {
    restoreSelection();
    document.execCommand("removeFormat");
    document.execCommand("formatBlock", false, "P");
    saveSelection();
    syncEditor();
  }

  return (
    <div className="border border-stone-200 bg-white">
      <input ref={inputRef} type="hidden" name={name} defaultValue={initialHtml} />
      <div className="flex flex-wrap items-center gap-px border-b border-stone-200 bg-stone-200">
        <label className="flex h-10 items-center gap-2 bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
          Heading
          <select
            defaultValue=""
            onMouseDown={saveSelection}
            onChange={(event) => {
              if (event.currentTarget.value) {
                runCommand("formatBlock", event.currentTarget.value);
                event.currentTarget.value = "";
              }
            }}
            className="h-8 border border-stone-200 bg-[#FAFAF8] px-2 text-xs font-semibold text-stone-900 outline-none focus:border-brand"
          >
            <option value="" disabled>Choose</option>
            <option value="P">Paragraph</option>
            <option value="H2">Heading</option>
            <option value="H3">Subheading</option>
            <option value="BLOCKQUOTE">Quote</option>
          </select>
        </label>

        {INLINE_COMMANDS.map((command) => {
          const Icon = command.icon;

          return (
            <button
              key={command.label}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand(command.command, command.value);
              }}
              title={command.label}
              aria-label={command.label}
              className={`inline-flex h-10 items-center justify-center gap-1.5 bg-white text-stone-700 transition hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                command.isPrimary ? "px-3 text-xs font-bold uppercase tracking-wider" : "w-10"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {command.isPrimary ? <span>{command.label}</span> : null}
            </button>
          );
        })}

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            createLink();
          }}
          title="Link"
          aria-label="Link"
          className="inline-flex h-10 w-10 items-center justify-center bg-white text-stone-700 transition hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Link className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            clearFormatting();
          }}
          title="Clear formatting"
          aria-label="Clear formatting"
          className="inline-flex h-10 w-10 items-center justify-center bg-white text-stone-700 transition hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          saveSelection();
          syncEditor();
        }}
        onBlur={syncEditor}
        onClick={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={() => window.requestAnimationFrame(syncEditor)}
        className="legal-document-editor min-h-[320px] cursor-text bg-[#FAFAF8] px-4 py-4 text-sm font-light leading-7 text-stone-700 outline-none focus:bg-white"
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </div>
  );
}

function isRangeInsideEditor(editor: HTMLDivElement, range: Range): boolean {
  const ancestor = range.commonAncestorContainer;
  return ancestor === editor || editor.contains(ancestor);
}
