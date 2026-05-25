'use strict';

// ============================================================
// TradePe Command Center v2.0 — Seed Data
// ============================================================

const DATA = {

  fxRate: 83.5,        // TradePe rate (INR per USD)
  bankRate: 82.1,       // Typical bank rate (used to compute savings)
  financingFeePercent: 1.5,

  // ----------------------------------------------------------
  // BUYERS — buyer memory store
  // ----------------------------------------------------------
  buyers: [
    {
      id: 'BUY-001',
      name: 'ABC Textiles',
      country: 'United States',
      countryCode: 'US',
      currency: 'USD',
      defaultPaymentTerms: 'advance',
      isNew: false,
      avgPaymentDays: 8,
      reliabilityScore: 'Excellent',
      totalOrders: 4,
      docsRequired: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin']
    },
    {
      id: 'BUY-002',
      name: 'Muller GmbH',
      country: 'Germany',
      countryCode: 'DE',
      currency: 'EUR',
      defaultPaymentTerms: 'open',
      isNew: true,
      avgPaymentDays: null,
      reliabilityScore: null,
      totalOrders: 0,
      docsRequired: ['Commercial Invoice', 'Packing List', 'Bill of Lading']
    },
    {
      id: 'BUY-003',
      name: 'Sunrise Imports',
      country: 'UAE',
      countryCode: 'AE',
      currency: 'AED',
      defaultPaymentTerms: 'advance',
      isNew: false,
      avgPaymentDays: 12,
      reliabilityScore: 'Good',
      totalOrders: 2,
      docsRequired: ['Commercial Invoice', 'Packing List', 'Bill of Lading']
    }
  ],

  // ----------------------------------------------------------
  // ORDERS — 3 seed orders at different lifecycle stages
  // TRP-201: Payment pending (new buyer → LC card + financing card shown)
  // TRP-202: Awaiting documents (payment done, shipped, uploading docs)
  // TRP-203: Completed (closed order with buyer memory)
  // ----------------------------------------------------------
  orders: [
    {
      id: 'TRP-201',
      buyerId: 'BUY-002',
      invoiceNumber: 'INV-2025-089',
      amountUSD: 30000,
      currency: 'USD',
      paymentTerms: 'open',
      dueDays: 14,
      dueDateDisplay: '7 Jun 2026',
      daysRemaining: 13,
      stage: 'payment-pending',
      urgency: 'needs-attention',
      lcTriggered: true,
      lcApplied: false,
      lcDismissed: false,
      financingOffered: true,
      financingApplied: false,
      financingDismissed: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '24 May 2026',
      buyerActivity: [
        { label: 'Email delivered',  ts: '24 May, 2:32 PM', done: true },
        { label: 'Email opened',     ts: '24 May, 4:15 PM', done: true },
        { label: 'Portal accessed',  ts: '25 May, 9:10 AM', done: true },
        { label: 'Payment initiated', ts: null,              done: false }
      ],
      timeline: [
        { step: 'Order Created',       date: '20 May 2026', status: 'done' },
        { step: 'Payment Requested',   date: '24 May 2026', status: 'done' },
        { step: 'Payment Received',    date: null,          status: 'current' },
        { step: 'Goods Shipped',       date: null,          status: 'locked' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-201-1', name: 'Commercial Invoice', uploaded: false, required: true },
        { id: 'doc-201-2', name: 'Packing List',       uploaded: false, required: true },
        { id: 'doc-201-3', name: 'Bill of Lading',     uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-202',
      buyerId: 'BUY-001',
      invoiceNumber: 'INV-2025-082',
      amountUSD: 15000,
      currency: 'USD',
      paymentTerms: 'advance',
      stage: 'awaiting-documents',
      urgency: 'active',
      lcTriggered: false,
      financingOffered: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '15 May 2026',
      paymentConfirmedDate: '18 May 2026',
      shippedDate: '19 May 2026',
      buyerActivity: [
        { label: 'Email delivered',   ts: '15 May, 10:00 AM', done: true },
        { label: 'Email opened',      ts: '15 May, 11:30 AM', done: true },
        { label: 'Portal accessed',   ts: '15 May, 2:00 PM',  done: true },
        { label: 'Payment initiated', ts: '17 May, 9:00 AM',  done: true }
      ],
      timeline: [
        { step: 'Order Created',       date: '14 May 2026', status: 'done' },
        { step: 'Payment Requested',   date: '15 May 2026', status: 'done' },
        { step: 'Payment Received',    date: '18 May 2026', status: 'done' },
        { step: 'Goods Shipped',       date: '19 May 2026', status: 'done' },
        { step: 'Documents Uploaded',  date: null,          status: 'current' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-202-1', name: 'Commercial Invoice',  uploaded: true,  required: true },
        { id: 'doc-202-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-202-3', name: 'Bill of Lading',      uploaded: false, required: true },
        { id: 'doc-202-4', name: 'Certificate of Origin', uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-203',
      buyerId: 'BUY-003',
      invoiceNumber: 'INV-2025-071',
      amountUSD: 9200,
      currency: 'USD',
      paymentTerms: 'advance',
      stage: 'completed',
      urgency: 'completed',
      lcTriggered: false,
      financingOffered: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '28 Apr 2026',
      paymentConfirmedDate: '2 May 2026',
      shippedDate: '3 May 2026',
      closedDate: '10 May 2026',
      buyerActivity: [
        { label: 'Email delivered',   ts: '28 Apr, 10:00 AM', done: true },
        { label: 'Email opened',      ts: '28 Apr, 11:30 AM', done: true },
        { label: 'Portal accessed',   ts: '29 Apr, 9:00 AM',  done: true },
        { label: 'Payment initiated', ts: '1 May, 11:00 AM',  done: true }
      ],
      timeline: [
        { step: 'Order Created',       date: '27 Apr 2026', status: 'done' },
        { step: 'Payment Requested',   date: '28 Apr 2026', status: 'done' },
        { step: 'Payment Received',    date: '2 May 2026',  status: 'done' },
        { step: 'Goods Shipped',       date: '3 May 2026',  status: 'done' },
        { step: 'Documents Uploaded',  date: '8 May 2026',  status: 'done' },
        { step: 'Order Closed',        date: '10 May 2026', status: 'done' }
      ],
      documents: [
        { id: 'doc-203-1', name: 'Commercial Invoice', uploaded: true, required: true },
        { id: 'doc-203-2', name: 'Packing List',       uploaded: true, required: true },
        { id: 'doc-203-3', name: 'Bill of Lading',     uploaded: true, required: true }
      ],
      buyerMemory: { paymentDays: 4, reliabilityScore: 'Excellent' }
    }
  ],

  // ----------------------------------------------------------
  // DOCUMENT REQUIREMENTS BY DESTINATION COUNTRY
  // ----------------------------------------------------------
  docsByCountry: {
    'US': ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin'],
    'DE': ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'EUR1 Certificate'],
    'AE': ['Commercial Invoice', 'Packing List', 'Bill of Lading'],
    'GB': ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Packing Declaration'],
    'JP': ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin'],
    'SG': ['Commercial Invoice', 'Packing List', 'Bill of Lading'],
    'AU': ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Phytosanitary Certificate'],
    'CN': ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin'],
    'default': ['Commercial Invoice', 'Packing List', 'Bill of Lading']
  }

};
