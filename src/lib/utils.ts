// ============================================================
// Utility functions
// ============================================================
import { format, isToday, isYesterday, isThisWeek, formatDistanceToNow } from 'date-fns';

/**
 * Format a timestamp for chat list (WhatsApp style)
 */
export function formatChatTime(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'dd/MM/yyyy');
}

/**
 * Format a timestamp for message bubble
 */
export function formatMessageTime(date: string | Date): string {
  return format(new Date(date), 'h:mm a');
}

/**
 * Format last seen time
 */
export function formatLastSeen(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return `last seen today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'h:mm a')}`;
  return `last seen ${format(d, 'dd/MM/yyyy')} at ${format(d, 'h:mm a')}`;
}

/**
 * Format a date separator in chat
 */
export function formatDateSeparator(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Generate a random color from a string (for avatars)
 */
export function stringToColor(str: string): string {
  const colors = [
    '#25D366', '#128C7E', '#075E54', '#34B7F1',
    '#00A884', '#53BDEB', '#7C8EA3', '#E76F51',
    '#2A9D8F', '#E9C46A', '#F4A261', '#264653',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Classnames utility (basic cn)
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
