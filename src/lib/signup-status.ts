import { differenceInHours, differenceInMinutes, parseISO, format } from 'date-fns';

export type SignupStatusType = 'open' | 'soon' | 'future';

export interface SignupStatus {
  type: SignupStatusType;
  label: string;
}

export function getSignupStatus(signupOpensAt: string | null): SignupStatus {
  if (!signupOpensAt) {
    return { type: 'open', label: 'Sign-ups open' };
  }

  const now = new Date();
  const opensAt = parseISO(signupOpensAt);

  if (now >= opensAt) {
    return { type: 'open', label: 'Sign-ups open' };
  }

  const hoursUntil = differenceInHours(opensAt, now);
  const minutesUntil = differenceInMinutes(opensAt, now);

  if (hoursUntil < 24) {
    const displayHours = hoursUntil > 0 ? hoursUntil : 0;
    const label = displayHours > 0
      ? `Opens in ${displayHours}h`
      : `Opens in ${minutesUntil}m`;
    return { type: 'soon', label };
  }

  const dayLabel = format(opensAt, 'EEEE M/d/yyyy');
  const timeLabel = format(opensAt, 'h:mma').toLowerCase();
  return {
    type: 'future',
    label: `Sign-ups open ${dayLabel} at ${timeLabel}`,
  };
}
