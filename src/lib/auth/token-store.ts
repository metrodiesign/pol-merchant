// ที่เก็บ token คู่ (access + refresh) ของ OAuth login — localStorage เพื่อให้ทุกแท็บของ origin เดียวกัน
// เห็นคู่ล่าสุดเสมอ (refresh token หมุนทุกครั้ง ใช้ซ้ำ = login ถูก revoke ทั้งชุด) อ่านสดจาก storage ทุกครั้ง
// ไม่ cache ใน memory เพราะแท็บอื่นอาจเขียนทับ; memory ใช้เฉพาะเมื่อ storage ใช้ไม่ได้ (SSR/test/blocked).

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** epoch ms ที่ access token หมดอายุ (Date.now() + expires_in*1000). */
  expiresAt: number;
}

export const TOKEN_STORAGE_KEY = "pol_tokens";

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // localStorage โยน SecurityError ได้ (storage ถูก block)
  }
}

export interface TokenStore {
  getTokens(): TokenPair | null;
  setTokens(pair: TokenPair): void;
  clearTokens(): void;
}

/**
 * สร้าง token store ที่ผูกกับ storage key ของตัวเอง — สอง OAuth client (admin/merchant)
 * ต้องเก็บ token แยกกันไม่ทับกัน. memoryFallback เป็นของ instance นี้เท่านั้น
 * (อ่าน/เขียน storage สดทุกครั้ง เผื่อ global ถูก stub ภายหลังตอน test/SSR).
 */
export function createTokenStore(storageKey: string): TokenStore {
  let memoryFallback: TokenPair | null = null;
  return {
    getTokens(): TokenPair | null {
      const store = storage();
      if (!store) return memoryFallback;
      try {
        const raw = store.getItem(storageKey);
        return raw ? (JSON.parse(raw) as TokenPair) : null;
      } catch {
        return null;
      }
    },
    setTokens(pair: TokenPair): void {
      memoryFallback = pair;
      storage()?.setItem(storageKey, JSON.stringify(pair));
    },
    clearTokens(): void {
      memoryFallback = null;
      storage()?.removeItem(storageKey);
    },
  };
}

/** instance เริ่มต้นของ employee/admin login (key pol_tokens) — export ตรงเพื่อ backward-compat. */
export const defaultTokenStore = createTokenStore(TOKEN_STORAGE_KEY);

/** คู่ token ปัจจุบัน (ล่าสุดจากทุกแท็บ) หรือ null เมื่อไม่มี. */
export const getTokens = defaultTokenStore.getTokens;

/** เก็บคู่ใหม่ทันที — แท็บอื่นอ่านเจอในการเรียก getTokens ครั้งถัดไป. */
export const setTokens = defaultTokenStore.setTokens;

export const clearTokens = defaultTokenStore.clearTokens;

/**
 * รัน `work` ภายใต้ lock ข้ามแท็บ (Web Locks API) — ใช้ล้อม refresh ให้แท็บเดียวหมุน token ทีละครั้ง.
 * browser ที่ไม่มี navigator.locks รันตรง ๆ (best-effort).
 */
export function withCrossTabLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  return locks ? (locks.request(name, work) as Promise<T>) : work();
}
