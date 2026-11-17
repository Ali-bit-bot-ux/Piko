"use client";

import { useState, useTransition } from "react";
import { Button, buttonStyles } from "@/components/ui";
import { cn } from "@/lib/cn";
import { interpolate } from "@/lib/i18n";
import { mailtoLink, whatsappLink } from "@/lib/report-share";

export type ReportStatusLine = {
  text: string;
  tone: "plain" | "done" | "warn";
};

type ErrorCode = "invalid" | "forbidden" | "not_found" | "no_score" | "generic";

export type ReportPanelTexts = {
  createAgain: string;
  createAgainHint: string;
  create: string;
  creating: string;
  statusTitle: string;
  statusNone: string;
  linkLabel: string;
  linkHint: string;
  copy: string;
  copied: string;
  whatsapp: string;
  email: string;
  markSent: string;
  marking: string;
  marked: string;
  message: string;
  emailSubject: string;
  errors: Record<ErrorCode, string>;
};

type Channel = "whatsapp" | "email" | "manual";

const toneClass = {
  plain: "text-ink-muted",
  done: "font-semibold text-success",
  warn: "font-semibold text-warning",
} as const;

/**
 * Issues the report link and helps the admin hand it to the parent. The link
 * exists on screen only right after it is created (the token is not stored).
 * Opening WhatsApp or the mail app is the admin's own click; the app itself
 * sends nothing.
 */
export function ReportPanelClient({
  hasReport,
  sent,
  status,
  contact,
  create,
  markSent,
  texts,
}: {
  hasReport: boolean;
  sent: boolean;
  status: readonly ReportStatusLine[];
  /** Parent contact as typed at registration (phone or e-mail). */
  contact: string;
  create: () => Promise<
    { ok: true; url: string } | { ok: false; code: ErrorCode }
  >;
  markSent: (
    channel: Channel,
  ) => Promise<{ ok: true } | { ok: false; code: ErrorCode }>;
  texts: ReportPanelTexts;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [creating, startCreating] = useTransition();
  const [marking, startMarking] = useTransition();

  function createLink() {
    setNote(null);
    setCopied(false);
    startCreating(async () => {
      const result = await create();
      if (result.ok) setUrl(result.url);
      else setNote({ kind: "error", text: texts.errors[result.code] });
    });
  }

  function mark(channel: Channel) {
    startMarking(async () => {
      const result = await markSent(channel);
      setNote(
        result.ok
          ? { kind: "ok", text: texts.marked }
          : { kind: "error", text: texts.errors[result.code] },
      );
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // The field is selectable: the admin can copy by hand.
      setCopied(false);
    }
  }

  const message = url ? interpolate(texts.message, { url }) : "";
  const mail = url ? mailtoLink(contact, texts.emailSubject, message) : null;
  const linkButton = buttonStyles("secondary");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold">{texts.statusTitle}</h3>
        {status.length === 0 ? (
          <p className="text-sm text-ink-muted">{texts.statusNone}</p>
        ) : (
          <ul className="flex flex-col gap-0.5 text-sm">
            {status.map((line) => (
              <li key={line.text} className={toneClass[line.tone]}>
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Button onClick={createLink} disabled={creating} className="w-fit">
          {creating
            ? texts.creating
            : hasReport
              ? texts.createAgain
              : texts.create}
        </Button>
        {hasReport ? (
          <p className="text-sm text-ink-muted">{texts.createAgainHint}</p>
        ) : null}
      </div>

      {url ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <label htmlFor="report-link" className="text-sm font-semibold">
            {texts.linkLabel}
          </label>
          <input
            id="report-link"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-11 w-full rounded-xl border border-line bg-surface-muted px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
          <p className="text-sm text-ink-muted">{texts.linkHint}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copy}>
              {copied ? texts.copied : texts.copy}
            </Button>
            <a
              href={whatsappLink(contact, message)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => mark("whatsapp")}
              className={linkButton}
            >
              {texts.whatsapp}
            </a>
            {mail ? (
              <a
                href={mail}
                onClick={() => mark("email")}
                className={linkButton}
              >
                {texts.email}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasReport && (url || !sent) ? (
        <Button
          variant="secondary"
          onClick={() => mark("manual")}
          disabled={marking || sent}
          className="w-fit"
        >
          {marking ? texts.marking : texts.markSent}
        </Button>
      ) : null}

      <p
        role="status"
        className={cn(
          "min-h-5 text-sm",
          note?.kind === "error" ? "text-danger" : "text-success",
        )}
      >
        {note?.text}
      </p>
    </div>
  );
}
