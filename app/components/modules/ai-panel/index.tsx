"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useChat } from "@/app/hooks/use-chat";
import type { ChatRole } from "@/app/types/chat";

const QUICK_QUESTIONS: Record<ChatRole, string[]> = {
  operator: [
    "Apa risiko di zona ini?",
    "Kenapa zona ini direkomendasikan untuk realokasi?",
    "Bandingkan dua zona di kawasan ini",
  ],
  umkm: [
    "Apakah lokasi usaha saya aman?",
    "Ke mana saya bisa direlokasi jika zona ini berisiko?",
    "Apa arti status waspada?",
  ],
};

const GREETING: Record<ChatRole, string> = {
  operator: "Hi! Ada yang ingin Anda analisis?",
  umkm: "Hi! Ada yang bisa saya bantu terkait lokasi usaha Anda?",
};

/**
 * In-map AI panel (Asisten AI TitikTemu) -- floating trigger + expandable
 * chat, per DESIGN.md's chatbot requirement. Must be rendered inside a
 * `position: relative` container (the map wrapper) since it positions
 * itself `absolute` within it, not fixed to the viewport -- this is
 * deliberately an IN-MAP panel, not a site-wide widget.
 */
export function AiPanel({ role, onHighlightGridIds }: {
  role: ChatRole;
  onHighlightGridIds?: (gridIds: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, isSending } = useChat(role);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    sendMessage(trimmed, {
      // `data` is this call's own response -- using the hook's own
      // `highlightGridIds` state here instead would read a stale value
      // from this render's closure, not the one this call just produced.
      onSuccess: (data) => onHighlightGridIds?.(data.highlight_grid_ids),
    });
    setDraft("");
  };

  if (!isOpen) {
    return (
      // Bottom-right, stuck to the map's own corner -- previously centered
      // at the bottom, where it could overlap MapLegend (bottom-left).
      // Anchoring both to opposite corners keeps them out of each other's
      // way on every page that renders both inside the same map wrapper.
      <aside aria-label="In-map AI panel" className="absolute bottom-3 right-3 z-[1000]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-10 items-center gap-2 rounded-full border border-border bg-neutral-0 px-4 text-s8 font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="size-2 shrink-0 rounded-full bg-secondary-500" aria-hidden="true" />
          <span className="hidden sm:inline">Asisten AI TitikTemu</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="In-map AI panel"
      className="absolute bottom-3 right-3 z-[1000] flex h-[420px] w-[92vw] max-w-sm max-h-[70%] flex-col overflow-hidden rounded-xl border border-border bg-neutral-0 shadow-sm"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-secondary-500" aria-hidden="true" />
          <span className="text-s8 font-semibold text-neutral-900">Asisten AI TitikTemu</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Tutup percakapan"
          title="Tutup percakapan"
          className="flex size-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-s6 font-semibold text-neutral-900">{GREETING[role]}</p>
            <div className="flex flex-col gap-2">
              <span className="text-b9 font-semibold text-neutral-500">Quick Question</span>
              {QUICK_QUESTIONS[role].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleSend(question)}
                  className="rounded-full bg-primary-600 px-4 py-2 text-left text-b9 font-medium text-neutral-0 transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <li
                key={`${message.role}-${index}`}
                className={message.role === "user" ? "self-end" : "self-start"}
              >
                <div
                  className={
                    message.role === "user"
                      ? "rounded-xl bg-primary-600 px-3 py-2 text-b9 text-neutral-0"
                      : "rounded-xl border border-border bg-neutral-50 px-3 py-2 text-b9 text-neutral-800"
                  }
                >
                  {message.text}
                </div>
              </li>
            ))}
            {isSending && (
              <li className="self-start" aria-label="Asisten sedang mengetik">
                <div className="rounded-xl border border-border bg-neutral-50 px-3 py-2 text-b9 text-neutral-500">
                  Mengetik...
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tanyakan sesuatu..."
          aria-label="Tulis pertanyaan untuk Asisten AI TitikTemu"
          disabled={isSending}
        />
        <Button type="submit" size="sm" disabled={isSending || !draft.trim()}>
          Kirim
        </Button>
      </form>
    </aside>
  );
}
