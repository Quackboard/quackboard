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
): Promise<void> {
  const { bookingId, cancelToken, guestEmail, guestName, slotPosition, sectionLabel, event, isManualAdd = false } = params;

  try {
    const { data, error } = await supabase.functions.invoke('send-booking-email', {
      body: {
        bookingId,
        cancelToken,
        guestEmail,
        guestName,
        slotPosition,
        sectionLabel,
        event,
        isManualAdd,
      },
    });

    if (error) {
      console.error('Error calling send-booking-email function:', error);
      // Don't throw - we don't want email failures to break the booking flow
      // The booking was successful, email is just a notification
      return;
    }

    if (!data?.success) {
      console.error('Email function returned error:', data);
      return;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw - we don't want email failures to break the booking flow
    // The booking was successful, email is just a notification
  }
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
): Promise<void> {
  const { bookingId, cancelToken, guestEmail, guestName, slotPosition, sectionLabel, event } = params;

  try {
    const { data, error } = await supabase.functions.invoke('send-booking-email', {
      body: {
        bookingId,
        cancelToken,
        guestEmail,
        guestName,
        slotPosition,
        sectionLabel,
        event,
        isCancellation: true,
      },
    });

    if (error) {
      console.error('Error calling send-booking-email function for cancellation:', error);
      // Don't throw - we don't want email failures to break the cancellation flow
      return;
    }

    if (!data?.success) {
      console.error('Cancellation email function returned error:', data);
      return;
    }
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    // Don't throw - we don't want email failures to break the cancellation flow
  }
}

/**
 * Send email to producer when mic goes live
 */
export async function sendMicGoesLiveEmail(
  params: {
    eventId: string;
    producerId: string;
  }
): Promise<void> {
  const { eventId, producerId } = params;

  try {
    const { data, error } = await supabase.functions.invoke('send-mic-goes-live-email', {
      body: {
        eventId,
        producerId,
      },
    });

    if (error) {
      console.error('Error calling send-mic-goes-live-email function:', error);
      // Don't throw - we don't want email failures to break the mic creation flow
      return;
    }

    if (!data?.success) {
      console.error('Mic goes live email function returned error:', data);
      return;
    }
  } catch (error) {
    console.error('Error sending mic goes live email:', error);
    // Don't throw - we don't want email failures to break the mic creation flow
  }
}
