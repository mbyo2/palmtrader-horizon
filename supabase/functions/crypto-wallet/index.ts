// Crypto wallet edge function — open-source HD wallets (BTC/ETH/SOL/TRX)
// Uses BIP39/BIP32 derivation with AES-256-GCM seed encryption.
// All chain queries use free public RPC endpoints — no paid keys required.

import { Buffer } from "node:buffer";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as bip39 from "npm:bip39@3.1.0";
import { HDKey } from "npm:@scure/bip32@1.4.0";
import { ethers } from "npm:ethers@6.13.2";
import * as bitcoin from "npm:bitcoinjs-lib@6.1.6";
import { ECPairFactory } from "npm:ecpair@2.1.0";
import * as ecc from "npm:tiny-secp256k1@2.2.3";
import { Keypair as SolKeypair, Connection as SolConnection, PublicKey as SolPublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction as SolTransaction, sendAndConfirmTransaction } from "npm:@solana/web3.js@1.95.3";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const WALLET_MASTER_KEY = Deno.env.get("WALLET_MASTER_KEY")!;

if (!WALLET_MASTER_KEY || WALLET_MASTER_KEY.length < 32) {
  console.error("WALLET_MASTER_KEY missing or too short");
}

const ECPair = ECPairFactory(ecc);

// ---- Crypto helpers (AES-256-GCM via Web Crypto) ----

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64Encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getMasterKey(): Promise<CryptoKey> {
  // Derive a stable 32-byte key from WALLET_MASTER_KEY using SHA-256
  const enc = new TextEncoder().encode(WALLET_MASTER_KEY);
  const hashed = new Uint8Array(await crypto.subtle.digest("SHA-256", enc));
  return crypto.subtle.importKey("raw", hashed, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptSeed(seedHex: string): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(seedHex);
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  // Web Crypto AES-GCM appends the 16-byte auth tag to ciphertext
  const ciphertext = enc.slice(0, enc.length - 16);
  const authTag = enc.slice(enc.length - 16);
  return { ciphertext: b64Encode(ciphertext), iv: b64Encode(iv), authTag: b64Encode(authTag) };
}

async function decryptSeed(ciphertextB64: string, ivB64: string, authTagB64: string): Promise<string> {
  const key = await getMasterKey();
  const iv = b64Decode(ivB64);
  const ct = b64Decode(ciphertextB64);
  const tag = b64Decode(authTagB64);
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return new TextDecoder().decode(dec);
}

// ---- Wallet derivation ----

interface DerivedAddress {
  address: string;
  derivationPath: string;
  privateKeyHex: string; // never returned to client; used only inside function
}

async function getOrCreateSeed(supabaseAdmin: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("crypto_wallet_seeds")
    .select("encrypted_seed, iv, auth_tag")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return await decryptSeed(existing.encrypted_seed, existing.iv, existing.auth_tag);
  }

  const mnemonic = bip39.generateMnemonic(256);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const seedHex = bytesToHex(new Uint8Array(seed));

  const { ciphertext, iv, authTag } = await encryptSeed(seedHex);
  const { error } = await supabaseAdmin.from("crypto_wallet_seeds").insert({
    user_id: userId,
    encrypted_seed: ciphertext,
    iv,
    auth_tag: authTag,
  });
  if (error) throw new Error(`Seed save failed: ${error.message}`);
  return seedHex;
}

function deriveBTC(seedHex: string): DerivedAddress {
  const root = HDKey.fromMasterSeed(hexToBytes(seedHex));
  const path = "m/84'/0'/0'/0/0"; // BIP84 native segwit
  const child = root.derive(path);
  if (!child.privateKey) throw new Error("BTC derivation failed");
  const keyPair = ECPair.fromPrivateKey(Buffer.from(child.privateKey));
  const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.bitcoin });
  return { address: address!, derivationPath: path, privateKeyHex: bytesToHex(child.privateKey) };
}

function deriveETH(seedHex: string): DerivedAddress {
  const root = HDKey.fromMasterSeed(hexToBytes(seedHex));
  const path = "m/44'/60'/0'/0/0";
  const child = root.derive(path);
  if (!child.privateKey) throw new Error("ETH derivation failed");
  const wallet = new ethers.Wallet("0x" + bytesToHex(child.privateKey));
  return { address: wallet.address, derivationPath: path, privateKeyHex: bytesToHex(child.privateKey) };
}

