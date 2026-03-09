/**
 * Email utility that calls Supabase Edge Function to send booking confirmation emails
 * The Edge Function handles the Zeptomail API integration securely on the server side.
 */

import { supabase } from '@/integrations/supabase/client';

interface EventDetails {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string | null;
  producer_id: string;
  producer_message: string | null;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

async function invokeWithRetry(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        console.error(`[Email] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${functionName}:`, error);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return { success: false, error: error.message || 'Edge function error' };
      }

      if (!data?.success) {
        console.error(`[Email] Attempt ${attempt + 1}/${MAX_RETRIES + 1} returned failure for ${functionName}:`, data);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return { success: false, error: data?.message || 'Email send failed' };
      }

      return { success: true };
    } catch (err) {
      console.error(`[Email] Attempt ${attempt + 1}/${MAX_RETRIES + 1} threw for ${functionName}:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

export async function sendBookingConfirmationEmail(
  params: {
    bookingId: string;
    cancelToken: string;
    guestEmail: string;
    guestName: string;
    slotPosition: number;
    sectionLabel: string;
    event: EventDetails;
    isManualAdd?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  return invokeWithRetry('send-booking-email', {
    bookingId: params.bookingId,
    cancelToken: params.cancelToken,
    guestEmail: params.guestEmail,
    guestName: params.guestName,
    slotPosition: params.slotPosition,
    sectionLabel: params.sectionLabel,
    event: params.event,
    isManualAdd: params.isManualAdd ?? false,
  });
}

export async function sendCancellationEmail(
  params: {
    bookingId: string;
    cancelToken: string;
    guestEmail: string;
    guestName: string;
    slotPosition: number;
    sectionLabel: string;
    event: EventDetails;
  }
): Promise<{ success: boolean; error?: string }> {
  return invokeWithRetry('send-booking-email', {
    bookingId: params.bookingId,
    cancelToken: params.cancelToken,
    guestEmail: params.guestEmail,
    guestName: params.guestName,
    slotPosition: params.slotPosition,
    sectionLabel: params.sectionLabel,
    event: params.event,
    isCancellation: true,
  });
}

/**
 * Send email to producer when mic goes live
 */
export async function sendMicGoesLiveEmail(
  params: {
    eventId: string;
    producerId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return invokeWithRetry('send-mic-goes-live-email', {
    eventId: params.eventId,
    producerId: params.producerId,
  });
}
