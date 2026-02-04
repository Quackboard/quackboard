import { supabase } from '@/integrations/supabase/client';

export interface NotificationRequest {
  producerId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  date?: string; // For daily notifications (YYYY-MM-DD)
  weekStart?: string; // For weekly notifications (YYYY-MM-DD, Monday of the week)
  monthStart?: string; // For monthly notifications (YYYY-MM-DD, 1st of the month)
}

/**
 * Send producer notifications for a specific producer and time period
 */
export async function sendProducerNotifications(
  params: NotificationRequest
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-producer-notifications', {
      body: params,
    });

    if (error) {
      console.error('Error calling send-producer-notifications function:', error);
      return { success: false, message: error.message };
    }

    if (!data?.success) {
      console.error('Producer notification function returned error:', data);
      return { success: false, message: data?.error || 'Unknown error' };
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Error sending producer notifications:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trigger daily notifications for all producers (typically called by cron)
 */
export async function triggerDailyNotifications(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-daily-notifications');

    if (error) {
      console.error('Error calling send-daily-notifications function:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: data?.message || 'Daily notifications triggered', stats: data?.stats };
  } catch (error) {
    console.error('Error triggering daily notifications:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trigger weekly notifications for all producers (typically called by cron)
 */
export async function triggerWeeklyNotifications(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-weekly-notifications');

    if (error) {
      console.error('Error calling send-weekly-notifications function:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: data?.message || 'Weekly notifications triggered', stats: data?.stats };
  } catch (error) {
    console.error('Error triggering weekly notifications:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trigger monthly notifications for all producers (typically called by cron)
 */
export async function triggerMonthlyNotifications(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-monthly-notifications');

    if (error) {
      console.error('Error calling send-monthly-notifications function:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: data?.message || 'Monthly notifications triggered', stats: data?.stats };
  } catch (error) {
    console.error('Error triggering monthly notifications:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
