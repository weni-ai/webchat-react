/**
 * Utility functions for formatting data
 * TODO: Add more formatters as needed
 */

/**
 * Format timestamp to readable time
 * TODO: Add internationalization support
 * TODO: Add relative time formatting (e.g., "2 minutes ago")
 */
export function formatTimestamp(timestamp, format = 'time') {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  
  // TODO: Implement different format options
  switch (format) {
    case 'time':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'date':
      return date.toLocaleDateString();
    case 'datetime':
      return date.toLocaleString();
    case 'relative':
      // TODO: Implement relative time formatting
      return formatRelativeTime(timestamp);
    default:
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * TODO: Implement full relative time logic
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  // TODO: Add internationalization
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatTimestamp(timestamp, 'date');
}

/**
 * Format file size to human-readable format
 * TODO: Add internationalization support
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate text to specified length
 * TODO: Add word boundary awareness
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  
  // TODO: Break at word boundary
  return text.substring(0, maxLength) + '...';
}

/**
 * Parse URLs in text and make them clickable
 * TODO: Implement URL parsing and link generation
 */
export function parseLinks(text) {
  // TODO: Implement URL regex and replacement
  return text;
}

/**
 * Format phone number
 * TODO: Add international phone number support
 */
export function formatPhoneNumber(phone) {
  // TODO: Implement phone number formatting
  return phone;
}

/**
 * Sanitize HTML to prevent XSS
 * TODO: Implement proper HTML sanitization
 */
export function sanitizeHTML(html) {
  // TODO: Use a library like DOMPurify or implement sanitization
  return html;
}

export default {
  formatTimestamp,
  formatFileSize,
  truncateText,
  parseLinks,
  formatPhoneNumber,
  sanitizeHTML
};

