import { getClubTimeZone } from '@/lib/config';

function formatParts(value: string, options: Intl.DateTimeFormatOptions) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: getClubTimeZone(),
    ...options,
  });

  return formatter.formatToParts(new Date(value));
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function toClubDateString(value: string) {
  const parts = formatParts(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`;
}

export function formatClubDateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: getClubTimeZone(),
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatClubDateLongLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: getClubTimeZone(),
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatClubTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: getClubTimeZone(),
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
