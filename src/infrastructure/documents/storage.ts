import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Adapter per i documenti caricati a runtime (tag "storage:<sha>"), content-addressed per sha256.
 * Locale su disco (Docker/dev) o Vercel Blob privato (nessun disco persistente, DEC-113), a seconda
 * della presenza di BLOB_READ_WRITE_TOKEN. I documenti del seed (inapp:/casi:/scenario) restano
 * sempre file locali in bundle, non passano da qui.
 */
export interface StorageAdapter {
  write(sha: string, buf: Buffer): Promise<void>;
  read(sha: string): Promise<Buffer>;
  exists(sha: string): Promise<boolean>;
}

function pathnameFor(sha: string): string {
  return `storage/${sha.slice(0, 2)}/${sha}`;
}

function localAdapter(root: string): StorageAdapter {
  const fileFor = (sha: string) => path.join(root, sha.slice(0, 2), sha);
  return {
    async write(sha, buf) {
      const dest = fileFor(sha);
      mkdirSync(path.dirname(dest), { recursive: true });
      if (!existsSync(dest)) writeFileSync(dest, buf);
    },
    async read(sha) {
      return readFileSync(fileFor(sha));
    },
    async exists(sha) {
      return existsSync(fileFor(sha));
    },
  };
}

function blobAdapter(): StorageAdapter {
  return {
    async write(sha, buf) {
      const { put } = await import("@vercel/blob");
      await put(pathnameFor(sha), buf, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/pdf" });
    },
    async read(sha) {
      const { get } = await import("@vercel/blob");
      const result = await get(pathnameFor(sha), { access: "private" });
      if (!result?.stream) throw new Error(`Documento non trovato in blob storage: ${sha}`);
      const buf = Buffer.from(await new Response(result.stream as unknown as BodyInit).arrayBuffer());
      return buf;
    },
    async exists(sha) {
      const { head } = await import("@vercel/blob");
      try {
        await head(pathnameFor(sha));
        return true;
      } catch {
        return false;
      }
    },
  };
}

let adapter: StorageAdapter | null = null;

/** Sceglie l'adapter in base a BLOB_READ_WRITE_TOKEN (Vercel) oppure disco locale (Docker/dev). */
export function storageAdapter(storageRoot: string): StorageAdapter {
  if (!adapter) adapter = process.env.BLOB_READ_WRITE_TOKEN ? blobAdapter() : localAdapter(storageRoot);
  return adapter;
}

/** Solo per i test: azzera l'adapter cache (cambia quando cambiano gli env). */
export function resetStorageAdapterForTests(): void {
  adapter = null;
}
