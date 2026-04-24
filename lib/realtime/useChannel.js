"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/db/client";
import { CHANNELS } from "./channels";

/**
 * @template T
 * @param {{
 *   channelName: string,
 *   event: string,
 *   onMessage: (payload: T) => void,
 *   enabled?: boolean,
 * }} options
 */
export function useChannel({
  channelName,
  event,
  onMessage,
  enabled = true,
}) {
  const channelRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep callback ref fresh without re-subscribing.
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const supabase = createBrowserSupabaseClient();

    channelRef.current = supabase
      .channel(channelName)
      .on("broadcast", { event }, (msg) => {
        onMessageRef.current(msg.payload);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Silent retry - never surface realtime errors to user UI.
          console.error(`[Realtime] Channel error: ${channelName}`);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, event, enabled]);
}

export const useCaseStatus = (caseId, onMessage) =>
  useChannel({
    channelName: CHANNELS.caseStatus(caseId),
    event: "status_update",
    onMessage,
  });

export const useCaseDecisions = (caseId, onMessage) =>
  useChannel({
    channelName: CHANNELS.caseDecisions(caseId),
    event: "new_decision",
    onMessage,
  });

export const useCaseDocuments = (caseId, onMessage) =>
  useChannel({
    channelName: CHANNELS.caseDocuments(caseId),
    event: "document_event",
    onMessage,
  });

export const useCaseDeadlines = (caseId, onMessage) =>
  useChannel({
    channelName: CHANNELS.caseDeadlines(caseId),
    event: "deadline_update",
    onMessage,
  });

export const useCaseAlerts = (caseId, onMessage, emotionShieldEnabled) =>
  useChannel({
    channelName: CHANNELS.caseAlerts(caseId),
    event: "alert",
    onMessage,
    enabled: emotionShieldEnabled,
  });

export const useCasePredictions = (caseId, onMessage) =>
  useChannel({
    channelName: CHANNELS.casePredictions(caseId),
    event: "prediction_updated",
    onMessage,
  });

export const useProfessionalTasks = (professionalId, onMessage) =>
  useChannel({
    channelName: CHANNELS.professionalTasks(professionalId),
    event: "task_event",
    onMessage,
  });
