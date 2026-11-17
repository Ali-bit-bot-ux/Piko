"use client";

import { Button } from "@/components/ui";
import { interpolate } from "@/lib/i18n";

export type OfflineTexts = {
  offline: string;
  queued: string;
  pending: string;
  sendNow: string;
  sending: string;
  sentLater: string;
  dropped: string;
  pendingLabel: string;
};

/** Tells the coach that results are waiting for a connection, and lets them retry. */
export function OfflineBanner({
  texts,
  online,
  pending,
  sending,
  onFlush,
  sentLater,
  dropped,
}: {
  texts: OfflineTexts;
  online: boolean;
  pending: number;
  sending: boolean;
  onFlush: () => void;
  /** How many waiting results were just sent. */
  sentLater: number;
  /** How many waiting results the server refused. */
  dropped: number;
}) {
  if (online && pending === 0 && sentLater === 0 && dropped === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-muted p-4 text-sm">
      {!online ? (
        <p role="status" className="font-medium text-warning">
          {texts.offline}
        </p>
      ) : null}
      {pending > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="font-medium text-ink">
            {interpolate(texts.pending, { count: pending })}
          </p>
          <Button
            variant="secondary"
            onClick={onFlush}
            disabled={sending || !online}
          >
            {sending ? texts.sending : texts.sendNow}
          </Button>
        </div>
      ) : null}
      {sentLater > 0 ? (
        <p role="status" className="font-medium text-success">
          {interpolate(texts.sentLater, { count: sentLater })}
        </p>
      ) : null}
      {dropped > 0 ? (
        <p role="alert" className="font-medium text-danger">
          {interpolate(texts.dropped, { count: dropped })}
        </p>
      ) : null}
    </div>
  );
}
