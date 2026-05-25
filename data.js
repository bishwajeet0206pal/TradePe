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
    },

    {
      id: 'TRP-204',
      buyerId: 'BUY-001',
      invoiceNumber: 'INV-2026-001',
      amountUSD: 45000,
      currency: 'USD',
      paymentTerms: 'open',
      stage: 'order-created',
      urgency: 'needs-attention',
      lcTriggered: false,
      lcApplied: false,
      lcDismissed: false,
      financingOffered: false,
      financingApplied: false,
      financingDismissed: false,
      paymentRequestSent: false,
      timeline: [
        { step: 'Order Created',       date: '24 May 2026', status: 'current' },
        { step: 'Payment Requested',   date: null,          status: 'locked' },
        { step: 'Payment Received',    date: null,          status: 'locked' },
        { step: 'Goods Shipped',       date: null,          status: 'locked' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-204-1', name: 'Commercial Invoice',  uploaded: false, required: true },
        { id: 'doc-204-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-204-3', name: 'Bill of Lading',      uploaded: false, required: true },
        { id: 'doc-204-4', name: 'Certificate of Origin', uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-205',
      buyerId: 'BUY-002',
      invoiceNumber: 'INV-2026-002',
      amountUSD: 12500,
      currency: 'USD',
      paymentTerms: 'advance',
      stage: 'order-created',
      urgency: 'needs-attention',
      lcTriggered: false,
      lcApplied: false,
      lcDismissed: false,
      financingOffered: false,
      financingApplied: false,
      financingDismissed: false,
      paymentRequestSent: false,
      timeline: [
        { step: 'Order Created',       date: '25 May 2026', status: 'current' },
        { step: 'Payment Requested',   date: null,          status: 'locked' },
        { step: 'Payment Received',    date: null,          status: 'locked' },
        { step: 'Goods Shipped',       date: null,          status: 'locked' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-205-1', name: 'Commercial Invoice',  uploaded: false, required: true },
        { id: 'doc-205-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-205-3', name: 'Bill of Lading',      uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-206',
      buyerId: 'BUY-003',
      invoiceNumber: 'INV-2026-003',
      amountUSD: 22000,
      currency: 'USD',
      paymentTerms: 'open',
      dueDays: 30,
      dueDateDisplay: '24 Jun 2026',
      daysRemaining: 30,
      stage: 'payment-pending',
      urgency: 'needs-attention',
      lcTriggered: false,
      lcApplied: false,
      lcDismissed: false,
      financingOffered: true,
      financingApplied: false,
      financingDismissed: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '25 May 2026',
      buyerActivity: [
        { label: 'Email delivered',  ts: '25 May, 10:00 AM', done: true },
        { label: 'Email opened',     ts: '25 May, 10:45 AM', done: true },
        { label: 'Portal accessed',  ts: null,               done: false },
        { label: 'Payment initiated', ts: null,              done: false }
      ],
      timeline: [
        { step: 'Order Created',       date: '22 May 2026', status: 'done' },
        { step: 'Payment Requested',   date: '25 May 2026', status: 'done' },
        { step: 'Payment Received',    date: null,          status: 'current' },
        { step: 'Goods Shipped',       date: null,          status: 'locked' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-206-1', name: 'Commercial Invoice',  uploaded: false, required: true },
        { id: 'doc-206-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-206-3', name: 'Bill of Lading',      uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-207',
      buyerId: 'BUY-002',
      invoiceNumber: 'INV-2026-004',
      amountUSD: 60000,
      currency: 'USD',
      paymentTerms: 'open',
      dueDays: 45,
      dueDateDisplay: '9 Jul 2026',
      daysRemaining: 45,
      stage: 'payment-pending',
      urgency: 'needs-attention',
      lcTriggered: true,
      lcApplied: false,
      lcDismissed: false,
      financingOffered: false,
      financingApplied: false,
      financingDismissed: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '25 May 2026',
      buyerActivity: [
        { label: 'Email delivered',  ts: '25 May, 10:15 AM', done: true },
        { label: 'Email opened',     ts: '25 May, 11:00 AM', done: true },
        { label: 'Portal accessed',  ts: null,               done: false },
        { label: 'Payment initiated', ts: null,              done: false }
      ],
      timeline: [
        { step: 'Order Created',       date: '21 May 2026', status: 'done' },
        { step: 'Payment Requested',   date: '25 May 2026', status: 'done' },
        { step: 'Payment Received',    date: null,          status: 'current' },
        { step: 'Goods Shipped',       date: null,          status: 'locked' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-207-1', name: 'Commercial Invoice',  uploaded: false, required: true },
        { id: 'doc-207-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-207-3', name: 'Bill of Lading',      uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-208',
      buyerId: 'BUY-003',
      invoiceNumber: 'INV-2026-005',
      amountUSD: 8500,
      currency: 'USD',
      paymentTerms: 'advance',
      stage: 'payment-confirmed',
      urgency: 'active',
      lcTriggered: false,
      financingOffered: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '10 May 2026',
      paymentConfirmedDate: '12 May 2026',
      buyerActivity: [
        { label: 'Email delivered',   ts: '10 May, 9:00 AM',  done: true },
        { label: 'Email opened',      ts: '10 May, 9:30 AM',  done: true },
        { label: 'Portal accessed',   ts: '11 May, 10:00 AM', done: true },
        { label: 'Payment initiated', ts: '12 May, 2:00 PM',  done: true }
      ],
      timeline: [
        { step: 'Order Created',       date: '9 May 2026',  status: 'done' },
        { step: 'Payment Requested',   date: '10 May 2026', status: 'done' },
        { step: 'Payment Received',    date: '12 May 2026', status: 'done' },
        { step: 'Goods Shipped',       date: null,          status: 'current' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-208-1', name: 'Commercial Invoice',  uploaded: false, required: true },
        { id: 'doc-208-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-208-3', name: 'Bill of Lading',      uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-209',
      buyerId: 'BUY-002',
      invoiceNumber: 'INV-2026-006',
      amountUSD: 18000,
      currency: 'USD',
      paymentTerms: 'open',
      stage: 'payment-confirmed',
      urgency: 'active',
      lcTriggered: false,
      financingOffered: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '12 May 2026',
      paymentConfirmedDate: '15 May 2026',
      buyerActivity: [
        { label: 'Email delivered',   ts: '12 May, 11:00 AM', done: true },
        { label: 'Email opened',      ts: '12 May, 11:15 AM', done: true },
        { label: 'Portal accessed',   ts: '13 May, 9:00 AM',  done: true },
        { label: 'Payment initiated', ts: '15 May, 4:00 PM',  done: true }
      ],
      timeline: [
        { step: 'Order Created',       date: '11 May 2026', status: 'done' },
        { step: 'Payment Requested',   date: '12 May 2026', status: 'done' },
        { step: 'Payment Received',    date: '15 May 2026', status: 'done' },
        { step: 'Goods Shipped',       date: null,          status: 'current' },
        { step: 'Documents Uploaded',  date: null,          status: 'locked' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-209-1', name: 'Commercial Invoice',  uploaded: false, required: true },
        { id: 'doc-209-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-209-3', name: 'Bill of Lading',      uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-210',
      buyerId: 'BUY-001',
      invoiceNumber: 'INV-2026-007',
      amountUSD: 27500,
      currency: 'USD',
      paymentTerms: 'open',
      stage: 'awaiting-documents',
      urgency: 'active',
      lcTriggered: false,
      financingOffered: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '8 May 2026',
      paymentConfirmedDate: '12 May 2026',
      shippedDate: '14 May 2026',
      buyerActivity: [
        { label: 'Email delivered',   ts: '8 May, 10:00 AM', done: true },
        { label: 'Email opened',      ts: '8 May, 11:30 AM', done: true },
        { label: 'Portal accessed',   ts: '9 May, 9:00 AM',  done: true },
        { label: 'Payment initiated', ts: '11 May, 2:00 PM',  done: true }
      ],
      timeline: [
        { step: 'Order Created',       date: '7 May 2026',  status: 'done' },
        { step: 'Payment Requested',   date: '8 May 2026',  status: 'done' },
        { step: 'Payment Received',    date: '12 May 2026', status: 'done' },
        { step: 'Goods Shipped',       date: '14 May 2026', status: 'done' },
        { step: 'Documents Uploaded',  date: null,          status: 'current' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-210-1', name: 'Commercial Invoice',  uploaded: true,  required: true },
        { id: 'doc-210-2', name: 'Packing List',        uploaded: true,  required: true },
        { id: 'doc-210-3', name: 'Bill of Lading',      uploaded: false, required: true },
        { id: 'doc-210-4', name: 'Certificate of Origin', uploaded: false, required: true }
      ]
    },

    {
      id: 'TRP-211',
      buyerId: 'BUY-003',
      invoiceNumber: 'INV-2026-008',
      amountUSD: 14000,
      currency: 'USD',
      paymentTerms: 'advance',
      stage: 'awaiting-documents',
      urgency: 'active',
      lcTriggered: false,
      financingOffered: false,
      paymentRequestSent: true,
      paymentRequestSentDate: '12 May 2026',
      paymentConfirmedDate: '14 May 2026',
      shippedDate: '16 May 2026',
      buyerActivity: [
        { label: 'Email delivered',   ts: '12 May, 10:00 AM', done: true },
        { label: 'Email opened',      ts: '12 May, 11:30 AM', done: true },
        { label: 'Portal accessed',   ts: '13 May, 9:00 AM',  done: true },
        { label: 'Payment initiated', ts: '14 May, 1:00 PM',  done: true }
      ],
      timeline: [
        { step: 'Order Created',       date: '11 May 2026', status: 'done' },
        { step: 'Payment Requested',   date: '12 May 2026', status: 'done' },
        { step: 'Payment Received',    date: '14 May 2026', status: 'done' },
        { step: 'Goods Shipped',       date: '16 May 2026', status: 'done' },
        { step: 'Documents Uploaded',  date: null,          status: 'current' },
        { step: 'Order Closed',        date: null,          status: 'locked' }
      ],
      documents: [
        { id: 'doc-211-1', name: 'Commercial Invoice',  uploaded: true,  required: true },
        { id: 'doc-211-2', name: 'Packing List',        uploaded: false, required: true },
        { id: 'doc-211-3', name: 'Bill of Lading',      uploaded: false, required: true }
      ]
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
