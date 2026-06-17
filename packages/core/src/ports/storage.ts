import { NotImplementedError } from "../errors";

/**
 * StoragePort — the media-storage boundary (ADR-0007). Media is deferred; call sites
 * depend on this interface, not a concrete provider. Swap in Vercel Blob later without
 * touching callers.
 */
export interface StoragePort {
  /** Store bytes at `key`; return the retrievable URL. */
  put(key: string, data: Uint8Array, contentType: string): Promise<{ url: string }>;
  /** Resolve a (possibly signed) URL for an existing object. */
  getUrl(key: string): Promise<string>;
  /** Delete an object. */
  delete(key: string): Promise<void>;
}

/**
 * Stub implementation — throws on use. Lets the app boot and the types flow without a
 * real storage provider. Replace with a Vercel Blob adapter when media lands.
 */
export const stubStorage: StoragePort = {
  put() {
    throw new NotImplementedError("StoragePort.put (media storage deferred — ADR-0007)");
  },
  getUrl() {
    throw new NotImplementedError("StoragePort.getUrl (media storage deferred — ADR-0007)");
  },
  delete() {
    throw new NotImplementedError("StoragePort.delete (media storage deferred — ADR-0007)");
  },
};