function deriveSOL(seedHex: string): DerivedAddress {
  // Solana commonly uses ed25519 derivation; for simplicity here we use a deterministic
  // 32-byte slice from the BIP32 secp256k1 key as a Solana keypair seed.
  const root = HDKey.fromMasterSeed(hexToBytes(seedHex));
  const path = "m/44'/501'/0'/0'";
  const child = root.derive(path);
  if (!child.privateKey) throw new Error("SOL derivation failed");
  const seed32 = child.privateKey.slice(0, 32);
  const kp = SolKeypair.fromSeed(seed32);
  return { address: kp.publicKey.toBase58(), derivationPath: path, privateKeyHex: bytesToHex(seed32) };
}

function deriveTRX(seedHex: string): DerivedAddress {
  // TRON addresses are derived from secp256k1 like ETH but encoded with base58check + 0x41 prefix.
  const root = HDKey.fromMasterSeed(hexToBytes(seedHex));
  const path = "m/44'/195'/0'/0/0";
  const child = root.derive(path);
  if (!child.privateKey) throw new Error("TRX derivation failed");
  const ethAddr = ethers.computeAddress("0x" + bytesToHex(child.privateKey)); // 0x...
  // Convert ETH-style 20-byte addr to TRON base58 (T...)
  const addrBytes = hexToBytes(ethAddr.slice(2));
  const tronBytes = new Uint8Array(21);
  tronBytes[0] = 0x41;
  tronBytes.set(addrBytes, 1);
  // base58check encode
  const sha = async (data: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  // We need a sync-friendly path; use bs58check via npm
  // (importing here lazily would break top-level; use ethers' base58 utility instead)
  const checksum = bitcoin.crypto.hash256(Buffer.from(tronBytes)).slice(0, 4);
  const full = new Uint8Array(25);
  full.set(tronBytes, 0);
  full.set(checksum, 21);
  const tronAddress = bitcoin.address.toBase58Check
    ? // not applicable; use bs58
      ""
    : "";
  // Fallback: use ethers base58 encode
  const tronB58 = ethers.encodeBase58(full);
  return { address: tronB58, derivationPath: path, privateKeyHex: bytesToHex(child.privateKey) };
}

function derive(currency: string, network: string, seedHex: string): DerivedAddress {
  const c = currency.toUpperCase();
  const n = network.toUpperCase();
  if (c === "BTC") return deriveBTC(seedHex);
  if (c === "ETH" || n === "ERC20" || n === "ETHEREUM") return deriveETH(seedHex);
  if (c === "USDT" && n === "TRC20") return deriveTRX(seedHex);
  if (c === "USDT" && (n === "ERC20" || n === "ETHEREUM")) return deriveETH(seedHex);
  if (c === "SOL") return deriveSOL(seedHex);
  if (c === "TRX") return deriveTRX(seedHex);
  if (c === "BNB" || n === "BSC" || n === "BEP20") return deriveETH(seedHex);
  throw new Error(`Unsupported currency/network: ${currency}/${network}`);
}

// ---- Chain balance queries (free public endpoints) ----

async function getBalance(currency: string, network: string, address: string): Promise<{ balance: string; decimals: number }> {
  const c = currency.toUpperCase();
  const n = network.toUpperCase();

  if (c === "BTC") {
    const r = await fetch(`https://blockstream.info/api/address/${address}`);
    if (!r.ok) throw new Error(`BTC balance fetch failed: ${r.status}`);
    const j = await r.json();
    const sats = (j.chain_stats?.funded_txo_sum ?? 0) - (j.chain_stats?.spent_txo_sum ?? 0);
    return { balance: (sats / 1e8).toString(), decimals: 8 };
  }

  if (c === "ETH" || (c === "USDT" && (n === "ERC20" || n === "ETHEREUM")) || n === "BSC" || n === "BEP20") {
    const rpcUrl = (n === "BSC" || n === "BEP20")
      ? "https://bsc-dataseed.binance.org"
      : "https://eth.llamarpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    if (c === "ETH" || c === "BNB") {
      const wei = await provider.getBalance(address);
      return { balance: ethers.formatEther(wei), decimals: 18 };
    }
    // USDT-ERC20
    const usdtAddr = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    const erc20 = new ethers.Contract(usdtAddr, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await erc20.balanceOf(address);
    return { balance: ethers.formatUnits(bal, 6), decimals: 6 };
  }

  if (c === "SOL") {
    const conn = new SolConnection("https://api.mainnet-beta.solana.com", "confirmed");
    const lamports = await conn.getBalance(new SolPublicKey(address));
    return { balance: (lamports / LAMPORTS_PER_SOL).toString(), decimals: 9 };
  }

  if (c === "TRX" || (c === "USDT" && n === "TRC20")) {
    const r = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
    if (!r.ok) throw new Error(`TRX balance fetch failed: ${r.status}`);
    const j = await r.json();
    const acct = j.data?.[0];
    if (!acct) return { balance: "0", decimals: 6 };
    if (c === "TRX") {
      return { balance: ((acct.balance ?? 0) / 1e6).toString(), decimals: 6 };
    }
    // USDT-TRC20
    const usdtContract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    const trc20 = (acct.trc20 ?? []).find((m: Record<string, string>) => Object.keys(m)[0] === usdtContract);
    const raw = trc20 ? Number(Object.values(trc20)[0]) : 0;
    return { balance: (raw / 1e6).toString(), decimals: 6 };
  }

  throw new Error(`Balance not implemented for ${currency}/${network}`);
}

// ---- Validation schemas ----

const CurrencyNetwork = z.object({
  currency: z.string().min(2).max(10),
  network: z.string().min(2).max(20),
});
const WithdrawSchema = CurrencyNetwork.extend({
  to_address: z.string().min(20).max(120),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
});

// ---- Main handler ----

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const userId = userData.user.id;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "generate_address") {
      const parsed = CurrencyNetwork.safeParse(body);
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

      const { data: existing } = await supabaseAdmin
        .from("crypto_addresses")
        .select("address, derivation_path, network")
        .eq("user_id", userId)
        .eq("currency", parsed.data.currency.toUpperCase())
        .eq("network", parsed.data.network.toUpperCase())
        .maybeSingle();

      if (existing) {
        return json({ success: true, address: existing.address, derivation_path: existing.derivation_path });
      }

      const seedHex = await getOrCreateSeed(supabaseAdmin, userId);
      const derived = derive(parsed.data.currency, parsed.data.network, seedHex);

      const { error: insErr } = await supabaseAdmin.from("crypto_addresses").insert({
        user_id: userId,
        currency: parsed.data.currency.toUpperCase(),
        network: parsed.data.network.toUpperCase(),
        address: derived.address,
        derivation_path: derived.derivationPath,
      });
      if (insErr) throw new Error(insErr.message);

      return json({ success: true, address: derived.address, derivation_path: derived.derivationPath });
    }

    if (action === "get_balance") {
      const parsed = CurrencyNetwork.safeParse(body);
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

      const { data: addr } = await supabaseAdmin
        .from("crypto_addresses")
        .select("address")
        .eq("user_id", userId)
        .eq("currency", parsed.data.currency.toUpperCase())
        .eq("network", parsed.data.network.toUpperCase())
        .maybeSingle();
      if (!addr) return json({ error: "Address not generated yet" }, 404);

      const { balance, decimals } = await getBalance(parsed.data.currency, parsed.data.network, addr.address);
      return json({ success: true, address: addr.address, balance, decimals });
    }

    if (action === "list_addresses") {
      const { data, error } = await supabaseAdmin
        .from("crypto_addresses")
        .select("currency, network, address, derivation_path, created_at")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return json({ success: true, addresses: data ?? [] });
    }

    if (action === "request_withdrawal") {
      const parsed = WithdrawSchema.safeParse(body);
      if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

      // Insert pending withdrawal — actual broadcast handled by separate worker / admin approval
      const { data, error } = await supabaseAdmin
        .from("crypto_withdrawals")
        .insert({
          user_id: userId,
          currency: parsed.data.currency.toUpperCase(),
          network: parsed.data.network.toUpperCase(),
          to_address: parsed.data.to_address,
          amount: parsed.data.amount,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return json({ success: true, withdrawal: data });
    }

    if (action === "list_deposits") {
      const { data } = await supabaseAdmin
        .from("crypto_deposits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ success: true, deposits: data ?? [] });
    }

    if (action === "list_withdrawals") {
      const { data } = await supabaseAdmin
        .from("crypto_withdrawals")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(50);
      return json({ success: true, withdrawals: data ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("crypto-wallet error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
