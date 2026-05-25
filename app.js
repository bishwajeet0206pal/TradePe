/**
 * TradePe Command Center v2.0
 * Core Application Logic
 *
 * Architecture: IIFE module exposing a public API.
 * State is held in memory; DATA (data.js) is cloned on init.
 * Every user action flows: user event → state mutation → re-render.
 */

'use strict';

const app = (() => {

  // ============================================================
  // STATE
  // ============================================================
  const S = {
    screen: 'home',
    orderId: null,          // currently open order
    subTab: 'overview',
    funnelLog: [],
    dismissed: {},          // { orderId: { lc: bool, fin: bool } }
    orders: null,           // cloned from DATA.orders on init
    buyers: null,           // cloned from DATA.buyers on init
    nextNum: 204,
    pendingLCOrderId: null,
    pendingFinOrderId: null,
    noState: null           // new-order form state
  };

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    S.orders = JSON.parse(JSON.stringify(DATA.orders));
    S.buyers = JSON.parse(JSON.stringify(DATA.buyers));
    renderHome();
    showScreen('home');
  }

  // ============================================================
  // SCREEN ROUTER
  // ============================================================
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    S.screen = id;

    // Sidebar active state
    const map = {
      'home': 'nav-home', 'order-detail': 'nav-orders',
      'new-order': 'nav-orders', 'lc-inquiry': 'nav-orders',
      'financing': 'nav-orders', 'documents': 'nav-documents',
      'profile': 'nav-profile'
    };
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = map[id];
    if (nav) { const n = document.getElementById(nav); if (n) n.classList.add('active'); }

    // FAB only on home
    const fab = document.getElementById('fab-btn');
    if (fab) fab.style.display = id === 'home' ? 'flex' : 'none';
  }

  // ============================================================
  // NAV TARGETS
  // ============================================================
  function goHome()        { renderHome(); showScreen('home'); }
  function goDocuments()   { renderDocuments(); showScreen('documents'); }
  function goProfile()     { showScreen('profile'); }

  // ============================================================
  // HOME SCREEN
  // ============================================================
  function renderHome() {
    renderCounters();
    renderOrderCards();
    updateBadge();
  }

  function renderCounters() {
    const active    = S.orders.filter(o => o.urgency === 'active').length;
    const attention = S.orders.filter(o => o.urgency === 'needs-attention').length;
    const completed = S.orders.filter(o => o.stage === 'completed').length;
    const overdue   = S.orders.filter(o => o.urgency === 'overdue').length;

    document.getElementById('home-counters').innerHTML = `
      <div class="counter-card">
        <div class="counter-label">Active</div>
        <div class="counter-value">${active}</div>
      </div>
      <div class="counter-card attention">
        <div class="counter-label">Needs Attention</div>
        <div class="counter-value">${attention}</div>
      </div>
      <div class="counter-card completed">
        <div class="counter-label">Completed</div>
        <div class="counter-value">${completed}</div>
      </div>
      <div class="counter-card overdue">
        <div class="counter-label">Overdue</div>
        <div class="counter-value">${overdue}</div>
      </div>`;
  }

  function renderOrderCards() {
    const urgencyRank = { 'overdue': 0, 'needs-attention': 1, 'active': 2, 'completed': 3 };
    const sorted = [...S.orders].sort((a, b) =>
      (urgencyRank[a.urgency] ?? 4) - (urgencyRank[b.urgency] ?? 4)
    );

    const flags = { 'US': '🇺🇸', 'DE': '🇩🇪', 'AE': '🇦🇪' };

    const rows = sorted.map(o => {
      const buyer = getBuyer(o.buyerId);
      const na = nextAction(o);
      
      const stages = {
        'order-created':     ['Awaiting Request', 'badge-warn'],
        'payment-pending':   ['Awaiting Payment', 'badge-warn'],
        'payment-confirmed': ['Payment Confirmed', 'badge-primary'],
        'awaiting-documents':['Uploading Docs', 'badge-primary'],
        'overdue':           ['Overdue', 'badge-error'],
        'completed':         ['Completed', 'badge-success']
      };
      const [stageTxt, stageCls] = stages[o.stage] || [o.stage, 'badge-muted'];

      const urgencies = {
        'needs-attention': ['Needs Attention', 'badge-warn'],
        'active':          ['Active', 'badge-primary'],
        'completed':       ['Completed', 'badge-success'],
        'overdue':         ['Overdue', 'badge-error']
      };
      const [urgencyTxt, urgencyCls] = urgencies[o.urgency] || [o.urgency, 'badge-muted'];

      const countryFlag = buyer ? (flags[buyer.countryCode] || '🏳️') : '🏳️';
      const countryName = buyer ? buyer.country : '—';

      return `
        <tr>
          <td>
            <div class="t-order-id">${o.id}</div>
            <div class="t-invoice-number">${o.invoiceNumber}</div>
          </td>
          <td>
            <div class="t-buyer-name">${buyer ? buyer.name : '—'}</div>
            <div class="t-country-code">${countryFlag} ${countryName}</div>
          </td>
          <td>
            <span class="badge ${stageCls}">${stageTxt}</span>
          </td>
          <td>
            <div class="t-next-action-text">${na.text}</div>
          </td>
          <td>
            <div class="t-amount-usd">${fmtAmt(o.amountUSD, o.currency)}</div>
          </td>
          <td>
            <div class="t-amount-inr">${fmtINR(o.amountUSD)}</div>
          </td>
          <td>
            <span class="badge ${urgencyCls}">${urgencyTxt}</span>
          </td>
          <td style="text-align:right;">
            <button class="btn btn-secondary btn-sm" onclick="app.openOrder('${o.id}')">Manage</button>
          </td>
        </tr>`;
    }).join('');

    document.getElementById('home-orders-list').innerHTML = `
      <div class="table-container">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Buyer</th>
              <th>Stage</th>
              <th>Next Action</th>
              <th>Amount</th>
              <th>INR Value</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
  }

  function updateBadge() {
    const n = S.orders.filter(o => o.urgency === 'needs-attention' || o.urgency === 'overdue').length;
    const b = document.getElementById('nav-orders-badge');
    if (b) { b.textContent = n; b.style.display = n > 0 ? '' : 'none'; }
  }

  // ============================================================
  // ORDER DETAIL
  // ============================================================
  function openOrder(id) {
    S.orderId  = id;
    S.subTab   = 'overview';
    renderOrderDetail();
    showScreen('order-detail');
  }

  function renderOrderDetail() {
    const o = getOrder(S.orderId);
    if (!o) return;
    const buyer = getBuyer(o.buyerId);

    // Header
    document.getElementById('od-header').innerHTML = `
      <div class="od-header">
        <div class="od-back" onclick="app.goHome()">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
          All orders
        </div>
        <div class="od-meta">
          <div>
            <div class="od-id">${o.id} &nbsp;·&nbsp; ${o.invoiceNumber}</div>
            <div class="od-buyer">${buyer ? buyer.name : '—'}</div>
            <div class="od-sub">${buyer ? buyer.country : ''} &nbsp;·&nbsp; ${o.currency} &nbsp;·&nbsp; ${o.paymentTerms === 'advance' ? 'Advance payment' : 'Open account'}</div>
          </div>
          <div>
            <div class="od-amount">${fmtAmt(o.amountUSD, o.currency)}</div>
            <div class="od-amount-inr">&asymp; ${fmtINR(o.amountUSD)}</div>
          </div>
        </div>
        <div class="sub-tabs">
          ${['overview','timeline','documents','payment','close'].map(t => `
            <div class="sub-tab ${S.subTab === t ? 'active' : ''}" onclick="app.switchTab('${t}')">${tabLabel(t)}</div>
          `).join('')}
        </div>
      </div>`;

    // Next action banner
    const na = nextAction(o);
    document.getElementById('na-banner').innerHTML = `
      <div class="next-action-banner ${na.color}">
        <div class="na-content">
          <div class="na-label">Next action</div>
          <div class="na-text">${na.text}</div>
        </div>
        ${na.cta ? `<button class="btn btn-primary" onclick="app.${na.fn}('${o.id}')">${na.cta}</button>` : ''}
      </div>`;

    renderSubTab(o);
  }

  function tabLabel(t) {
    return { overview: 'Overview', timeline: 'Timeline', documents: 'Documents', payment: 'Payment', close: 'Close Order' }[t] || t;
  }

  function switchTab(t) {
    S.subTab = t;
    renderOrderDetail();
  }

  function renderSubTab(o) {
    const renders = {
      overview:  renderOverview,
      timeline:  renderTimeline,
      documents: renderDocs,
      payment:   renderPayment,
      close:     renderClose
    };
    document.getElementById('od-body').innerHTML = (renders[S.subTab] || renderOverview)(o);
  }

  // ---- OVERVIEW ----
  function renderOverview(o) {
    const buyer = getBuyer(o.buyerId);
    const stages = {
      'order-created':     ['Awaiting payment request', 'badge-warn'],
      'payment-pending':   ['Waiting for payment', 'badge-warn'],
      'payment-confirmed': ['Payment received', 'badge-primary'],
      'awaiting-documents':['Uploading documents', 'badge-primary'],
      'overdue':           ['Payment overdue', 'badge-error'],
      'completed':         ['Completed', 'badge-success']
    };
    const [stageTxt, stageCls] = stages[o.stage] || ['Unknown', 'badge-muted'];

    // LC discovery card
    let lcCard = '';
    if (o.lcTriggered && !o.lcApplied) {
      const dismissed = (S.dismissed[o.id] || {}).lc;
      if (!dismissed) {
        lcCard = `
          <div class="disc-card lc">
            <span class="disc-badge">&#128737;</span>
            <div class="disc-tag">New product &mdash; Letter of Credit</div>
            <div class="disc-title">Protect your payment with an LC</div>
            <div class="disc-desc">This is a new buyer. A Letter of Credit guarantees you get paid before you ship. Apply through TradePe's partner bank — no branch visit needed. Decision in 2 business days.</div>
            <div class="disc-actions">
              <button class="btn btn-primary" onclick="app.openLC('${o.id}')">Apply for LC</button>
              <button class="disc-dismiss" onclick="app.dismissLC('${o.id}')">Proceed without LC</button>
            </div>
          </div>`;
      }
    }
    if (o.lcApplied) {
      lcCard = `
        <div class="alert-strip info" style="display:flex;align-items:center;gap:var(--s3);">
          <span>&#128737;</span>
          <div><strong>LC application submitted</strong> &mdash; Partner bank reviewing. Decision in 2 business days.</div>
          <span class="badge badge-muted" style="margin-left:auto;">Pending</span>
        </div>`;
    }

    return `
      <div class="sub-panel active">
        ${lcCard}
        <div class="info-grid">
          <div class="info-cell"><div class="info-label">Buyer</div><div class="info-val">${buyer ? buyer.name : '—'}</div></div>
          <div class="info-cell"><div class="info-label">Country</div><div class="info-val">${buyer ? buyer.country : '—'}</div></div>
          <div class="info-cell"><div class="info-label">Invoice</div><div class="info-val mono">${o.invoiceNumber}</div></div>
          <div class="info-cell"><div class="info-label">Payment terms</div><div class="info-val">${o.paymentTerms === 'advance' ? 'Advance payment' : 'Open account'}</div></div>
          <div class="info-cell"><div class="info-label">Amount</div><div class="info-val">${fmtAmt(o.amountUSD, o.currency)}</div></div>
          <div class="info-cell"><div class="info-label">INR equivalent</div><div class="info-val">${fmtINR(o.amountUSD)}</div></div>
          <div class="info-cell"><div class="info-label">Stage</div><div class="info-val"><span class="badge ${stageCls}">${stageTxt}</span></div></div>
          ${o.daysRemaining !== undefined && o.stage === 'payment-pending' ? `<div class="info-cell"><div class="info-label">Days remaining</div><div class="info-val text-warning">${o.daysRemaining} days</div></div>` : ''}
          ${o.paymentConfirmedDate ? `<div class="info-cell"><div class="info-label">Payment received</div><div class="info-val text-success">${o.paymentConfirmedDate}</div></div>` : ''}
          ${o.shippedDate ? `<div class="info-cell"><div class="info-label">Goods shipped</div><div class="info-val">${o.shippedDate}</div></div>` : ''}
        </div>
      </div>`;
  }

  // ---- TIMELINE ----
  function renderTimeline(o) {
    const icons = { done: '&#10003;', current: '&#9679;' };
    const steps = o.timeline.map((s, i) => `
      <div class="tl-step ${s.status}">
        <div class="tl-bubble">${s.status === 'done' ? icons.done : s.status === 'current' ? icons.current : i + 1}</div>
        <div class="tl-content">
          <div class="tl-label">${s.step}</div>
          <div class="tl-date">${s.date || (s.status === 'current' ? 'In progress' : 'Pending')}</div>
          ${s.status === 'locked' ? '<span class="tl-lock-note">Locked — complete previous step first</span>' : ''}
        </div>
      </div>`).join('');
    return `<div class="sub-panel active"><p class="sec-head" style="margin-bottom:var(--s6);">Order timeline</p><div class="timeline">${steps}</div></div>`;
  }

  // ---- DOCUMENTS ----
  function renderDocs(o) {
    const isLocked = o.stage === 'order-created' || o.stage === 'payment-pending';
    const allDone  = o.documents.every(d => d.uploaded);

    const lockNotice = isLocked ? `
      <div class="alert-strip info" style="margin-bottom:var(--s5);">
        💡 Note: You can upload your documents early. The order will close once payment is confirmed and goods are shipped.
      </div>` : '';

    const items = o.documents.map(d => `
      <div class="doc-item ${d.uploaded ? 'uploaded' : 'missing'}" id="di-${d.id}">
        <div class="doc-icon">${d.uploaded ? '&#10003;' : '&#128196;'}</div>
        <div class="doc-name">${d.name}</div>
        <span class="doc-chip ${d.uploaded ? 'uploaded' : 'missing'}">${d.uploaded ? 'Uploaded' : 'Missing'}</span>
        ${!d.uploaded ? `<button class="btn btn-secondary btn-sm" onclick="app.uploadDoc('${o.id}','${d.id}')">Upload</button>` : `<button class="btn btn-ghost btn-sm" onclick="app.removeDoc('${o.id}','${d.id}')">Remove</button>`}
      </div>`).join('');

    const doneNote = allDone ? `<div class="alert-strip success" style="margin-top:var(--s5);">All documents uploaded. You can now close this order.</div>` : '';

    return `<div class="sub-panel active"><p class="sec-head">Document checklist</p>${lockNotice}<div class="doc-list">${items}</div>${doneNote}</div>`;
  }

  // ---- PAYMENT ----
  function renderPayment(o) {
    const inrAmt  = Math.round(o.amountUSD * DATA.fxRate).toLocaleString('en-IN');
    const savings = Math.round((DATA.fxRate - DATA.bankRate) * o.amountUSD).toLocaleString('en-IN');

    // Send payment request section (stage: order-created)
    let sendSection = '';
    if (o.stage === 'order-created') {
      sendSection = `
        <p class="sec-head">Payment request preview</p>
        <div class="pay-card">
          <div class="pay-row"><span class="pay-key">Invoice amount</span><span class="pay-val">${fmtAmt(o.amountUSD, o.currency)}</span></div>
          <div class="pay-row"><span class="pay-key">TradePe FX rate</span><span class="pay-val">&#8377;${DATA.fxRate}</span></div>
          <div class="pay-row"><span class="pay-key">You receive (INR)</span><span class="pay-val hi">&#8377;${inrAmt}</span></div>
          <div class="pay-row"><span class="pay-key">Savings vs bank rate</span><span class="pay-val hi">&#8377;${savings} more</span></div>
          <div class="pay-row"><span class="pay-key">Payment due in</span><span class="pay-val">${o.dueDays || 7} days</span></div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="app.sendRequest('${o.id}')" style="width:100%;">Send payment request to buyer</button>`;
    }

    // Countdown (payment-pending)
    let countdown = '';
    if (o.stage === 'payment-pending') {
      countdown = `
        <div class="countdown">
          <div>
            <div class="count-val">${o.daysRemaining} days</div>
            <div class="count-label">remaining &nbsp;·&nbsp; Due ${o.dueDateDisplay || '—'}</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.simulatePaid('${o.id}')">Simulate: payment received</button>
        </div>`;
    }

    // Request summary (if sent)
    let reqSummary = '';
    if (o.paymentRequestSent) {
      const activity = (o.buyerActivity || []).map(a => `
        <div class="act-item ${a.done ? 'done' : 'pending'}">
          <div class="act-dot"></div>
          <div class="act-label">${a.label}</div>
          <div class="act-ts">${a.ts || '—'}</div>
        </div>`).join('');

      reqSummary = `
        <p class="sec-head">Payment request</p>
        <div class="pay-card" style="margin-bottom:var(--s5);">
          <div class="pay-row"><span class="pay-key">Sent on</span><span class="pay-val">${o.paymentRequestSentDate || '—'}</span></div>
          <div class="pay-row"><span class="pay-key">Invoice amount</span><span class="pay-val">${fmtAmt(o.amountUSD, o.currency)}</span></div>
          <div class="pay-row"><span class="pay-key">TradePe FX rate</span><span class="pay-val">&#8377;${DATA.fxRate}</span></div>
          <div class="pay-row"><span class="pay-key">You receive (INR)</span><span class="pay-val hi">&#8377;${inrAmt}</span></div>
          <div class="pay-row"><span class="pay-key">Savings vs bank</span><span class="pay-val hi">&#8377;${savings} more</span></div>
        </div>
        <p class="sec-head">Buyer activity</p>
        <div class="activity-tracker">${activity}</div>`;
    }

    // Payment confirmed notice
    let confirmedNote = '';
    if (o.paymentConfirmedDate) {
      confirmedNote = `<div class="alert-strip success" style="margin-top:var(--s5);"><strong>Payment confirmed</strong> — received on ${o.paymentConfirmedDate}</div>`;
    }

    // Invoice Financing card (shown after request sent, while waiting)
    let finCard = '';
    if (o.financingOffered && !o.financingApplied && o.stage === 'payment-pending') {
      const dismissed = (S.dismissed[o.id] || {}).fin;
      if (!dismissed) {
        finCard = `
          <div class="disc-card fin" style="margin-top:var(--s6);">
            <span class="disc-badge">&#9889;</span>
            <div class="disc-tag">Invoice Financing &mdash; Get paid now</div>
            <div class="disc-title">Don't want to wait ${o.daysRemaining || o.dueDays || 14} days?</div>
            <div class="disc-desc">TradePe advances your invoice amount today at just 1.5% fee. Your buyer repays TradePe directly — you don't have to chase payment at all.</div>
            <div class="disc-actions">
              <button class="btn btn-primary" onclick="app.openFin('${o.id}')">Get paid now</button>
              <button class="disc-dismiss" onclick="app.dismissFin('${o.id}')">I'll wait</button>
            </div>
          </div>`;
      }
    }
    if (o.financingApplied) {
      finCard = `
        <div class="alert-strip info" style="margin-top:var(--s5);display:flex;align-items:center;gap:var(--s3);">
          <span>&#9889;</span>
          <div><strong>Financing application submitted</strong> &mdash; Approval decision within 24 hours.</div>
          <span class="badge badge-muted" style="margin-left:auto;">Under Review</span>
        </div>`;
    }

    return `<div class="sub-panel active">${sendSection}${countdown}${reqSummary}${confirmedNote}${finCard}</div>`;
  }

  // ---- CLOSE ----
  function renderClose(o) {
    const buyer    = getBuyer(o.buyerId);
    const allDocs  = o.documents.every(d => d.uploaded);
    const missing  = o.documents.filter(d => !d.uploaded).length;
    const canClose = allDocs && o.stage !== 'payment-pending' && o.stage !== 'order-created' && o.stage !== 'completed';

    if (o.stage === 'completed') {
      return `
        <div class="sub-panel active">
          <div style="text-align:center;padding:var(--s8) 0;">
            <div style="font-size:52px;margin-bottom:var(--s4);">&#9989;</div>
            <div style="font-size:22px;font-weight:700;margin-bottom:var(--s2);">Order Closed</div>
            <div style="font-size:13px;color:var(--text-secondary);">Closed on ${o.closedDate || '—'}</div>
          </div>
          <p class="sec-head">Order summary</p>
          <div class="summary-table">
            ${sumRow('Order ID', o.id)}
            ${sumRow('Buyer', buyer ? buyer.name : '—')}
            ${sumRow('Invoice', o.invoiceNumber)}
            ${sumRow('Amount', fmtAmt(o.amountUSD, o.currency))}
            ${sumRow('Payment received', o.paymentConfirmedDate || '—', 'text-success')}
            ${sumRow('Days to payment', o.buyerMemory ? o.buyerMemory.paymentDays + ' days' : '—')}
          </div>
          <p class="sec-head">Buyer profile updated</p>
          <div class="buyer-memory-card">
            <div style="font-size:13px;font-weight:600;color:var(--success);margin-bottom:var(--s3);">Buyer memory updated for ${buyer ? buyer.name : 'this buyer'}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3);">
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.9px;font-weight:600;">Avg payment days</div>
                <div style="font-size:16px;font-weight:700;margin-top:2px;">${o.buyerMemory ? o.buyerMemory.paymentDays : '—'} days</div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.9px;font-weight:600;">Reliability</div>
                <div style="font-size:16px;font-weight:700;color:var(--success);margin-top:2px;">${o.buyerMemory ? o.buyerMemory.reliabilityScore : '—'}</div>
              </div>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="sub-panel active">
        <p class="sec-head">Order summary</p>
        <div class="summary-table">
          ${sumRow('Order ID', o.id)}
          ${sumRow('Buyer', buyer ? buyer.name : '—')}
          ${sumRow('Invoice', o.invoiceNumber)}
          ${sumRow('Amount', fmtAmt(o.amountUSD, o.currency))}
          ${sumRow('Payment', o.paymentConfirmedDate ? 'Confirmed — ' + o.paymentConfirmedDate : 'Pending', o.paymentConfirmedDate ? 'text-success' : 'text-warning')}
          ${sumRow('Documents', allDocs ? 'All uploaded' : missing + ' missing', allDocs ? 'text-success' : 'text-warning')}
        </div>
        ${!allDocs ? `<div class="alert-strip warn">Upload ${missing} missing document${missing > 1 ? 's' : ''} before closing this order.</div>` : ''}
        ${o.stage === 'payment-pending' ? `<div class="alert-strip warn">Wait for payment confirmation before closing.</div>` : ''}
        ${o.stage === 'order-created'   ? `<div class="alert-strip warn">Send the payment request first.</div>` : ''}
        <button class="btn btn-success btn-lg" onclick="app.closeOrder('${o.id}')" style="width:100%;margin-top:var(--s4);" ${canClose ? '' : 'disabled'}>
          Mark as Complete
        </button>
      </div>`;
  }

  function sumRow(k, v, cls = '') {
    return `<div class="sum-row"><span class="sum-key">${k}</span><span class="sum-val ${cls}">${v}</span></div>`;
  }

  // ============================================================
  // NEXT ACTION ENGINE (pure function — no side effects)
  // ============================================================
  function nextAction(o) {
    switch (o.stage) {
      case 'order-created':
        return { text: 'Review invoice details and send payment request to your buyer', cta: 'Go to Payment', fn: 'goPaymentTab', color: 'warning' };
      case 'payment-pending':
        return { text: `Waiting for buyer payment — ${o.daysRemaining || '?'} days remaining`, cta: null, fn: null, color: 'warning' };
      case 'payment-overdue':
        return { text: 'Payment is overdue — send a reminder to your buyer now', cta: 'Send reminder', fn: 'sendReminder', color: 'error' };
      case 'payment-confirmed':
        return { text: 'Payment received — now ship your goods and mark shipment date', cta: 'Mark as shipped', fn: 'markShipped', color: 'success' };
      case 'awaiting-documents':
        return { text: 'Upload your Bill of Lading and remaining documents to close this order', cta: 'Upload documents', fn: 'goDocsTab', color: 'primary' };
      case 'completed':
        return { text: 'This order is complete and archived', cta: null, fn: null, color: 'success' };
      default:
        return { text: 'Review this order and take the next step', cta: null, fn: null, color: 'warning' };
    }
  }

  function goPaymentTab(id)  { S.subTab = 'payment';   renderOrderDetail(); }
  function goDocsTab(id)     { S.subTab = 'documents'; renderOrderDetail(); }
  function sendReminder(id)  { showToast('Reminder sent to buyer via email and WhatsApp'); }

  // ============================================================
  // PAYMENT ACTIONS
  // ============================================================
  function sendRequest(id) {
    const o = getOrder(id);
    if (!o) return;
    o.stage = 'payment-pending';
    o.urgency = 'needs-attention';
    o.paymentRequestSent = true;
    o.paymentRequestSentDate = fmtDate(new Date());
    o.daysRemaining   = o.dueDays || 14;
    o.dueDateDisplay  = fmtFutureDate(o.dueDays || 14);
    o.buyerActivity   = [
      { label: 'Email delivered',   ts: fmtTime(new Date()), done: true  },
      { label: 'Email opened',      ts: null, done: false },
      { label: 'Portal accessed',   ts: null, done: false },
      { label: 'Payment initiated', ts: null, done: false }
    ];
    if (o.financingOffered) logEvent('FIN_DISCOVERY', id);
    showToast('Payment request sent to buyer via email and WhatsApp');
    renderOrderDetail();
  }

  function simulatePaid(id) {
    const o = getOrder(id);
    if (!o) return;
    o.stage = 'payment-confirmed';
    o.urgency = 'active';
    o.paymentConfirmedDate = fmtDate(new Date());
    setTl(o, 2, 'done', fmtDate(new Date()));
    setTl(o, 3, 'current', null);
    if (o.buyerActivity) o.buyerActivity.forEach(a => { a.done = true; a.ts = a.ts || fmtTime(new Date()); });
    showToast('Payment confirmed. Time to ship your goods.');
    renderOrderDetail();
  }

  function markShipped(id) {
    const o = getOrder(id);
    if (!o) return;
    o.stage = 'awaiting-documents';
    o.shippedDate = fmtDate(new Date());
    setTl(o, 3, 'done', fmtDate(new Date()));
    setTl(o, 4, 'current', null);
    showToast('Shipment recorded. Upload documents to close the order.');
    renderOrderDetail();
  }

  function setTl(o, idx, status, date) {
    if (o.timeline[idx]) { o.timeline[idx].status = status; if (date !== null) o.timeline[idx].date = date; }
  }

  // ============================================================
  // DOCUMENT ACTIONS
  // ============================================================
  function uploadDoc(orderId, docId) {
    const o   = getOrder(orderId);
    const doc = o && o.documents.find(d => d.id === docId);
    if (!doc) return;

    const el = document.getElementById('di-' + docId);
    const elGlobal = document.getElementById('di-global-' + docId);

    if (el) {
      el.innerHTML = `<div class="doc-icon">&#8987;</div><div class="doc-name">${doc.name}</div><span class="doc-chip missing">Uploading...</span>`;
    }
    if (elGlobal) {
      elGlobal.innerHTML = `
        <div class="doc-icon">&#8987;</div>
        <div style="flex:1;">
          <div class="doc-name">${doc.name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${orderId} &nbsp;·&nbsp; ${getBuyer(o.buyerId)?.name || '—'}</div>
        </div>
        <span class="doc-chip missing">Uploading...</span>`;
    }

    setTimeout(() => {
      doc.uploaded = true;
      const allDone = o.documents.every(d => d.uploaded);
      if (allDone) {
        setTl(o, 4, 'done', fmtDate(new Date()));
        setTl(o, 5, 'current', null);
        showToast('All documents uploaded. You can now close this order.');
      } else {
        showToast(`${doc.name} uploaded successfully`);
      }
      
      if (S.screen === 'documents') {
        renderDocuments();
      } else {
        renderSubTab(o);
      }
    }, 1400);
  }

  function removeDoc(orderId, docId) {
    const o   = getOrder(orderId);
    const doc = o && o.documents.find(d => d.id === docId);
    if (!doc) return;
    doc.uploaded = false;
    if (o.timeline[4] && o.timeline[4].status === 'done') {
      setTl(o, 4, 'current', null);
      setTl(o, 5, 'locked', null);
    }
    showToast(`${doc.name} removed.`);
    
    if (S.screen === 'documents') {
      renderDocuments();
    } else {
      renderSubTab(o);
    }
  }

  // ============================================================
  // CLOSE ORDER
  // ============================================================
  function closeOrder(id) {
    const o     = getOrder(id);
    const buyer = getBuyer(o.buyerId);
    if (!o) return;
    o.stage     = 'completed';
    o.urgency   = 'completed';
    o.closedDate = fmtDate(new Date());
    setTl(o, 5, 'done', fmtDate(new Date()));
    if (buyer) { buyer.isNew = false; buyer.avgPaymentDays = 5; buyer.reliabilityScore = 'Excellent'; buyer.totalOrders = (buyer.totalOrders || 0) + 1; }
    o.buyerMemory = { paymentDays: 5, reliabilityScore: 'Excellent' };
    showToast('Order closed. Buyer profile has been updated.');
    renderOrderDetail();
    updateBadge();
  }

  // ============================================================
  // LC DISCOVERY
  // ============================================================
  function openLC(id) {
    const o = getOrder(id);
    const b = getBuyer(o.buyerId);
    S.pendingLCOrderId = id;
    document.getElementById('lc-buyer').value   = b ? b.name : '';
    document.getElementById('lc-country').value = b ? b.country : '';
    document.getElementById('lc-amount').value  = fmtAmt(o.amountUSD, o.currency);
    document.getElementById('lc-terms').value   = o.paymentTerms === 'advance' ? 'Advance payment' : 'Open account';
    document.getElementById('lc-bank').value    = '';
    document.getElementById('lc-notes').value   = '';
    logEvent('LC_CLICK', id);
    startExplore('LC', id);
    showScreen('lc-inquiry');
  }

  function cancelLC() { openOrder(S.pendingLCOrderId); }

  function submitLC() {
    if (!document.getElementById('lc-bank').value) { alert('Please select your preferred bank'); return; }
    const id = S.pendingLCOrderId;
    const o  = getOrder(id);
    if (!o) return;
    o.lcApplied = true;
    logEvent('LC_APPLY', id);
    showToast('LC application submitted. Partner bank will respond in 2 business days.');
    openOrder(id);
  }

  function dismissLC(id) {
    if (!S.dismissed[id]) S.dismissed[id] = {};
    S.dismissed[id].lc = true;
    const o = getOrder(id);
    if (o) renderSubTab(o);
  }

  // ============================================================
  // INVOICE FINANCING
  // ============================================================
  function openFin(id) {
    const o = getOrder(id);
    const b = getBuyer(o.buyerId);
    S.pendingFinOrderId = id;
    const fee = (o.amountUSD * DATA.financingFeePercent / 100).toFixed(2);
    const net = (o.amountUSD - parseFloat(fee)).toFixed(2);
    document.getElementById('fin-invoice').value = o.invoiceNumber;
    document.getElementById('fin-amount').value  = fmtAmt(o.amountUSD, o.currency);
    document.getElementById('fin-fee').value     = `$${fee} (1.5%)`;
    document.getElementById('fin-net').value     = `$${net}`;
    document.getElementById('fin-buyer').value   = b ? b.name : '';
    logEvent('FIN_CLICK', id);
    startExplore('FIN', id);
    showScreen('financing');
  }

  function cancelFin() { openOrder(S.pendingFinOrderId); }

  function submitFin() {
    const id = S.pendingFinOrderId;
    const o  = getOrder(id);
    if (!o) return;
    o.financingApplied = true;
    logEvent('FIN_APPLY', id);
    showToast('Financing application submitted. Approval decision within 24 hours.');
    openOrder(id);
  }

  function dismissFin(id) {
    if (!S.dismissed[id]) S.dismissed[id] = {};
    S.dismissed[id].fin = true;
    const o = getOrder(id);
    if (o) renderSubTab(o);
  }

  // ============================================================
  // NEW ORDER FLOW
  // ============================================================
  function startNewOrder() {
    S.noState = { buyerName: '', buyerId: null, countryCode: '', currency: 'USD', isNew: true };
    const fields = ['no-buyer-name','no-invoice','no-amount'];
    fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    document.getElementById('no-country').value  = '';
    document.getElementById('no-currency').value = 'USD';
    document.getElementById('no-terms').value    = 'advance';
    document.getElementById('prefill-notice').style.display  = 'none';
    document.getElementById('buyer-suggestions').style.display = 'none';
    document.getElementById('inr-preview').style.display  = 'none';
    document.getElementById('doc-preview').style.display  = 'none';
    document.getElementById('no-step1').style.display = 'block';
    document.getElementById('no-step2').style.display = 'none';
    // Reset step dots
    sdSet('sd1','active','1'); sdLine('sl1',false); sdSet('sd2','pending','2');
    showScreen('new-order');
  }

  function sdSet(id, cls, txt) { const el=document.getElementById(id); if(el){el.className='step-dot '+cls; el.textContent=txt;} }
  function sdLine(id, done)    { const el=document.getElementById(id); if(el) el.className='step-line'+(done?' done':''); }

  function onBuyerInput(val) {
    S.noState.buyerName = val;
    const sg = document.getElementById('buyer-suggestions');
    if (val.length < 2) { sg.style.display = 'none'; return; }
    const matches = S.buyers.filter(b => b.name.toLowerCase().includes(val.toLowerCase()));
    if (matches.length) {
      sg.style.display = 'block';
      sg.innerHTML = matches.map(b => `
        <div class="suggest-item" onclick="app.selectBuyer('${b.id}')">
          <span>${b.name}</span>
          <span style="font-size:11px;color:var(--text-muted);">${b.country} &nbsp;·&nbsp; ${b.totalOrders} order${b.totalOrders !== 1 ? 's' : ''}</span>
        </div>`).join('');
    } else { sg.style.display = 'none'; }
  }

  function selectBuyer(id) {
    const b = S.buyers.find(x => x.id === id);
    if (!b) return;
    S.noState.buyerId = id;
    S.noState.buyerName = b.name;
    S.noState.countryCode = b.countryCode;
    S.noState.currency = b.currency;
    S.noState.isNew = b.isNew;
    document.getElementById('no-buyer-name').value = b.name;
    document.getElementById('no-country').value    = b.countryCode;
    document.getElementById('no-currency').value   = b.currency;
    document.getElementById('buyer-suggestions').style.display = 'none';
    if (!b.isNew) {
      document.getElementById('prefill-notice').style.display = 'flex';
      document.getElementById('prefill-text').textContent = `Returning buyer — details pre-filled from your last order with ${b.name}.`;
    } else {
      document.getElementById('prefill-notice').style.display = 'none';
    }
  }

  function noStep1Continue() {
    const name    = document.getElementById('no-buyer-name').value.trim();
    const country = document.getElementById('no-country').value;
    if (!name)    { alert('Please enter the buyer name'); return; }
    if (!country) { alert('Please select a country'); return; }
    S.noState.buyerName   = name;
    S.noState.countryCode = country;
    S.noState.currency    = document.getElementById('no-currency').value;
    if (!S.noState.buyerId) S.noState.isNew = true;
    // Show step 2
    document.getElementById('no-step1').style.display = 'none';
    document.getElementById('no-step2').style.display = 'block';
    sdSet('sd1','done','✓'); sdLine('sl1',true); sdSet('sd2','active','2');
    // Doc checklist preview
    const docs = DATA.docsByCountry[country] || DATA.docsByCountry['default'];
    document.getElementById('doc-preview').style.display = 'block';
    document.getElementById('doc-preview-list').innerHTML = docs.map(d => `
      <div style="display:flex;align-items:center;gap:var(--s2);font-size:13px;color:var(--text-secondary);padding:6px 0;">
        <span style="color:var(--warning);">&#128196;</span> ${d}
      </div>`).join('');
  }

  function noBack() {
    document.getElementById('no-step1').style.display = 'block';
    document.getElementById('no-step2').style.display = 'none';
    sdSet('sd1','active','1'); sdLine('sl1',false); sdSet('sd2','pending','2');
  }

  function onAmountInput(val) {
    const amt = parseFloat(val) || 0;
    if (amt > 0) {
      const inr  = Math.round(amt * DATA.fxRate).toLocaleString('en-IN');
      const save = Math.round((DATA.fxRate - DATA.bankRate) * amt).toLocaleString('en-IN');
      document.getElementById('inr-preview').style.display = 'block';
      document.getElementById('inr-amount').textContent   = '\u20B9' + inr;
      document.getElementById('inr-savings').textContent  = '\u20B9' + save + ' more than bank rate';
    } else {
      document.getElementById('inr-preview').style.display = 'none';
    }
  }

  function saveOrder() {
    const invoice = document.getElementById('no-invoice').value.trim();
    const amount  = parseFloat(document.getElementById('no-amount').value) || 0;
    const terms   = document.getElementById('no-terms').value;
    if (!invoice)       { alert('Please enter an invoice number'); return; }
    if (amount <= 0)    { alert('Please enter a valid amount'); return; }

    const ns = S.noState;
    const id = `TRP-${S.nextNum++}`;
    const inrVal = amount * DATA.fxRate;
    const triggerLC = ns.isNew || inrVal > 1000000; // new buyer OR > INR 10L

    // Register buyer if new
    let buyerId = ns.buyerId;
    if (!buyerId) {
      buyerId = 'BUY-' + Date.now();
      const countryName = { US:'United States', DE:'Germany', AE:'UAE', GB:'United Kingdom', JP:'Japan', SG:'Singapore', AU:'Australia', CN:'China' };
      S.buyers.push({
        id: buyerId, name: ns.buyerName, country: countryName[ns.countryCode] || ns.countryCode,
        countryCode: ns.countryCode, currency: ns.currency,
        defaultPaymentTerms: terms, isNew: true,
        avgPaymentDays: null, reliabilityScore: null, totalOrders: 0,
        docsRequired: DATA.docsByCountry[ns.countryCode] || DATA.docsByCountry['default']
      });
    }

    const docs = DATA.docsByCountry[ns.countryCode] || DATA.docsByCountry['default'];
    const newOrder = {
      id, buyerId, invoiceNumber: invoice, amountUSD: amount,
      currency: ns.currency, paymentTerms: terms,
      dueDays: terms === 'open' ? 14 : 7,
      stage: 'order-created', urgency: 'active',
      lcTriggered: triggerLC, lcApplied: false, lcDismissed: false,
      financingOffered: true, financingApplied: false, financingDismissed: false,
      paymentRequestSent: false,
      timeline: [
        { step: 'Order Created',      date: fmtDate(new Date()), status: 'done'    },
        { step: 'Payment Requested',  date: null,                status: 'current' },
        { step: 'Payment Received',   date: null,                status: 'locked'  },
        { step: 'Goods Shipped',      date: null,                status: 'locked'  },
        { step: 'Documents Uploaded', date: null,                status: 'locked'  },
        { step: 'Order Closed',       date: null,                status: 'locked'  }
      ],
      documents: docs.map((d, i) => ({ id: `doc-${id}-${i}`, name: d, uploaded: false, required: true }))
    };
    S.orders.push(newOrder);

    if (triggerLC) {
      logEvent('LC_DISCOVERY', id);
      S.pendingLCOrderId = id;
      const b = getBuyer(buyerId);
      const cn = { US:'United States', DE:'Germany', AE:'UAE', GB:'United Kingdom', JP:'Japan', SG:'Singapore', AU:'Australia', CN:'China' };
      document.getElementById('lc-buyer').value   = b ? b.name : ns.buyerName;
      document.getElementById('lc-country').value = cn[ns.countryCode] || ns.countryCode;
      document.getElementById('lc-amount').value  = fmtAmt(amount, ns.currency);
      document.getElementById('lc-terms').value   = terms === 'advance' ? 'Advance payment' : 'Open account';
      document.getElementById('lc-bank').value    = '';
      document.getElementById('lc-notes').value   = '';
      showScreen('lc-inquiry');
    } else {
      showToast(`Order ${id} created`);
      S.orderId  = id;
      S.subTab   = 'overview';
      renderOrderDetail();
      showScreen('order-detail');
    }
  }

  // ============================================================
  // DOCUMENTS SCREEN (global)
  // ============================================================
  function renderDocuments() {
    const all = [];
    S.orders.forEach(o => {
      const b = getBuyer(o.buyerId);
      o.documents.forEach(d => all.push({ ...d, orderId: o.id, buyerName: b ? b.name : '—' }));
    });
    if (!all.length) {
      document.getElementById('docs-list').innerHTML = `<div class="empty-state"><div class="empty-state-icon">&#128196;</div><div class="empty-state-title">No documents yet</div><p>Documents will appear here once you start uploading them.</p></div>`;
      return;
    }
    document.getElementById('docs-list').innerHTML = `
      <div class="doc-list">${all.map(d => `
        <div class="doc-item ${d.uploaded ? 'uploaded' : 'missing'}" id="di-global-${d.id}">
          <div class="doc-icon">${d.uploaded ? '&#10003;' : '&#128196;'}</div>
          <div style="flex:1;">
            <div class="doc-name">${d.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${d.orderId} &nbsp;·&nbsp; ${d.buyerName}</div>
          </div>
          <span class="doc-chip ${d.uploaded ? 'uploaded' : 'missing'}">${d.uploaded ? 'Uploaded' : 'Missing'}</span>
          ${!d.uploaded ? `<button class="btn btn-secondary btn-sm" onclick="app.uploadDoc('${d.orderId}','${d.id}')">Upload</button>` : `<button class="btn btn-ghost btn-sm" onclick="app.removeDoc('${d.orderId}','${d.id}')">Remove</button>`}
        </div>`).join('')}
      </div>`;
  }

  // ============================================================
  // FUNNEL EVENT TRACKING (background — events logged silently)
  // ============================================================
  function logEvent(event, orderId) {
    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    S.funnelLog.push({ event, orderId, ts });
  }

  function startExplore(product, orderId) {
    setTimeout(() => {
      const screen = product === 'LC' ? 'lc-inquiry' : 'financing';
      if (S.screen === screen) logEvent(`${product}_EXPLORE`, orderId);
    }, 30000);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function getOrder(id)  { return S.orders.find(o => o.id === id); }
  function getBuyer(id)  { return S.buyers.find(b => b.id === id); }

  function urgencyText(o) {
    switch (o.stage) {
      case 'order-created':      return 'Send payment request to buyer';
      case 'payment-pending':    return `Waiting for buyer payment &nbsp;·&nbsp; ${o.daysRemaining || '?'} days remaining`;
      case 'payment-overdue':    return 'Payment overdue';
      case 'payment-confirmed':  return 'Payment received — ready to ship';
      case 'awaiting-documents': return 'Upload shipping documents';
      case 'completed':          return `Closed &nbsp;·&nbsp; ${o.closedDate || ''}`;
      default:                   return o.stage;
    }
  }

  function fmtAmt(usd, currency) {
    return `${currency || 'USD'}\u00A0${Number(usd).toLocaleString('en-US')}`;
  }
  function fmtINR(usd) {
    return '\u20B9' + Math.round(usd * DATA.fxRate).toLocaleString('en-IN');
  }
  function fmtDate(d) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtTime(d) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtFutureDate(days) {
    const d = new Date(); d.setDate(d.getDate() + days); return fmtDate(d);
  }

  // ============================================================
  // TOAST
  // ============================================================
  let _toastTimer = null;
  function showToast(msg, icon = 'ℹ️') {
    const el   = document.getElementById('toast');
    const txt  = document.getElementById('toast-text');
    const ico  = document.getElementById('toast-icon');
    if (!el) return;
    txt.textContent = msg;
    ico.textContent = icon;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }
  function showFunnelToast(msg) { showToast('📊 ' + msg, ''); }

  // ============================================================
  // BOOT
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    goHome, goDocuments, goProfile,
    openOrder, switchTab,
    sendRequest, simulatePaid, markShipped,
    uploadDoc, removeDoc,
    closeOrder,
    openLC, cancelLC, submitLC, dismissLC,
    openFin, cancelFin, submitFin, dismissFin,
    startNewOrder, onBuyerInput, selectBuyer,
    noStep1Continue, noBack, onAmountInput, saveOrder,
    goPaymentTab, goDocsTab, sendReminder
  };

})();
