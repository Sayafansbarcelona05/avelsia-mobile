import * as Crypto from "expo-crypto";

// Hermes tidak punya crypto.subtle. Supabase memakainya untuk membuat code challenge
// SHA-256 pada alur PKCE; tanpa ini ia jatuh ke metode "plain" yang lebih lemah.
type DigestAlgo = string | { name: string };
type DigestData = Parameters<typeof Crypto.digest>[1];

const g = globalThis as unknown as { crypto?: Record<string, unknown> };
if (!g.crypto) g.crypto = {};
const sasaran = g.crypto as Record<string, unknown>;

if (!sasaran.getRandomValues) {
  sasaran.getRandomValues = Crypto.getRandomValues;
}

if (!sasaran.subtle) {
  Object.defineProperty(sasaran, "subtle", {
    configurable: true,
    value: {
      digest(algoritma: DigestAlgo, data: DigestData) {
        const nama = typeof algoritma === "string" ? algoritma : algoritma.name;
        if (nama.toUpperCase() !== "SHA-256") {
          return Promise.reject(new Error("Hanya SHA-256 yang didukung"));
        }
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
      },
    },
  });
}