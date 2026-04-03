const LINE_WIDTH = 40;

export function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

export function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

export function formatHeader(left: string, right: string): string {
  const maxLeft = LINE_WIDTH - right.length - 1;
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  return l + ' '.repeat(LINE_WIDTH - l.length - right.length) + right;
}

export function separator(): string {
  return '─'.repeat(LINE_WIDTH);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function buildProgressBar(
  fraction: number,
  width: number = 34,
  label?: string,
): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(clamped * width);
  const empty = width - filled;
  const bar = '━'.repeat(filled) + '░'.repeat(empty);
  return label ? `${bar} ${label}` : bar;
}

export function wrapText(text: string, maxLen: number = LINE_WIDTH): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

export function formatTwoColumn(left: string, right: string, width: number = LINE_WIDTH): string {
  const gap = width - left.length - right.length;
  if (gap < 1) return truncate(left, width - right.length - 1) + ' ' + right;
  return left + ' '.repeat(gap) + right;
}

export { LINE_WIDTH };
