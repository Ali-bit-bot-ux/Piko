"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOfflineQueue,
  flushQueue,
  type OfflineQueue,
  type SendOutcome,
} from "@/lib/offline-queue";
import type { RecordMeasurementInput } from "@/server/trials/record-measurement";
import { recordMeasurementAction } from "./actions";

type ActionResult = Awaited<ReturnType<typeof recordMeasurementAction>>;
type FailureCode = Extract<ActionResult, { ok: false }>["code"];

export type SubmitResult =
  | { status: "sent"; measurementId: string }
  /** No connection (or a server fault): kept on the phone, sent later. */
  | { status: "queued" }
  /** The server will not take it as it is. */
  | { status: "failed"; code: Exclude<FailureCode, "generic"> };

export type FlushReport = {
  sent: { eventId: string; measurementId: string }[];
  dropped: { eventId: string; code: FailureCode }[];
};

const FLUSH_EVERY_MS = 20_000;

/** A server fault ("generic") is worth another try; every other code is final. */
function outcomeOf(result: ActionResult): SendOutcome {
  if (result.ok) return "sent";
  return result.code === "generic" ? "retry" : "drop";
}

/**
 * Saves results with a safety net for a bad connection: when sending fails,
 * the result is kept in the browser and sent again by itself. The client event
 * id makes a second send harmless (the server already knows that id).
 */
export function useOfflineSave({
  queueKey,
  onFlushed,
}: {
  /** Separate per signed-in user and intake, so results never cross over. */
  queueKey: string;
  onFlushed: (report: FlushReport) => void;
}) {
  const queueRef = useRef<OfflineQueue<RecordMeasurementInput> | null>(null);
  const flushing = useRef(false);
  const onFlushedRef = useRef(onFlushed);
  const [pending, setPending] = useState(0);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    onFlushedRef.current = onFlushed;
  }, [onFlushed]);

  const flush = useCallback(async () => {
    const queue = queueRef.current;
    if (!queue || flushing.current || queue.size() === 0) return;
    flushing.current = true;
    setSending(true);

    const report: FlushReport = { sent: [], dropped: [] };
    await flushQueue(queue, async (item) => {
      const result = await recordMeasurementAction(item.payload);
      if (result.ok) {
        report.sent.push({
          eventId: item.id,
          measurementId: result.measurementId,
        });
      } else if (result.code !== "generic") {
        report.dropped.push({ eventId: item.id, code: result.code });
      }
      return outcomeOf(result);
    });

    flushing.current = false;
    setSending(false);
    setPending(queue.size());
    if (report.sent.length > 0 || report.dropped.length > 0) {
      onFlushedRef.current(report);
    }
  }, []);

  useEffect(() => {
    // localStorage exists only in the browser, so the queue is built here.
    queueRef.current = createOfflineQueue<RecordMeasurementInput>(
      window.localStorage,
      queueKey,
    );
    setPending(queueRef.current.size());
    setOnline(navigator.onLine);
    void flush();

    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const timer = setInterval(() => void flush(), FLUSH_EVERY_MS);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(timer);
    };
  }, [queueKey, flush]);

  const submit = useCallback(
    async (input: RecordMeasurementInput): Promise<SubmitResult> => {
      const keep = (): SubmitResult => {
        queueRef.current?.add({
          id: input.clientEventId,
          payload: input,
          queuedAt: Date.now(),
        });
        setPending(queueRef.current?.size() ?? 0);
        return { status: "queued" };
      };

      if (!navigator.onLine) return keep();
      try {
        const result = await recordMeasurementAction(input);
        if (result.ok) {
          return { status: "sent", measurementId: result.measurementId };
        }
        if (result.code === "generic") return keep();
        return { status: "failed", code: result.code };
      } catch {
        // The request never got an answer: treat it as no connection.
        return keep();
      }
    },
    [],
  );

  return { submit, flush, pending, sending, online };
}
