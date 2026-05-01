// lib/vault/encryption.js
// 'use client' — runs ONLY in browser via Web Crypto API
// Never import this file in server-side code
// Architecture Law 2: encryption happens in browser only

'use client'

// --- ENCRYPTION CONSTANTS ---------------------------------
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256        // AES-256
const IV_LENGTH  = 12         // 96-bit IV — GCM standard
const TAG_LENGTH = 128        // Authentication tag bits

/**
 * generateEncryptionKey
 * Generates a new AES-256 key for a document
 */
export async function generateEncryptionKey() {
  const key = await window.crypto.subtle.generateKey(
    {
      name:   ALGORITHM,
      length: KEY_LENGTH
    },
    true,
    ['encrypt', 'decrypt']
  )
  return key
}

/**
 * exportKeyToBase64
 * Converts CryptoKey to base64 string
 */
export async function exportKeyToBase64(cryptoKey) {
  const rawKey  = await window.crypto.subtle.exportKey('raw', cryptoKey)
  const bytes   = new Uint8Array(rawKey)
  const binary  = bytes.reduce(
    (str, byte) => str + String.fromCharCode(byte), ''
  )
  return window.btoa(binary)
}

/**
 * importKeyFromBase64
 * Reconstructs CryptoKey from base64
 */
export async function importKeyFromBase64(base64Key) {
  const binary  = window.atob(base64Key)
  const bytes   = Uint8Array.from(binary, c => c.charCodeAt(0))

  return window.crypto.subtle.importKey(
    'raw',
    bytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  )
}

/**
 * hashKey
 * Creates a SHA-256 hash of the key
 */
export async function hashKey(base64Key) {
  const encoder  = new TextEncoder()
  const data     = encoder.encode(base64Key)
  const hashBuf  = await window.crypto.subtle.digest('SHA-256', data)
  const hashArr  = Array.from(new Uint8Array(hashBuf))
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * encryptFile
 * Encrypts a File object using AES-256-GCM
 */
export async function encryptFile(file) {
  const key      = await generateEncryptionKey()
  const keyBase64 = await exportKeyToBase64(key)
  const keyHash  = await hashKey(keyBase64)

  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  // Assert IV length for Law 2 compliance
  if (iv.length !== 12) throw new Error('Security: IV generation failure')

  const ivBase64 = window.btoa(String.fromCharCode(...iv))
  const fileBuffer = await file.arrayBuffer()

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name:    ALGORITHM,
      iv,
      tagLength: TAG_LENGTH
    },
    key,
    fileBuffer
  )

  const combined = new Uint8Array(IV_LENGTH + encryptedBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedBuffer), IV_LENGTH)

  const encryptedBlob = new Blob(
    [combined],
    { type: 'application/octet-stream' }
  )

  return {
    encryptedBlob,
    keyBase64,
    keyHash,
    ivBase64,
    originalSize:     file.size,
    encryptedSize:    encryptedBlob.size,
    algorithm:        `${ALGORITHM}-${KEY_LENGTH}`,
    mimeType:         file.type,
    originalName:     file.name
  }
}

/**
 * decryptFile
 * Decrypts an encrypted blob using a CryptoKey
 */
export async function decryptFile(encryptedBlob, keyBase64) {
  const key = await importKeyFromBase64(keyBase64)
  const encryptedBuffer = await encryptedBlob.arrayBuffer()
  const combined = new Uint8Array(encryptedBuffer)

  const iv = combined.slice(0, IV_LENGTH)
  if (iv.length !== 12) throw new Error('Tamper detection: Invalid IV length')

  const encryptedData = combined.slice(IV_LENGTH)

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
      key,
      encryptedData
    )
    return new Blob([decryptedBuffer])
  } catch (err) {
    throw new Error('Decryption failed: Key mismatch or data tampered.')
  }
}

export async function generateAccessKey(
  documentKeyBase64,
  professionalId,
  expiryTimestamp
) {
  const encoder  = new TextEncoder()
  const password = encoder.encode(
    `${documentKeyBase64}:${professionalId}:${expiryTimestamp}`
  )

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    password,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const salt       = encoder.encode(professionalId)
  const accessKey  = await window.crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt,
      iterations: 100000,
      hash:       'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )

  const accessKeyBase64 = await exportKeyToBase64(accessKey)
  return {
    accessKeyBase64,
    professionalId,
    expiresAt:     new Date(expiryTimestamp).toISOString(),
    algorithm:     'PBKDF2-AES-256-GCM'
  }
}

export function validateWebCryptoSupport() {
  if (typeof window === 'undefined') {
    throw new Error('Web Crypto API is browser-only')
  }
  if (!window.crypto?.subtle) {
    throw new Error('Your browser does not support secure encryption.')
  }
  return true
}
