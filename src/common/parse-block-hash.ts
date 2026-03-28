/**
 * 与 electron-client hash-util 一致：从 blockId/hash 右侧向左取第一个 0-9
 */

export function parseDigitFromBlockHash(hash: string): number | null {
  if (!hash || typeof hash !== 'string') return null;
  const str = hash.trim().toLowerCase();
  for (let i = str.length - 1; i >= 0; i--) {
    const c = str[i];
    if (c >= '0' && c <= '9') {
      return parseInt(c, 10);
    }
  }
  return null;
}
