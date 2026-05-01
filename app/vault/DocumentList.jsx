// app/vault/DocumentList.jsx
'use client'

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

export function DocumentList({ documents }) {
  const DOC_TYPE_LABELS = {
    property_deed:        'Property Deed',
    financial_statement:  'Financial Statement',
    petition:             'Petition',
    correspondence:       'Correspondence',
    custody_agreement:    'Custody Agreement',
    valuation_report:     'Valuation Report',
    tax_return:           'Tax Return',
    bank_statement:       'Bank Statement',
    identity_proof:       'Identity Document',
    other:                'Document'
  }

  const formatBytes = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06)'
      }}
      role="list"
      aria-label="Uploaded documents"
    >
      {documents.map((doc, index) => (
        <motion.div
          key={doc.id}
          variants={MESSAGE_VARIANTS}
          initial="hidden"
          animate="visible"
          role="listitem"
          style={{
            padding: '16px 20px',
            borderBottom: index < documents.length - 1
              ? '1px solid var(--border-subtle)'
              : 'none',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          {/* Document icon */}
          <span
            style={{
              fontSize: '20px',
              flexShrink: 0,
              lineHeight: 1.2,
              marginTop: '1px'
            }}
            aria-hidden="true"
          >
            {getDocumentIcon(doc.document_type)}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Label */}
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '14px',
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0 0 2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {doc.label}
            </p>

            {/* Type + size */}
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                margin: '0 0 6px'
              }}
            >
              {DOC_TYPE_LABELS[doc.document_type] || 'Document'}
              {doc.file_size_bytes && (
                <span style={{ marginLeft: '8px' }}>
                  {formatBytes(doc.file_size_bytes)}
                </span>
              )}
            </p>

            {/* IPFS hash in Geist Mono — from demo script */}
            <p
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '10px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                letterSpacing: '+0.02em',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              aria-label={`IPFS: ${doc.ipfs_hash}`}
              title={doc.ipfs_hash}
            >
              {doc.ipfs_hash}
            </p>
          </div>

          {/* Encrypted indicator */}
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--success)',
              letterSpacing: '+0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
              marginTop: '2px'
            }}
            aria-label="Encrypted"
          >
            Encrypted
          </span>
        </motion.div>
      ))}
    </div>
  )
}

function getDocumentIcon(documentType) {
  const icons = {
    property_deed:       '??',
    financial_statement: '??',
    petition:            '??',
    custody_agreement:   '??',
    bank_statement:      '??',
    tax_return:          '??',
    valuation_report:    '??',
    correspondence:      '??',
    identity_proof:      '??',
    other:               '??'
  }
  return icons[documentType] || '??'
}
