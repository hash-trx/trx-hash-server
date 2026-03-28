/**
 * 使用 TronGrid 多 API Key 轮换广播已签名交易（私钥不在服务端）
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function decodeBroadcastMessage(raw: unknown): string {
  const br = raw as Record<string, unknown>;
  let m = br.message;
  if (typeof m === 'string' && /^[0-9a-fA-F]+$/.test(m) && m.length >= 4 && m.length % 2 === 0) {
    try {
      const s = Buffer.from(m, 'hex').toString('utf8').replace(/\0/g, '').trim();
      if (s) m = s;
    } catch {
      //
    }
  }
  const parts = [br.code, m].filter((x) => x != null && String(x) !== '');
  return parts.map(String).join(' ').trim();
}

export type BroadcastResult =
  | { ok: true; txid: string }
  | { ok: false; error: string };

@Injectable()
export class TronBroadcastService {
  private readonly keys: string[];
  private readonly baseUrl: string;
  private keyRound = 0;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('TRONGRID_API_KEYS') ?? process.env.TRONGRID_API_KEYS ?? '';
    this.keys = raw
      .split(/[,;\n\r]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    this.baseUrl = (
      this.config.get<string>('TRONGRID_BASE_URL') ?? process.env.TRONGRID_BASE_URL ?? 'https://api.trongrid.io'
    ).replace(/\/$/, '');
  }

  hasKeys(): boolean {
    return this.keys.length > 0;
  }

  private pickKey(): string | null {
    if (!this.keys.length) return null;
    const k = this.keys[this.keyRound % this.keys.length]!;
    this.keyRound++;
    return k;
  }

  /**
   * 将本机 TronWeb 签名后的交易对象 POST 到 TronGrid /wallet/broadcasttransaction
   */
  async broadcastTransaction(signedTx: Record<string, unknown>): Promise<BroadcastResult> {
    if (!this.keys.length) {
      return { ok: false, error: 'TRONGRID_API_KEYS 未配置' };
    }

    const maxAttempts = Math.min(32, Math.max(this.keys.length * 3, this.keys.length));
    let lastErr = '广播失败';

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = this.pickKey();
      if (!apiKey) break;

      try {
        const res = await fetch(`${this.baseUrl}/wallet/broadcasttransaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TRON-PRO-API-KEY': apiKey,
          },
          body: JSON.stringify(signedTx),
        });

        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (res.status === 429) {
          lastErr = 'TronGrid 限流 (429)，已换 Key 重试';
          continue;
        }

        if (!res.ok && res.status >= 500) {
          lastErr = `TronGrid HTTP ${res.status}`;
          continue;
        }

        const br = data as Record<string, unknown>;
        if (br.result === true) {
          const txid = (br.txID ?? br.txid) as string | undefined;
          if (typeof txid === 'string' && txid.length > 0) {
            return { ok: true, txid };
          }
          lastErr = decodeBroadcastMessage(data) || '未返回 txid';
          continue;
        }

        if (br.result === false) {
          const detail = decodeBroadcastMessage(data) || '链上拒绝广播';
          const retry =
            /\b429\b|rate|limit|throttl/i.test(detail) || res.status === 429;
          if (retry) {
            lastErr = detail;
            continue;
          }
          return { ok: false, error: detail };
        }

        // 部分响应无 result 字段，尝试直接取 txid
        const txid = (br.txID ?? br.txid) as string | undefined;
        if (typeof txid === 'string' && txid.length > 0) {
          return { ok: true, txid };
        }

        lastErr = decodeBroadcastMessage(data) || `HTTP ${res.status}`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    return { ok: false, error: lastErr };
  }
}
