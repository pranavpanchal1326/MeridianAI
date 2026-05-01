// app/vault/DocumentVault.jsx
'use client'

import {
  useState,
  useCallback,
  useRef
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MESSAGE_VARIANTS,
  TRANSITIONS
} from '@/lib/constants/animations'
import { useDocumentVault } from '@/lib/realtime/useChannel'
import { UploadZone } from './UploadZone'
import { DocumentList } from './DocumentList'
import { EncryptionProgress } from './EncryptionProgress'
import { KeyStoragePrompt } from './KeyStoragePrompt'
import { EmptyState } from '@/app/components/ui'
import {
  validateWebCryptoSupport,
  encryptFile,
  exportKeyToBase64
} from '@/lib/vault/encryption'

/**
 * DocumentVault
 * Complete vault UI with browser-side encryption
 *
 * Upload flow:
 * 1. User selects file
 * 2. Browser encrypts using Web Crypto API (shown to user)
 * 3. IPFS hash displayed in Geist Mono
 * 4. Key storage prompt — user saves key to MetaMask
 * 5. Document listed with IPFS hash
 *
 * From demo script Section 13 (3:50–4:30):
 * "Upload a document. Encrypting in browser.
 *  IPFS hash in Geist Mono."
 */
export function DocumentVault({
  caseId,
  userId,
  initialDocuments = []
}) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [uploadState, setUploadState] = useState('idle')
  // idle | encrypting | uploading | key_prompt | complete | error
  const [currentFile, setCurrentFile] = useState(null)
  const [encryptionResult, setEncryptionResult] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)

  // Realtime: new documents from other devices
  useDocumentVault(caseId, useCallback((update) => {
    if (update.document_id) {
      // Refetch documents list on realtime update
      fetchDocuments()
    }
  }, []))

  const fetchDocuments = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/documents/access?case_id=${caseId}&user_id=${userId}`
      )
      if (r.ok) {
        const data = await r.json()
        setDocuments(data.documents || [])
      }
    } catch { /* non-fatal */ }
  }, [caseId, userId])

  // Handle file selection
  const handleFileSelect = useCallback(async (file) => {
    setError(null)
    setCurrentFile(file)

    // Validate browser support
    try {
      validateWebCryptoSupport()
    } catch (err) {
      setError(err.message)
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError(
        'File too large. Maximum size is 50MB. ' +
        'Please compress your document first.'
      )
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      setError(
        'File type not supported. Please upload PDF, ' +
        'JPG, PNG, or Word documents.'
      )
      return
    }

    setUploadState('encrypting')
    setProgress(0)

    try {
      // STEP 1: Encrypt in browser
      // This is where "Encrypting in browser" happens (demo script)
      const result = await encryptFile(file)
      setEncryptionResult(result)
      setProgress(50)

      // STEP 2: Upload encrypted blob to IPFS
      setUploadState('uploading')

      const formData = new FormData()
      formData.append('encrypted_file', result.encryptedBlob)
      formData.append('key_hash',       result.keyHash)
      formData.append('iv_base64',      result.ivBase64)
      formData.append('label',          file.name)
      formData.append('document_type',  detectDocumentType(file))
      formData.append('case_id',        caseId)
      formData.append('user_id',        userId)
      formData.append('mime_type',      file.type)
      formData.append('original_size',  String(file.size))

      const uploadResponse = await fetch(
        '/api/documents/upload',
        { method: 'POST', body: formData }
      )

      if (!uploadResponse.ok) {
        const err = await uploadResponse.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploaded = await uploadResponse.json()
      setUploadResult(uploaded)
      setProgress(100)

      // STEP 3: Show key storage prompt
      // User must save their key to MetaMask
      setUploadState('key_prompt')

    } catch (err) {
      console.error('[Vault] Upload failed:', err)
      setError(err.message)
      setUploadState('error')
    }
  }, [caseId, userId])

  const handleKeyStored = useCallback(() => {
    // User has stored their key — add document to list
    if (uploadResult) {
      setDocuments(prev => [
        {
          id:            uploadResult.document_id,
          ipfs_hash:     uploadResult.ipfs_hash,
          label:         currentFile?.name || 'Document',
          document_type: detectDocumentType(currentFile),
          uploaded_at:   uploadResult.uploaded_at,
          file_size_bytes: currentFile?.size
        },
        ...prev
      ])
    }

    // Reset state
    setUploadState('idle')
    setCurrentFile(null)
    setEncryptionResult(null)
    setUploadResult(null)
    setProgress(0)
    setError(null)
  }, [uploadResult, currentFile])

  const handleRetry = useCallback(() => {
    setUploadState('idle')
    setError(null)
    setCurrentFile(null)
    setEncryptionResult(null)
    setProgress(0)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* Upload zone — hidden during upload flow */}
      <AnimatePresence>
        {uploadState === 'idle' && (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.standard}
          >
            <UploadZone onFileSelect={handleFileSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Encryption + upload progress */}
      <AnimatePresence>
        {(uploadState === 'encrypting' ||
          uploadState === 'uploading') && (
          <EncryptionProgress
            stage={uploadState}
            fileName={currentFile?.name}
            progress={progress}
            fileSize={currentFile?.size}
          />
        )}
      </AnimatePresence>

      {/* Key storage prompt */}
      <AnimatePresence>
        {uploadState === 'key_prompt' && (
          <KeyStoragePrompt
            encryptionResult={encryptionResult}
            uploadResult={uploadResult}
            onKeyStored={handleKeyStored}
          />
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {uploadState === 'error' && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              style={{
                backgroundColor: 'var(--danger-soft)',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid var(--danger)'
              }}
              role="alert"
            >
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  color: 'var(--danger)',
                  margin: '0 0 8px',
                  fontWeight: 500
                }}
              >
                Upload did not complete
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  margin: '0 0 12px'
                }}
              >
                {error}
              </p>
              <button
                onClick={handleRetry}
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  letterSpacing: '+0.02em',
                  textTransform: 'uppercase'
                }}
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents list */}
      {documents.length === 0 &&
       uploadState === 'idle' ? (
        <EmptyState screen="documents" />
      ) : (
        <DocumentList documents={documents} />
      )}
    </div>
  )
}

function detectDocumentType(file) {
  if (!file) return 'other'
  const name = file.name?.toLowerCase() || ''
  if (name.includes('deed') || name.includes('property')) return 'property_deed'
  if (name.includes('petition'))                            return 'petition'
  if (name.includes('statement') || name.includes('bank')) return 'bank_statement'
  if (name.includes('tax'))                                return 'tax_return'
  if (name.includes('custody'))                            return 'custody_agreement'
  if (name.includes('valuation'))                          return 'valuation_report'
  if (name.includes('financial') || name.includes('fin'))  return 'financial_statement'
  return 'other'
}
