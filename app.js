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
    noState: null,          // new-order form state
    onboarded: false,
    chatOpen: false,
    chatMessages: [],
    nudgeDismissed: false,
    nudgeTargetOrderId: null,
    adoptionGoal: {
      tasks: {
        createOrder: false,
        sendPayment: false,
        uploadDoc: false
      },
      unlocked: false,
      claimed: false
    }
  };

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    S.orders = JSON.parse(JSON.stringify(DATA.orders));
    S.buyers = JSON.parse(JSON.stringify(DATA.buyers));

    // Hydrate dismissed state from data flags
    S.orders.forEach(o => {
      if (o.lcDismissed || o.financingDismissed) {
        S.dismissed[o.id] = {};
        if (o.lcDismissed) S.dismissed[o.id].lc = true;
        if (o.financingDismissed) S.dismissed[o.id].fin = true;
      }
    });

    // Show onboarding repositioning modal on every fresh load
    S.onboarded = false;
    document.getElementById('repositioning-modal').style.display = 'flex';
    logEvent('REPOSITION_DISCOVERY', 'onboarding');

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
      'analytics': 'nav-analytics', 'profile': 'nav-profile'
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
  function goAnalytics()   { renderAnalytics(); showScreen('analytics'); }
  function goProfile()     { showScreen('profile'); }

  // ============================================================
  // HOME SCREEN
  // ============================================================
  function renderHome() {
    renderNudgeBanner();
    renderAdoptionGoal();
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

    const flags = { 'US': '🇺🇸', 'DE': '🇩🇪', 'AE': '🇦🇪', 'GB': '🇬🇧', 'JP': '🇯🇵' };

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
  // ANALYTICS PANEL
  // ============================================================
  function renderAnalytics() {
    renderPipelineChart();
    renderRevenueChart();
    renderSavingsCard();
    renderBuyerBreakdown();
    renderMonthlyTrend();
    renderPerformanceTable();
  }

  function renderPipelineChart() {
    const el = document.getElementById('an-pipeline');
    if (!el) return;
    const stages = {
      'order-created':      { label: 'Created',   color: '#94A3B8' },
      'payment-pending':    { label: 'Pending',   color: '#F59E0B' },
      'payment-confirmed':  { label: 'Confirmed', color: '#0EA5E9' },
      'awaiting-documents': { label: 'Documents', color: '#8B5CF6' },
      'overdue':            { label: 'Overdue',   color: '#EF4444' },
      'completed':          { label: 'Completed', color: '#10B981' }
    };
    const counts = {};
    S.orders.forEach(o => { counts[o.stage] = (counts[o.stage] || 0) + 1; });
    const total = S.orders.length;
    const R = 52, C = 2 * Math.PI * R;
    let offset = 0;
    let arcs = '';
    let legend = '';
    Object.entries(stages).forEach(([key, { label, color }]) => {
      const count = counts[key] || 0;
      if (count === 0) return;
      const pct = count / total;
      const dashLen = pct * C;
      arcs += `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="12" stroke-dasharray="${dashLen} ${C - dashLen}" stroke-dashoffset="${-offset}" stroke-linecap="butt"/>`;
      offset += dashLen;
      legend += `<div class="donut-leg-row"><div class="donut-dot" style="background:${color}"></div><span>${label}</span><span class="donut-leg-val">${count}</span></div>`;
    });
    el.innerHTML = `
      <div class="an-title">Order Pipeline</div>
      <div class="donut-wrap">
        <svg class="donut-svg" width="120" height="120" viewBox="0 0 120 120">
          ${arcs}
          <text x="60" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text-primary)">${total}</text>
          <text x="60" y="72" text-anchor="middle" font-size="10" fill="var(--text-muted)">orders</text>
        </svg>
        <div class="donut-legend">${legend}</div>
      </div>`;
  }

  function renderRevenueChart() {
    const el = document.getElementById('an-revenue');
    if (!el) return;
    const byBuyer = {};
    S.orders.forEach(o => {
      const b = getBuyer(o.buyerId);
      const name = b ? b.name.split(' ')[0] : 'Other';
      byBuyer[name] = (byBuyer[name] || 0) + o.amountUSD;
    });
    const entries = Object.entries(byBuyer).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = Math.max(...entries.map(e => e[1]));
    const colors = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];
    const bars = entries.map(([name, val], i) => {
      const h = Math.round((val / max) * 80);
      const kStr = val >= 1000 ? Math.round(val / 1000) + 'K' : val;
      return `<div class="bar-col"><div class="bar-val">$${kStr}</div><div class="bar-fill" style="height:${h}px;background:${colors[i % colors.length]}"></div><div class="bar-label">${name}</div></div>`;
    }).join('');
    el.innerHTML = `
      <div class="an-title">Revenue by Buyer</div>
      <div class="bar-chart">${bars}</div>`;
  }

  function renderSavingsCard() {
    const el = document.getElementById('an-savings');
    if (!el) return;
    const totalUSD = S.orders.reduce((s, o) => s + o.amountUSD, 0);
    const fxSavings = Math.round((DATA.fxRate - DATA.bankRate) * totalUSD);
    const paidOrders = S.orders.filter(o => o.paymentConfirmedDate).length;
    const avgDays = paidOrders > 0 ? Math.round(S.orders.filter(o => o.paymentConfirmedDate).reduce((s) => s + 6, 0) / paidOrders) : 0;
    el.innerHTML = `
      <div class="an-title">FX Savings</div>
      <div class="savings-big">\u20b9${fxSavings.toLocaleString('en-IN')}</div>
      <div class="savings-sub">saved vs bank rates this month</div>
      <div class="savings-row">
        <div class="savings-stat">
          <div class="savings-stat-val">$${(totalUSD / 1000).toFixed(0)}K</div>
          <div class="savings-stat-label">Total Volume</div>
        </div>
        <div class="savings-stat">
          <div class="savings-stat-val">\u20b9${DATA.fxRate}</div>
          <div class="savings-stat-label">TradePe Rate</div>
        </div>
        <div class="savings-stat">
          <div class="savings-stat-val">${avgDays}d</div>
          <div class="savings-stat-label">Avg Payment</div>
        </div>
      </div>`;
  }

  function renderBuyerBreakdown() {
    const el = document.getElementById('an-buyers');
    if (!el) return;
    const byBuyer = {};
    S.orders.forEach(o => {
      if (!byBuyer[o.buyerId]) byBuyer[o.buyerId] = { count: 0, total: 0 };
      byBuyer[o.buyerId].count++;
      byBuyer[o.buyerId].total += o.amountUSD;
    });
    const reliColors = { 'Excellent': '#10B981', 'Good': '#0EA5E9', null: '#94A3B8' };
    const rings = Object.entries(byBuyer).map(([id, d]) => {
      const b = getBuyer(id);
      const name = b ? b.name.split(' ')[0] : '?';
      const score = b ? b.reliabilityScore : null;
      const col = reliColors[score] || '#94A3B8';
      const pct = Math.min(d.count / 5, 1);
      const C = 2 * Math.PI * 20;
      return `<div class="buyer-ring">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" stroke-width="3"/>
          <circle cx="24" cy="24" r="20" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="${pct * C} ${C}" stroke-dashoffset="${C * 0.25}" stroke-linecap="round"/>
          <text x="24" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-primary)">${d.count}</text>
        </svg>
        <div class="buyer-ring-name">${name}</div>
      </div>`;
    }).join('');
    el.innerHTML = `
      <div class="an-title">Buyer Activity</div>
      <div class="buyer-rings">${rings}</div>`;
  }

  function renderMonthlyTrend() {
    const el = document.getElementById('an-monthly');
    if (!el) return;
    // Simulated monthly data (last 6 months)
    const months = [
      { label: 'Jan', orders: 3, revenue: 42000 },
      { label: 'Feb', orders: 5, revenue: 68000 },
      { label: 'Mar', orders: 4, revenue: 55000 },
      { label: 'Apr', orders: 7, revenue: 89000 },
      { label: 'May', orders: 9, revenue: 124000 },
      { label: 'Jun', orders: S.orders.length, revenue: S.orders.reduce((s, o) => s + o.amountUSD, 0) }
    ];
    const maxRev = Math.max(...months.map(m => m.revenue));
    const W = 460, H = 120, padX = 10, padY = 10;
    const stepX = (W - 2 * padX) / (months.length - 1);

    // Area + line path
    let pathD = '';
    let areaD = `M ${padX} ${H - padY}`;
    const points = months.map((m, i) => {
      const x = padX + i * stepX;
      const y = H - padY - ((m.revenue / maxRev) * (H - 2 * padY));
      return { x, y, m };
    });
    points.forEach((p, i) => {
      if (i === 0) { pathD += `M ${p.x} ${p.y}`; areaD += ` L ${p.x} ${p.y}`; }
      else { pathD += ` L ${p.x} ${p.y}`; areaD += ` L ${p.x} ${p.y}`; }
    });
    areaD += ` L ${points[points.length - 1].x} ${H - padY} Z`;

    const dots = points.map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="#0EA5E9" stroke="white" stroke-width="2"/>
      <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-primary)">$${Math.round(p.m.revenue / 1000)}K</text>
    `).join('');

    const labels = points.map(p => `
      <text x="${p.x}" y="${H - 1}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-weight="600">${p.m.label}</text>
    `).join('');

    el.innerHTML = `
      <div class="an-title">Monthly Revenue Trend</div>
      <svg width="100%" viewBox="0 0 ${W} ${H + 12}" style="overflow:visible;">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0EA5E9" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#0EA5E9" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#areaGrad)"/>
        <path d="${pathD}" fill="none" stroke="#0EA5E9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        ${labels}
      </svg>`;
  }

  function renderPerformanceTable() {
    const el = document.getElementById('an-performance');
    if (!el) return;
    const byBuyer = {};
    S.orders.forEach(o => {
      if (!byBuyer[o.buyerId]) byBuyer[o.buyerId] = { orders: 0, total: 0, paid: 0, overdue: 0 };
      byBuyer[o.buyerId].orders++;
      byBuyer[o.buyerId].total += o.amountUSD;
      if (o.paymentConfirmedDate) byBuyer[o.buyerId].paid++;
      if (o.stage === 'overdue') byBuyer[o.buyerId].overdue++;
    });
    const rows = Object.entries(byBuyer).map(([id, d]) => {
      const b = getBuyer(id);
      const name = b ? b.name : id;
      const country = b ? b.country : '—';
      const score = b ? b.reliabilityScore : '—';
      const scoreColor = score === 'Excellent' ? 'var(--success)' : score === 'Good' ? 'var(--primary)' : 'var(--text-muted)';
      return `<tr>
        <td style="font-weight:600;">${name}</td>
        <td>${country}</td>
        <td style="text-align:center;">${d.orders}</td>
        <td style="text-align:right;">$${(d.total / 1000).toFixed(0)}K</td>
        <td style="text-align:center;">${d.paid}/${d.orders}</td>
        <td style="text-align:center;color:${d.overdue > 0 ? 'var(--error)' : 'var(--text-muted)'};">${d.overdue}</td>
        <td style="color:${scoreColor};font-weight:600;">${score}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div class="an-title">Buyer Performance</div>
      <div class="table-container">
        <table class="orders-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Country</th>
              <th style="text-align:center;">Orders</th>
              <th style="text-align:right;">Volume</th>
              <th style="text-align:center;">Paid</th>
              <th style="text-align:center;">Overdue</th>
              <th>Reliability</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
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

    const na = nextAction(o);
    const stages = {
      'order-created':     ['Awaiting Request', 'badge-warn'],
      'payment-pending':   ['Awaiting Payment', 'badge-warn'],
      'payment-confirmed': ['Payment Confirmed', 'badge-primary'],
      'awaiting-documents':['Uploading Docs', 'badge-primary'],
      'overdue':           ['Needs Attention', 'badge-error'],
      'completed':         ['Completed', 'badge-success']
    };
    const [stageTxt, stageCls] = stages[o.stage] || ['Unknown', 'badge-muted'];

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
          <div class="od-header-action">
            <span class="badge ${na.color === 'warn' ? 'badge-warn' : na.color === 'error' ? 'badge-error' : na.color === 'success' ? 'badge-success' : 'badge-primary'}">${stageTxt}</span>
            <div class="od-na-text">${na.text}</div>
            ${na.cta ? `<button class="btn btn-primary btn-sm" onclick="app.${na.fn}('${o.id}')">${na.cta}</button>` : ''}
          </div>
          <div>
            <div class="od-amount">${fmtAmt(o.amountUSD, o.currency)}</div>
            <div class="od-amount-inr">&asymp; ${fmtINR(o.amountUSD)}</div>
          </div>
        </div>
        <div class="sub-tabs">
          ${['overview','documents','payment','close'].map(t => `
            <div class="sub-tab ${S.subTab === t ? 'active' : ''}" onclick="app.switchTab('${t}')">${tabLabel(t)}</div>
          `).join('')}
        </div>
      </div>`;

    // Inline timeline (always visible)
    renderInlineTimeline(o);

    // Next action banner
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
    return { overview: 'Overview', documents: 'Documents', payment: 'Payment', close: 'Close Order' }[t] || t;
  }

  function switchTab(t) {
    S.subTab = t;
    renderOrderDetail();
  }

  function renderSubTab(o) {
    const renders = {
      overview:  renderOverview,
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
        const premiumClass = S.adoptionGoal.claimed ? 'premium-unlocked' : '';
        const feeText = S.adoptionGoal.claimed 
          ? `<span style="color:#D97706;font-weight:700;margin-top:4px;display:inline-block;">✨ Premium Active &mdash; Waived application fee (Save ₹2,500)</span>` 
          : `<span style="color:var(--lc);font-weight:600;margin-top:4px;display:inline-block;">\u2728 First LC processing fee waived &mdash; \u20b90 to get started.</span>`;
        lcCard = `
          <div class="disc-card lc ${premiumClass}">
            <span class="disc-badge">&#128737;</span>
            <div class="first-lc-inline">${S.adoptionGoal.claimed ? '✨ PREMIUM WAIVED' : '\ud83c\udf81 FIRST LC FREE'}</div>
            <div class="disc-tag">New product &mdash; Letter of Credit</div>
            <div class="disc-title">Protect your payment with an LC</div>
            <div class="disc-desc">This is a new buyer. A Letter of Credit guarantees you get paid before you ship. Apply through TradePe's partner bank &mdash; no branch visit needed. Decision in 2 business days.<br>${feeText}</div>
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



    // ---- Responsibility tracker (3-lane) ----
    const respTracker = buildResponsibilityTracker(o, buyer);

    return `
      <div class="sub-panel active">
        ${lcCard}
        <div class="resp-section-label">Who\u2019s doing what</div>
        ${respTracker}
      </div>`;
  }

  function buildResponsibilityTracker(o, buyer) {
    const buyerName = buyer ? buyer.name.split(' ')[0] : 'Buyer';
    const buyerInitial = buyer ? buyer.name.charAt(0) : 'B';
    const isOpen = o.paymentTerms === 'open';
    const termsLabel = isOpen ? 'Open Account (pay later)' : 'Advance Payment (pay first)';
    const lcPending = o.lcTriggered && !o.lcApplied && !(S.dismissed[o.id] || {}).lc;
    const lcUnderReview = o.lcApplied && !o.lcIssued;

    const done = (text) => `<div class="resp-action done"><span class="resp-action-icon">\u2705</span><span class="resp-action-text">${text}</span></div>`;
    const pending = (text) => `<div class="resp-action pending"><span class="resp-action-icon">\ud83d\udfe0</span><span class="resp-action-text">${text}</span></div>`;
    const waiting = (text) => `<div class="resp-action waiting"><span class="resp-action-icon">\u23f3</span><span class="resp-action-text">${text}</span></div>`;
    const active = (text) => `<div class="resp-action pending"><span class="resp-action-icon">\ud83d\udd04</span><span class="resp-action-text">${text}</span></div>`;
    const blocked = (text) => `<div class="resp-action waiting"><span class="resp-action-icon">\ud83d\udeab</span><span class="resp-action-text">${text}</span></div>`;
    const info = (text) => `<div class="resp-action done" style="font-style:italic;"><span class="resp-action-icon">\u2139\ufe0f</span><span class="resp-action-text">${text}</span></div>`;
    const tip = (text, onclick) => `<div class="resp-action-tip" ${onclick ? `onclick="${onclick}" style="cursor:pointer;"` : ''}><span class="resp-tip-icon">\ud83d\udca1</span><span class="resp-tip-text">${text}</span><span class="resp-tip-arrow">\u2192</span></div>`;

    let exporter = '', platform = '', buyerCol = '';
    const allDocs = o.documents.every(d => d.uploaded);
    const missingDocs = o.documents.filter(d => !d.uploaded).length;

    switch (o.stage) {
      case 'order-created':
        // Exporter
        exporter = done('Order created');
        if (isOpen && lcPending) {
          exporter += pending('Apply for LC (recommended for new buyer)');
          exporter += waiting('Send payment request (after LC)');
        } else if (isOpen && lcUnderReview) {
          exporter += done('LC application submitted');
          exporter += waiting('Send payment request (after LC issued)');
        } else {
          exporter += pending('Send payment request to buyer');
        }
        // TradePe
        platform = done('FX rate locked at \u20b9' + DATA.fxRate);
        if (lcPending) platform += active('LC product available \u2014 awaiting your decision');
        if (lcUnderReview) platform += active('Reviewing LC with partner bank');
        platform += active('Ready to send request when you are');
        if (!lcPending && !lcUnderReview && isOpen) platform += tip('LC available \u2014 protect payments for open accounts', "app.openHelp('lc')");
        // Buyer
        buyerCol = info('Payment terms: ' + termsLabel);
        buyerCol += waiting('Waiting for payment request');
        break;

      case 'payment-pending':
        // Exporter
        exporter = done('Order created') + done('Payment request sent');
        if (isOpen) {
          // Open account: exporter CAN ship before payment, but LC may block it
          if (lcUnderReview) {
            exporter += waiting('Wait for LC to be issued by bank');
            exporter += blocked('Cannot ship until LC is issued');
          } else if (lcPending) {
            exporter += pending('Apply for LC before shipping (recommended)');
          } else {
            exporter += waiting('Waiting for buyer payment');
            exporter += pending('Prepare goods for shipment');
          }
          if (!allDocs) exporter += pending('Upload ' + missingDocs + ' document' + (missingDocs > 1 ? 's' : '') + ' (can start early)');
        } else {
          // Advance: must wait for payment before shipping
          exporter += waiting('Waiting for buyer to pay first');
          exporter += blocked('Cannot ship until payment received');
          if (!allDocs) exporter += waiting('Documents upload after shipment');
        }
        // TradePe
        platform = done('FX rate locked') + done('Payment request delivered');
        platform += active('Tracking buyer activity');
        platform += active('Auto-reminders scheduled');
        if (lcUnderReview) platform += active('LC under review with partner bank');
        if (isOpen && o.financingOffered && !o.financingApplied) {
          platform += tip('Get paid today \u2014 invoice financing at 1.5%', "app.openHelp('financing')");
        }
        // Buyer
        buyerCol = info('Payment terms: ' + termsLabel);
        buyerCol += done('Received payment request');
        buyerCol += pending('Make payment of ' + fmtAmt(o.amountUSD, o.currency));
        if (o.daysRemaining !== undefined) {
          buyerCol += `<div class="resp-action pending"><span class="resp-action-icon">\u23f0</span><span class="resp-action-text">${o.daysRemaining} days remaining</span></div>`;
        }
        break;

      case 'payment-confirmed':
      case 'awaiting-documents':
        exporter = done('Order created') + done('Payment request sent');
        exporter += done('Payment received \u2014 ' + (o.paymentConfirmedDate || ''));
        if (o.shippedDate) {
          exporter += done('Goods shipped \u2014 ' + o.shippedDate);
          if (!allDocs) exporter += pending('Upload ' + missingDocs + ' remaining document' + (missingDocs > 1 ? 's' : ''));
          else exporter += done('All documents uploaded');
        } else {
          exporter += pending('Ship goods to buyer');
          exporter += waiting('Upload documents after shipment');
        }
        // TradePe
        platform = done('FX rate locked') + done('Payment verified & INR credited');
        if (o.shippedDate) platform += done('Shipment recorded');
        else platform += active('Waiting for you to ship');
        platform += active('Monitoring document uploads');
        if (o.lcApplied) platform += done('LC secured \u2014 payment guaranteed');
        if (!allDocs) platform += tip('Auto-checks ensure 99.2% first-submission pass', "app.openHelp('documents')");
        // Buyer
        buyerCol = info('Payment terms: ' + termsLabel);
        buyerCol += done('Payment made \u2014 ' + (o.paymentConfirmedDate || ''));
        if (o.shippedDate) buyerCol += waiting('Goods in transit \u2014 awaiting delivery');
        else buyerCol += waiting('Waiting for exporter to ship');
        break;

      case 'overdue':
        exporter = done('Order created') + done('Payment request sent');
        exporter += pending('Payment is overdue \u2014 follow up');
        if (isOpen) exporter += blocked('Do not ship until payment resolved');
        // TradePe
        platform = done('FX rate locked') + done('Payment request delivered');
        platform += active('Sending overdue reminders to buyer');
        platform += active('Escalating through all channels');
        if (o.financingOffered && !o.financingApplied) {
          platform += tip('Don\u2019t wait \u2014 get paid now with invoice financing', "app.openHelp('financing')");
        }
        // Buyer
        buyerCol = info('Payment terms: ' + termsLabel);
        buyerCol += done('Received payment request');
        buyerCol += pending('Payment overdue \u2014 immediate action needed');
        break;

      case 'completed':
        exporter = done('Order created') + done('Payment request sent') + done('Payment received');
        exporter += done('Goods shipped') + done('Documents uploaded') + done('Order closed');
        platform = done('FX rate locked') + done('Payment verified & INR credited');
        platform += done('Documents processed') + done('Buyer profile updated');
        if (o.lcApplied) platform += done('LC completed successfully');
        platform += tip('Buyer memory saved \u2014 next order will be faster');
        buyerCol = info('Payment terms: ' + termsLabel);
        buyerCol += done('Payment made') + done('Goods received');
        break;

      default:
        exporter = done('Order created');
        platform = active('Monitoring');
        buyerCol = waiting('No action yet');
    }

    const flowArrow = `
      <div class="resp-flow">
        <div class="resp-flow-arrow">
          <div class="resp-flow-dot"></div>
          <div class="resp-flow-line"></div>
          <div class="resp-flow-icon">\u21c4</div>
          <div class="resp-flow-line"></div>
          <div class="resp-flow-dot"></div>
        </div>
      </div>`;

    return `
      <div class="resp-tracker">
        <div class="resp-lane exporter">
          <div class="resp-lane-header">
            <div class="resp-avatar">A</div>
            <div>
              <div class="resp-role">You (Exporter)</div>
              <div class="resp-role-sub">Ankita \u2022 Silk Exports</div>
            </div>
          </div>
          <div class="resp-actions">${exporter}</div>
        </div>
        ${flowArrow}
        <div class="resp-lane platform">
          <div class="resp-lane-header">
            <div class="resp-avatar">T</div>
            <div>
              <div class="resp-role">TradePe</div>
              <div class="resp-role-sub">Managing your order</div>
            </div>
          </div>
          <div class="resp-actions">${platform}</div>
        </div>
        ${flowArrow}
        <div class="resp-lane buyer">
          <div class="resp-lane-header">
            <div class="resp-avatar">${buyerInitial}</div>
            <div>
              <div class="resp-role">${buyerName} (Buyer)</div>
              <div class="resp-role-sub">${buyer ? buyer.country : ''}</div>
            </div>
          </div>
          <div class="resp-actions">${buyerCol}</div>
        </div>
      </div>`;
  }

  // ---- INLINE TIMELINE (always visible, compact horizontal) ----
  function renderInlineTimeline(o) {
    const el = document.getElementById('od-timeline');
    if (!el) return;

    const steps = o.timeline.map((s, i) => {
      const isLast = i === o.timeline.length - 1;
      let bubbleClass = '';
      let iconHTML = i + 1;
      if (s.status === 'done') { bubbleClass = 'done'; iconHTML = '&#10003;'; }
      else if (s.status === 'current') { bubbleClass = 'current'; iconHTML = '&#9679;'; }
      else { bubbleClass = 'locked'; }

      return `
        <div class="itl-step ${bubbleClass}">
          <div class="itl-bubble">${iconHTML}</div>
          <div class="itl-label">${s.step}</div>
          <div class="itl-date">${s.date || (s.status === 'current' ? 'Now' : '—')}</div>
          ${!isLast ? `<div class="itl-connector ${s.status === 'done' ? 'done' : ''}"></div>` : ''}
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="inline-timeline-wrap">
        <div class="inline-timeline">${steps}</div>
      </div>`;
  }

  // ---- FULL TIMELINE (kept for reference rendering) ----
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
        const premiumClass = S.adoptionGoal.claimed ? 'premium-unlocked' : '';
        const feeDesc = S.adoptionGoal.claimed
          ? `TradePe advances your invoice amount today at <strong style="color:#D97706;">0% transaction fee</strong> (Premium active: waived 1.5% fee). Your buyer repays TradePe directly.`
          : `TradePe advances your invoice amount today at just 1.5% fee. Your buyer repays TradePe directly — you don't have to chase payment at all.`;
        finCard = `
          <div class="disc-card fin ${premiumClass}" style="margin-top:var(--s6);">
            <span class="disc-badge">&#9889;</span>
            <div class="first-lc-inline" style="background:#F59E0B;color:white;display:${S.adoptionGoal.claimed ? 'inline-block' : 'none'};margin-bottom:var(--s3);">✨ 0% FINANCING ACTIVE</div>
            <div class="disc-tag">Invoice Financing &mdash; Get paid now</div>
            <div class="disc-title">Don't want to wait ${o.daysRemaining || o.dueDays || 14} days?</div>
            <div class="disc-desc">${feeDesc}</div>
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
    const isOpen = o.paymentTerms === 'open';
    const lcPending = o.lcTriggered && !o.lcApplied && !(S.dismissed[o.id] || {}).lc;
    const lcUnderReview = o.lcApplied && !o.lcIssued;

    switch (o.stage) {
      case 'order-created':
        if (isOpen && lcPending) {
          return { text: 'New buyer on open terms \u2014 apply for LC first to protect your payment', cta: 'View LC Option', fn: 'switchTab', color: 'warning', tabArg: 'overview' };
        }
        if (isOpen && lcUnderReview) {
          return { text: 'LC is under review by partner bank. Payment request can be sent after LC is issued.', cta: null, fn: null, color: 'warning' };
        }
        return { text: 'Review invoice details and send payment request to your buyer', cta: 'Go to Payment', fn: 'goPaymentTab', color: 'warning' };
      case 'payment-pending':
        if (lcUnderReview) {
          return { text: 'Payment pending. LC under review \u2014 do not ship until LC is issued.', cta: null, fn: null, color: 'warning' };
        }
        return { text: `Waiting for buyer payment \u2014 ${o.daysRemaining || '?'} days remaining`, cta: null, fn: null, color: 'warning' };
      case 'payment-overdue':
        return { text: 'Payment is overdue \u2014 send a reminder to your buyer now', cta: 'Send reminder', fn: 'sendReminder', color: 'error' };
      case 'payment-confirmed': {
        const missingDocs = o.documents.filter(d => !d.uploaded).length;
        if (!o.shippedDate) {
          return { text: 'Payment received! Ship your goods and mark shipment date', cta: 'Mark as shipped', fn: 'markShipped', color: 'success' };
        }
        if (missingDocs > 0) {
          return { text: `Goods shipped. Upload ${missingDocs} remaining document${missingDocs > 1 ? 's' : ''} to close this order.`, cta: 'Upload documents', fn: 'goDocsTab', color: 'primary' };
        }
        return { text: 'All done! You can now close this order.', cta: 'Close Order', fn: 'switchTab', color: 'success', tabArg: 'close' };
      }
      case 'awaiting-documents': {
        const missing = o.documents.filter(d => !d.uploaded).length;
        return { text: `Upload ${missing > 0 ? missing : 'your'} remaining document${missing > 1 ? 's' : ''} to close this order`, cta: 'Upload documents', fn: 'goDocsTab', color: 'primary' };
      }
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
    S.adoptionGoal.tasks.sendPayment = true;
    logEvent('TASK_PAYMENT_SENT', id);
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
      S.adoptionGoal.tasks.uploadDoc = true;
      logEvent('TASK_DOC_UPLOADED', docId);
      
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
    S.adoptionGoal.tasks.createOrder = true;
    logEvent('TASK_ORDER_CREATED', id);

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
  // ONBOARDING REPOSITIONING
  // ============================================================
  function dismissOnboarding() {
    S.onboarded = true;
    localStorage.setItem('tradepe_onboarded_v2', 'true');
    document.getElementById('repositioning-modal').style.display = 'none';
    logEvent('REPOSITION_ENGAGED', 'onboarding');
    showToast('Welcome to TradePe Command Center!', '🚀');
  }

  function replayOnboarding() {
    S.onboarded = false;
    localStorage.removeItem('tradepe_onboarded_v2');
    document.getElementById('repositioning-modal').style.display = 'flex';
    logEvent('REPOSITION_DISCOVERY', 'onboarding');
    
    // Reset adoption goal
    S.adoptionGoal = {
      tasks: {
        createOrder: false,
        sendPayment: false,
        uploadDoc: false
      },
      unlocked: false,
      claimed: false
    };
    
    // Hide premium badges
    document.getElementById('user-premium-badge').style.display = 'none';
    document.getElementById('header-premium-badge').style.display = 'none';
    
    goHome();
  }

  // ============================================================
  // CONTEXTUAL NUDGE BANNER
  // ============================================================
  function renderNudgeBanner() {
    const nudgeEl = document.getElementById('home-nudge');
    if (!nudgeEl || S.nudgeDismissed) { if (nudgeEl) nudgeEl.style.display = 'none'; return; }

    // Find orders with new buyers that have LC triggered but not applied and not dismissed
    const eligibleOrders = S.orders.filter(o => {
      if (o.stage === 'completed') return false;
      if (!o.lcTriggered) return false;
      if (o.lcApplied) return false;
      const d = S.dismissed[o.id] || {};
      if (d.lc) return false;
      const buyer = getBuyer(o.buyerId);
      return buyer && buyer.isNew;
    });

    if (eligibleOrders.length === 0) {
      nudgeEl.style.display = 'none';
      return;
    }

    S.nudgeTargetOrderId = eligibleOrders[0].id;
    document.getElementById('nudge-count').textContent = eligibleOrders.length;
    const ctaBtn = document.getElementById('nudge-cta');
    if (ctaBtn) ctaBtn.textContent = eligibleOrders.length === 1 ? 'View Order' : `View ${eligibleOrders.length} Orders`;
    nudgeEl.style.display = 'flex';
    logEvent('NUDGE_SHOWN', S.nudgeTargetOrderId);
  }

  function nudgeGoToLC() {
    if (S.nudgeTargetOrderId) {
      logEvent('NUDGE_CLICKED', S.nudgeTargetOrderId);
      openOrder(S.nudgeTargetOrderId);
    }
  }

  function dismissNudge() {
    S.nudgeDismissed = true;
    const nudgeEl = document.getElementById('home-nudge');
    if (nudgeEl) {
      nudgeEl.style.animation = 'none';
      nudgeEl.style.opacity = '0';
      nudgeEl.style.transform = 'translateY(-12px)';
      nudgeEl.style.transition = 'all 0.3s ease';
      setTimeout(() => { nudgeEl.style.display = 'none'; }, 300);
    }
    logEvent('NUDGE_DISMISSED', S.nudgeTargetOrderId);
  }

  // ============================================================
  // SPECIALIST SUPPORT CHAT
  // ============================================================
  function toggleChat() {
    S.chatOpen = !S.chatOpen;
    const pane = document.getElementById('chat-pane');
    if (!pane) return;
    
    if (S.chatOpen) {
      pane.classList.add('active');
      logEvent('SPECIALIST_CONTACT', S.orderId || 'general');
      
      if (S.chatMessages.length === 0) {
        S.chatMessages.push({
          sender: 'specialist',
          text: `Hi Ankita! I am Sanjay, your dedicated Trade Finance Specialist at TradePe. I will guide you through this Letter of Credit process. If you have any questions or if bank clearance gets delayed, I am here to help. Zero automated chatbots, just direct chat. How can I help you today?`
        });
      }
      renderChat();
    } else {
      pane.classList.remove('active');
    }
  }

  function renderChat() {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    list.innerHTML = S.chatMessages.map(m => `
      <div class="chat-msg ${m.sender === 'specialist' ? 'specialist' : 'user'}">
        ${m.text}
      </div>
    `).join('');
    list.scrollTop = list.scrollHeight;
  }

  function sendChatMessage() {
    const input = document.getElementById('chat-input-text');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    S.chatMessages.push({ sender: 'user', text });
    input.value = '';
    renderChat();
    logEvent('SPECIALIST_CHAT_SENT', S.orderId || 'general');

    // Simulate Sanjay typing
    setTimeout(() => {
      let reply = '';
      const q = text.toLowerCase();
      if (q.includes('reject') || q.includes('dispute') || q.includes('wrong')) {
        reply = `If the buyer raises a dispute or rejects the draft, TradePe mediates immediately. You can upload updated invoice drafts directly under the Close tab, and I will personally review and send them to the partner bank for quick clearance. We won't leave you stranded.`;
      } else if (q.includes('long') || q.includes('delay') || q.includes('time') || q.includes('days')) {
        reply = `The partner bank review takes up to 2 business days. If there is any delay beyond that, I have direct escalation lines with HDFC and ICICI partner bank managers to speed it up. I will monitor it for you.`;
      } else if (q.includes('kyc') || q.includes('fail') || q.includes('error') || q.includes('reject doc')) {
        reply = `If the bank rejects the documents due to a KYC mismatch or signature issue, I will call you immediately to guide you through the corrected details. We'll handle the re-submission together to avoid payment delay.`;
      } else {
        reply = `That is a great question. For this LC application, we guarantee quick clearance. I'm personally overseeing your account and will ensure partner bank approval is fast tracked. Let me know if you need help with documentation drafting!`;
      }

      S.chatMessages.push({ sender: 'specialist', text: reply });
      renderChat();
    }, 1200);
  }

  // ============================================================
  // ADOPTION GOALS & PREMIUM UNLOCKS
  // ============================================================
  function renderAdoptionGoal() {
    const el = document.getElementById('adoption-goal-container');
    if (!el) return;

    if (S.adoptionGoal.claimed) {
      document.getElementById('user-premium-badge').style.display = 'inline-block';
      document.getElementById('header-premium-badge').style.display = 'inline-flex';
      el.innerHTML = `
        <div class="goal-card" style="border-color: #F59E0B; background: linear-gradient(135deg, var(--surface), rgba(245, 158, 11, 0.02));">
          <div class="goal-header">
            <div class="goal-title">👑 TradePe Premium Active</div>
            <span class="goal-reward-tag" style="background: rgba(245, 158, 11, 0.1); color: #D97706;">Unlocked</span>
          </div>
          <div class="goal-desc">✨ Congratulations! Waived Letter of Credit fees and 0% Invoice Financing transaction fees are now active on your Jaipur Textiles Export account.</div>
        </div>`;
      return;
    }

    const tasks = S.adoptionGoal.tasks;
    const completedList = [tasks.createOrder, tasks.sendPayment, tasks.uploadDoc];
    const completedCount = completedList.filter(Boolean).length;
    const percent = Math.round((completedCount / 3) * 100);

    if (completedCount === 3 && !S.adoptionGoal.unlocked) {
      S.adoptionGoal.unlocked = true;
    }

    if (S.adoptionGoal.unlocked) {
      el.innerHTML = `
        <div class="goal-card" style="border-color: #7C3AED; background: linear-gradient(135deg, var(--surface), rgba(124, 92, 246, 0.02));">
          <div class="goal-unlocked-panel">
            <div class="goal-unlocked-title">🎉 Milestone Goal Achieved!</div>
            <p class="goal-desc" style="text-align:center; margin-bottom:var(--s4);">You have completed all onboarding tasks. Ready to claim 30 days of free TradePe Premium (Waived LC fees, 0% Financing)?</p>
            <button class="btn-claim-premium" onclick="app.claimPremium()">
              ✨ Claim Free Premium Month
            </button>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="goal-card">
        <div class="goal-header">
          <div class="goal-title">🎁 Onboarding Goal: Unlock TradePe Premium</div>
          <span class="goal-reward-tag">30 Days Free</span>
        </div>
        <div class="goal-desc">
          Complete 3 key actions on the Command Center to unlock <strong>30 days of waived Letter of Credit processing fees</strong> and <strong>0% Invoice Financing transaction fees</strong> (Save up to ₹25,000)!
        </div>
        
        <div class="goal-progress-container">
          <div class="goal-progress-text">
            <span>Workflow Completion Progress</span>
            <span>${completedCount} of 3 completed (${percent}%)</span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div class="goal-list">
          <div class="goal-item ${tasks.createOrder ? 'done' : ''}">
            <div class="goal-check">${tasks.createOrder ? '✓' : ''}</div>
            <span class="goal-label">Create an export order</span>
          </div>
          <div class="goal-item ${tasks.sendPayment ? 'done' : ''}">
            <div class="goal-check">${tasks.sendPayment ? '✓' : ''}</div>
            <span class="goal-label">Send a payment request</span>
          </div>
          <div class="goal-item ${tasks.uploadDoc ? 'done' : ''}">
            <div class="goal-check">${tasks.uploadDoc ? '✓' : ''}</div>
            <span class="goal-label">Upload any document</span>
          </div>
        </div>
      </div>`;
  }

  function claimPremium() {
    S.adoptionGoal.claimed = true;
    S.adoptionGoal.unlocked = true;
    logEvent('PREMIUM_CLAIMED', 'adoption_goal');
    showToast('TradePe Premium Waived Fees Activated!', '👑');
    document.getElementById('user-premium-badge').style.display = 'inline-block';
    document.getElementById('header-premium-badge').style.display = 'inline-flex';
    renderHome();
  }

  function saveProfile() {
    showToast('Profile changes saved successfully', '💾');
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
  // HELP PROCESS EXPLAINER
  // ============================================================
  const HELP_TOPICS = {
    lc: {
      icon: '\ud83d\udee1\ufe0f',
      title: 'How does a Letter of Credit work?',
      subtitle: 'A simple guarantee that you get paid. Here\u2019s the entire process \u2014 start to finish.',
      steps: [
        { icon: '\ud83d\udcdd', label: 'You apply', desc: 'Fill a short form on TradePe. Takes 5 minutes.', time: '5 min' },
        { icon: '\ud83c\udfe6', label: 'Bank reviews', desc: 'Our partner bank checks buyer details. You don\u2019t visit any branch.', time: '1\u20132 days' },
        { icon: '\u2705', label: 'LC issued', desc: 'The bank guarantees your payment. You\u2019re now protected.', time: 'Instant' },
        { icon: '\ud83d\udea2', label: 'You ship goods', desc: 'Ship with confidence \u2014 your payment is already guaranteed.', time: 'Your pace' },
        { icon: '\ud83d\udcb0', label: 'You get paid', desc: 'Bank pays you directly. No chasing the buyer.', time: '3\u20135 days' }
      ],
      savings: {
        old: { label: 'Going to your bank', val: '7\u201314 days', detail: '3+ branch visits, paperwork, follow-ups, \u20b95,000\u201315,000 in fees' },
        new: { label: 'Using TradePe', val: '2\u20133 days', detail: 'Zero branch visits, 5-min form, first LC free (\u20b90 fee)' }
      },
      youSave: 'Save 5\u201311 days + \u20b95,000\u201315,000 in bank fees'
    },
    financing: {
      icon: '\u26a1',
      title: 'How does Invoice Financing work?',
      subtitle: 'Get paid today instead of waiting 14\u201360 days. Here\u2019s how it works.',
      steps: [
        { icon: '\ud83d\udce8', label: 'You apply', desc: 'One click from your order page. No paperwork.', time: '1 min' },
        { icon: '\ud83d\udd0d', label: 'Instant check', desc: 'TradePe reviews your invoice and buyer history.', time: '4 hours' },
        { icon: '\ud83d\udcb8', label: 'Money in your account', desc: 'Full invoice amount minus 1.5% fee, sent to your bank.', time: 'Same day' },
        { icon: '\ud83e\udd1d', label: 'Buyer pays TradePe', desc: 'Your buyer repays TradePe directly. You\u2019re done.', time: 'On due date' }
      ],
      savings: {
        old: { label: 'Waiting for buyer', val: '14\u201360 days', detail: 'Cash stuck, can\u2019t fulfil new orders, manual follow-ups' },
        new: { label: 'Using TradePe', val: 'Same day', detail: '1.5% fee, no chasing buyer, money in 4 hours' }
      },
      youSave: 'Get paid 14\u201360 days earlier + zero follow-up effort'
    },
    payment: {
      icon: '\ud83d\udcb8',
      title: 'How does Payment Collection work?',
      subtitle: 'Send a payment request to your buyer in one click. Here\u2019s the full flow.',
      steps: [
        { icon: '\ud83d\udce4', label: 'You send request', desc: 'One-click from TradePe. Buyer gets an email with payment link.', time: '1 min' },
        { icon: '\ud83d\udc41\ufe0f', label: 'Buyer views it', desc: 'You can track when they open it \u2014 live activity updates.', time: 'Real-time' },
        { icon: '\ud83d\udcb3', label: 'Buyer pays', desc: 'Buyer pays in their currency. TradePe handles the conversion.', time: '1\u20137 days' },
        { icon: '\ud83c\udfe6', label: 'INR in your bank', desc: 'You get INR at TradePe\u2019s better FX rate. \u20b91.4 more per dollar vs banks.', time: 'Instant' }
      ],
      savings: {
        old: { label: 'Traditional bank wire', val: '5\u20137 days', detail: 'Poor FX rates, \u20b918\u201325 per dollar less, manual SWIFT tracking' },
        new: { label: 'Using TradePe', val: '1\u20133 days', detail: 'Better FX rate, live tracking, auto-reminders to buyer' }
      },
      youSave: 'Save 3\u20134 days + \u20b91.4 more per dollar on every payment'
    },
    documents: {
      icon: '\ud83d\udccb',
      title: 'How does Document Management work?',
      subtitle: 'Upload once, we handle the rest. No customs rejections.',
      steps: [
        { icon: '\ud83d\udcc4', label: 'Smart checklist', desc: 'TradePe shows exactly which documents your buyer\u2019s country needs.', time: 'Instant' },
        { icon: '\u2b06\ufe0f', label: 'You upload', desc: 'Drag and drop your documents. We check formatting automatically.', time: '2 min' },
        { icon: '\ud83d\udd0d', label: 'Auto-verified', desc: 'We validate against country-specific requirements. Flag errors instantly.', time: 'Instant' },
        { icon: '\u2705', label: 'Customs-ready', desc: 'Your documents are compliant and ready for shipment clearance.', time: 'Done' }
      ],
      savings: {
        old: { label: 'Manual process', val: '2\u20133 days', detail: 'Guessing which docs are needed, rejection risk, re-submissions' },
        new: { label: 'Using TradePe', val: '10 min', detail: 'Country-specific checklists, auto-validation, 99.2% first-time pass' }
      },
      youSave: 'Save 2\u20133 days + zero customs rejections'
    }
  };

  function openHelp(topic) {
    const t = HELP_TOPICS[topic];
    if (!t) return;
    const modal = document.getElementById('help-modal');
    const content = document.getElementById('help-content');
    if (!modal || !content) return;

    const stepsHTML = t.steps.map(s => `
      <div class="help-step">
        <div class="help-step-num">${s.icon}</div>
        <div class="help-step-body">
          <div class="help-step-label">${s.label}</div>
          <div class="help-step-desc">${s.desc}</div>
          <div class="help-step-time">\u23f1 ${s.time}</div>
        </div>
      </div>`).join('');

    content.innerHTML = `
      <div class="help-header-icon">${t.icon}</div>
      <div class="help-title">${t.title}</div>
      <div class="help-subtitle">${t.subtitle}</div>
      <div class="help-steps">${stepsHTML}</div>
      <div class="help-savings">
        <div class="help-save-card old">
          <div class="help-save-label">${t.savings.old.label}</div>
          <div class="help-save-val">${t.savings.old.val}</div>
          <div class="help-save-detail">${t.savings.old.detail}</div>
        </div>
        <div class="help-save-card new">
          <div class="help-save-label">${t.savings.new.label}</div>
          <div class="help-save-val">${t.savings.new.val}</div>
          <div class="help-save-detail">${t.savings.new.detail}</div>
        </div>
      </div>
      <div class="help-you-save">
        <div class="help-you-save-title">You save</div>
        <div class="help-you-save-val">${t.youSave}</div>
      </div>`;

    modal.style.display = 'flex';
    logEvent('HELP_OPENED', topic);
  }

  function closeHelp() {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
  }

  // ============================================================
  // BOOT
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    goHome, goDocuments, goAnalytics, goProfile,
    openOrder, switchTab,
    sendRequest, simulatePaid, markShipped,
    uploadDoc, removeDoc,
    closeOrder,
    openLC, cancelLC, submitLC, dismissLC,
    openFin, cancelFin, submitFin, dismissFin,
    startNewOrder, onBuyerInput, selectBuyer,
    noStep1Continue, noBack, onAmountInput, saveOrder,
    goPaymentTab, goDocsTab, sendReminder,
    dismissOnboarding, replayOnboarding, toggleChat, sendChatMessage,
    nudgeGoToLC, dismissNudge,
    openHelp, closeHelp,
    claimPremium,
    saveProfile
  };

})();
