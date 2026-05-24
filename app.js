/**
 * TradePe Export Command Center MVP
 * Core Interactive Application Logic - Shallow IA & Multi-Payment Scenarios
 */

class TradePeApp {
  constructor() {
    this.state = {
      activeTab: 'home', // home, orders, documents, notifications, profile, onboarding, workspace
      selectedOrderId: null,
      selectedSubTab: 'overview', // overview, timeline, documents, payment, close
      onboardingCompleted: true,
      
      onboarding: {
        currentSection: 'biz-details', // biz-details, biz-kyc, owner-kyc, remittance, addl-docs, vkyc
        completedSections: [],
        uploadedAuth: false,
        uploadedAddr: false
      },
      
      orders: [
        {
          id: 'TRP-123',
          buyer: 'ABC Textiles',
          country: 'USA',
          value: 24500,
          goods: '100% Cotton Woven Fabrics (Greige)',
          flowType: 'lc', // lc, advance, open
          currentStage: 'timeline', 
          statusText: 'LC Audit Pending',
          // flow states
          lcAccepted: false,
          lcChecks: { check1: false, check2: false, check3: false, check4: false },
          documents: { invoice: false, packing: false, origin: false, bl: false },
          bankAuditStatus: 'idle', // idle, running, complete
          releasedFunds: 0,
          fxConverted: false,
          settled: false,
          logs: [
            { text: 'Irrevocable LC drafted by JPMorgan Chase Bank and issued to advising bank SBI.', time: '3 hours ago' }
          ]
        },
        {
          id: 'TRP-124',
          buyer: 'Muller GmbH',
          country: 'Germany',
          value: 18200,
          goods: 'Silk Scarves (Finished)',
          flowType: 'advance',
          currentStage: 'timeline',
          statusText: 'Awaiting Advance Payment',
          // flow states
          advancePaymentReceived: false,
          documents: { invoice: false, packing: false, bl: false },
          fxConverted: false,
          settled: false,
          logs: [
            { text: 'Order confirmed under 100% Advance Payment terms. Invoice issued.', time: '1 day ago' }
          ]
        },
        {
          id: 'TRP-125',
          buyer: 'Sunrise Imports',
          country: 'UAE',
          value: 9800,
          goods: 'Handicrafts & Home Decor',
          flowType: 'open',
          currentStage: 'timeline',
          statusText: 'Awaiting Shipment Dispatch',
          // flow states
          shipped: false,
          documents: { invoice: false, packing: false, bl: false },
          openPaymentReceived: false,
          fxConverted: false,
          settled: false,
          logs: [
            { text: 'Purchase order signed under Open Account (60 Days Net) terms.', time: '5 days ago' }
          ]
        }
      ]
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
    // Default load: main dashboard Home tab
    this.switchTab('home');
  }

  bindEvents() {
    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeUploadModal();
        this.closeStartOrderModal();
      }
    });

    // Close modals on background click
    const modalUpload = document.getElementById('upload-dialog');
    if (modalUpload) {
      modalUpload.addEventListener('click', (e) => {
        if (e.target === modalUpload) this.closeUploadModal();
      });
    }
    const modalStart = document.getElementById('start-order-modal');
    if (modalStart) {
      modalStart.addEventListener('click', (e) => {
        if (e.target === modalStart) this.closeStartOrderModal();
      });
    }
  }

  // ==================== LEVEL 1 TABS ROUTER ====================
  switchTab(tabName) {
    this.state.activeTab = tabName;
    this.state.selectedOrderId = null; // Clear active workspace context

    // Hide all view screens
    document.querySelectorAll('.view-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show selected panel
    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Toggle active state in sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeNavItem = document.getElementById(`nav-item-${tabName}`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }

    // Toggle header button
    const backBtn = document.getElementById('btn-back-to-list');
    if (backBtn) backBtn.style.display = 'none';

    // Update headers
    const titleEl = document.getElementById('page-header-title');
    const subEl = document.getElementById('page-header-subtitle');
    
    if (tabName === 'home') {
      titleEl.innerText = 'Good morning, Ankita 👋';
      subEl.innerText = 'Here is what needs your attention today';
      this.renderHomeTab();
    } else if (tabName === 'orders') {
      titleEl.innerText = 'Exporter Order Pipeline';
      subEl.innerText = 'Track shipment, letters of credit, and foreign exchange conversion status';
      this.renderOrdersTab();
    } else if (tabName === 'documents') {
      titleEl.innerText = 'Compliance Document Vault';
      subEl.innerText = 'Consolidated repository of billing invoices, certificates, and logistics bills';
      this.renderDocumentsTab();
    } else if (tabName === 'notifications') {
      titleEl.innerText = 'Compliance alerts & warnings';
      subEl.innerText = 'Live notifications from customs, advising banks, and buyers';
      this.renderNotificationsTab();
    } else if (tabName === 'profile') {
      titleEl.innerText = 'Company Profile & Bank linking';
      subEl.innerText = 'Verify company registrations, linking AD codes, and configuring advising bank details';
    } else if (tabName === 'onboarding') {
      titleEl.innerText = 'Exporter Onboarding Setup';
      subEl.innerText = 'Link bank AD code and verify personal KYC to activate features';
      this.changeOnboardingStep('biz-details');
    }

    // Update active orders count badge in sidebar
    this.updateSidebarBadges();
  }

  updateSidebarBadges() {
    const activeCount = this.state.orders.filter(o => !o.settled).length;
    const badge = document.getElementById('sidebar-active-orders-count');
    if (badge) {
      badge.innerText = activeCount;
      badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
    }
  }

  // ==================== RENDERING LEVEL 1 VIEWS ====================
  
  renderHomeTab() {
    const activeCount = this.state.orders.filter(o => !o.settled).length;
    const completedCount = this.state.orders.filter(o => o.settled).length;
    
    // Needs attention count is any active order that is either not accepted (LC) or needs invoice upload or needs wire simulator
    let attentionCount = 0;
    this.state.orders.forEach(o => {
      if (!o.settled) {
        if (o.flowType === 'lc' && !o.lcAccepted) attentionCount++;
        else if (o.flowType === 'advance' && !o.advancePaymentReceived) attentionCount++;
        else if (o.flowType === 'open' && !o.shipped) attentionCount++;
      }
    });

    document.getElementById('home-stat-active').innerText = activeCount;
    document.getElementById('home-stat-attention').innerText = attentionCount;
    document.getElementById('home-stat-completed').innerText = completedCount;

    // Render Quick Resume card with the first non-settled order
    const activeOrder = this.state.orders.find(o => !o.settled) || this.state.orders[0];
    if (activeOrder) {
      document.getElementById('resume-card-title').innerText = `${activeOrder.id} · ${activeOrder.buyer}`;
      document.getElementById('resume-card-title').nextElementSibling.innerText = `$${activeOrder.value.toLocaleString()} ${activeOrder.goods} shipment under ${activeOrder.flowType.toUpperCase()} terms`;
      document.getElementById('resume-order-btn').setAttribute('onclick', `app.openOrderWorkspace('${activeOrder.id}')`);
      
      // Customize resume text by stage
      let happened = '';
      let next = '';
      if (activeOrder.flowType === 'lc') {
        if (!activeOrder.lcAccepted) {
          happened = 'Letter of Credit drafted by JPMorgan Chase Bank has been issued to advising bank SBI.';
          next = 'Verify that the document clauses and cargo dispatch timelines match agreement before accepting the LC draft.';
        } else if (!activeOrder.documents.bl) {
          happened = 'Exporter accepted the Irrevocable LC terms. Manufacture process initiated.';
          next = 'Upload physical cargo documentation (Invoice, Packing List, Origin) and dispatch container to port to receive Bill of Lading.';
        } else if (activeOrder.bankAuditStatus !== 'complete') {
          happened = 'Vessel Maersk Rajasthan departed Mumbai Port. Proof of transit BL uploaded.';
          next = 'SBI is auditing compliance documents. Click SBI Audit on Payment screen to release funds.';
        } else if (!activeOrder.fxConverted) {
          happened = 'Compliance audit passed! USD 24,500.00 released and held in secure TradePe wallet.';
          next = 'Review live FX exchange rate and lock currency conversion to credit your State Bank of India account.';
        } else {
          happened = 'FX manual conversion cleared. Remittance funds converted to Rupees successfully.';
          next = 'File RBI IDPMS customs shipping logs to complete and close transaction.';
        }
      } else if (activeOrder.flowType === 'advance') {
        if (!activeOrder.advancePaymentReceived) {
          happened = 'Order initiated. Payment terms agreed to 100% advance wire transfer.';
          next = 'Awaiting payment confirmation from buyer. Sim buyer wire transfer arrival.';
        } else if (!activeOrder.documents.bl) {
          happened = 'Advance wire transfer of $18,200.00 received and cleared in wallet.';
          next = 'Prepare invoice paperwork, dispatch container cargo, and upload carrier Bill of Lading.';
        } else if (!activeOrder.fxConverted) {
          happened = 'Cargo transit departed. Exporter dispatch documents logged.';
          next = 'Lock USD rate to transfer Rupees to linked SBI account.';
        } else {
          happened = 'FX conversion completed. Rupees credited to linked SBI account.';
          next = 'Coordinate AD code shipping bill matching to reconcile customs ledger.';
        }
      } else if (activeOrder.flowType === 'open') {
        if (!activeOrder.shipped) {
          happened = 'Order confirmed under Open Account (60-day pay later terms).';
          next = 'Prepare shipping container. Upload Invoice and Packing list, then dispatch cargo.';
        } else if (!activeOrder.openPaymentReceived) {
          happened = 'Containers dispatched on Maersk Rajasthan. 60-day net payment timeline active.';
          next = 'Exporter awaits buyer payment release. Simulate net remittance transfer arrival.';
        } else if (!activeOrder.fxConverted) {
          happened = 'Open account remittance cleared. USD 9,800.00 credited in wallet.';
          next = 'Lock FX exchange rate to transfer settlement credits to linked SBI account.';
        } else {
          happened = 'Rupee settlement credits transferred to linked SBI account.';
          next = 'Verify IRM code customs filing and mark transaction closed.';
        }
      }

      document.getElementById('resume-card-happened').innerText = happened;
      document.getElementById('resume-card-next').innerText = next;
    }

    // Render Home Attention Table
    const attentionTbody = document.querySelector('#home-attention-table tbody');
    attentionTbody.innerHTML = '';
    
    let hasAttention = false;
    this.state.orders.forEach(o => {
      if (!o.settled) {
        let actionStr = '';
        let isCritical = false;
        
        if (o.flowType === 'lc' && !o.lcAccepted) {
          actionStr = 'Verify JPMorgan Chase LC Draft';
          isCritical = true;
        } else if (o.flowType === 'advance' && !o.advancePaymentReceived) {
          actionStr = 'Awaiting buyer wire transfer';
        } else if (o.flowType === 'open' && !o.shipped) {
          actionStr = 'Prepare shipping & Upload docs';
          isCritical = true;
        } else if (!o.documents.bl) {
          actionStr = 'Upload Bill of Lading (BL)';
          isCritical = true;
        } else if (o.flowType === 'lc' && o.bankAuditStatus === 'idle') {
          actionStr = 'Trigger SBI compliance audit';
          isCritical = true;
        } else if (!o.fxConverted) {
          actionStr = 'Convert USD wallet to Rupees';
          isCritical = true;
        } else if (!o.settled) {
          actionStr = 'Complete customs reconciliation';
          isCritical = true;
        }

        if (actionStr) {
          hasAttention = true;
          const tr = document.createElement('tr');
          if (isCritical) tr.className = 'attention-row';
          tr.setAttribute('onclick', `app.openOrderWorkspace('${o.id}')`);
          
          let badgeClass = o.flowType === 'lc' ? 'purple' : o.flowType === 'advance' ? 'blue' : 'grey';
          
          tr.innerHTML = `
            <td><span class="order-link">${o.id}</span></td>
            <td>${o.buyer}</td>
            <td class="text-bold">$${o.value.toLocaleString()}</td>
            <td><span class="status-badge ${badgeClass}" style="font-size:9px; padding:2px 8px;">${o.flowType.toUpperCase()}</span></td>
            <td style="text-transform: capitalize;">${o.currentStage}</td>
            <td class="${isCritical ? 'text-action' : 'text-muted'}">${actionStr}</td>
          `;
          attentionTbody.appendChild(tr);
        }
      }
    });

    if (!hasAttention) {
      attentionTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No pending attention items. All orders are on track!</td></tr>`;
    }

    // Render Activity log list (take logs from all orders, sorted by most recent theoretically)
    const activityList = document.getElementById('home-activity-list');
    activityList.innerHTML = '';
    
    let allLogs = [];
    this.state.orders.forEach(o => {
      o.logs.forEach(l => {
        allLogs.push({ orderId: o.id, text: l.text, time: l.time });
      });
    });

    allLogs.slice(0, 5).forEach(log => {
      const div = document.createElement('div');
      div.className = 'update-item';
      div.innerHTML = `
        <div class="update-icon">✓</div>
        <div class="update-content">
          <span class="update-text"><strong>${log.orderId}</strong>: ${log.text}</span>
          <span class="update-time">${log.time}</span>
        </div>
      `;
      activityList.appendChild(div);
    });
  }

  renderOrdersTab() {
    const activeTbody = document.getElementById('orders-active-list');
    const completedTbody = document.getElementById('orders-completed-list');
    
    activeTbody.innerHTML = '';
    completedTbody.innerHTML = '';

    let activeCount = 0;
    let completedCount = 0;

    this.state.orders.forEach(o => {
      const termBadge = o.flowType === 'lc' ? 'purple' : o.flowType === 'advance' ? 'blue' : 'grey';
      
      if (!o.settled) {
        activeCount++;
        const tr = document.createElement('tr');
        tr.setAttribute('onclick', `app.openOrderWorkspace('${o.id}')`);
        
        let nextAction = 'Continue';
        if (o.flowType === 'lc' && !o.lcAccepted) nextAction = 'Verify LC Draft';
        else if (o.flowType === 'advance' && !o.advancePaymentReceived) nextAction = 'Awaiting payment';
        else if (!o.documents.invoice) nextAction = 'Upload Invoice';
        else if (!o.documents.bl) nextAction = 'Upload Carrier BL';
        else if (o.flowType === 'lc' && o.bankAuditStatus === 'idle') nextAction = 'Bank Audit';
        else if (!o.fxConverted) nextAction = 'Execute FX Conversion';
        else nextAction = 'Reconcile Customs';

        tr.innerHTML = `
          <td><span class="order-link">${o.id}</span></td>
          <td>${o.buyer} (${o.country})</td>
          <td class="text-bold">$${o.value.toLocaleString()}</td>
          <td><span class="status-badge ${termBadge}">${o.flowType.toUpperCase()}</span></td>
          <td style="text-transform: capitalize;">${o.currentStage}</td>
          <td class="text-action">${nextAction}</td>
          <td><span class="status-badge orange">${o.statusText}</span></td>
        `;
        activeTbody.appendChild(tr);
      } else {
        completedCount++;
        const tr = document.createElement('tr');
        tr.setAttribute('onclick', `app.openOrderWorkspace('${o.id}')`);
        tr.innerHTML = `
          <td><span class="order-link">${o.id}</span></td>
          <td>${o.buyer} (${o.country})</td>
          <td class="text-bold">$${o.value.toLocaleString()}</td>
          <td><span class="status-badge ${termBadge}">${o.flowType.toUpperCase()}</span></td>
          <td>Settled & Archived</td>
          <td><span class="status-badge green">Completed ✓</span></td>
        `;
        completedTbody.appendChild(tr);
      }
    });

    if (activeCount === 0) {
      activeTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">No active orders. Create one now!</td></tr>`;
    }
    if (completedCount === 0) {
      completedTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No completed transactions.</td></tr>`;
    }
  }

  filterOrdersList(mode) {
    const actBtn = document.getElementById('orders-filter-active');
    const compBtn = document.getElementById('orders-filter-completed');
    const actCont = document.getElementById('orders-active-container');
    const compCont = document.getElementById('orders-completed-container');

    if (mode === 'active') {
      actBtn.classList.add('selected');
      compBtn.classList.remove('selected');
      actCont.style.display = 'block';
      compCont.style.display = 'none';
    } else {
      actBtn.classList.remove('selected');
      compBtn.classList.add('selected');
      actCont.style.display = 'none';
      compCont.style.display = 'block';
    }
  }

  renderDocumentsTab() {
    const tbody = document.getElementById('documents-list-body');
    tbody.innerHTML = '';
    
    this.state.orders.forEach(o => {
      Object.keys(o.documents).forEach(docKey => {
        const isUploaded = o.documents[docKey];
        const label = docKey === 'invoice' ? 'Commercial Invoice' :
                      docKey === 'packing' ? 'Packing List' :
                      docKey === 'origin' ? 'Certificate of Origin' :
                      docKey === 'bl' ? 'Carrier Bill of Lading' : docKey;
                      
        const tr = document.createElement('tr');
        tr.setAttribute('onclick', `app.openOrderWorkspace('${o.id}')`);
        
        tr.innerHTML = `
          <td class="text-bold">${label}</td>
          <td><span class="order-link">${o.id}</span></td>
          <td style="text-transform: capitalize;">${o.flowType.toUpperCase()} Spec</td>
          <td>${isUploaded ? '24 May 2026' : '--'}</td>
          <td><span class="status-badge ${isUploaded ? 'green' : 'orange'}">${isUploaded ? 'Uploaded ✓' : 'Pending'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    });
  }

  renderNotificationsTab() {
    const container = document.getElementById('notifications-list-container');
    container.innerHTML = '';

    const notifications = [
      { text: "Letter of Credit draft for TRP-123 is ready for exporter audit approval.", type: "action", order: "TRP-123", time: "3 hours ago" },
      { text: "Containers for order TRP-124 are manufactured and awaiting dispatch.", type: "info", order: "TRP-124", time: "1 day ago" },
      { text: "State Bank of India linked successfully with AD code 031256789.", type: "system", order: "", time: "3 days ago" },
      { text: "Video KYC verification completed by TradePe Officer Rajesh Kumar.", type: "system", order: "", time: "3 days ago" }
    ];

    notifications.forEach(n => {
      const card = document.createElement('div');
      card.className = `alert-banner ${n.type === 'action' ? 'warning' : n.type === 'info' ? 'purple' : 'success'}`;
      card.style.margin = '0';
      card.style.cursor = n.order ? 'pointer' : 'default';
      if (n.order) {
        card.setAttribute('onclick', `app.openOrderWorkspace('${n.order}')`);
      }
      
      card.innerHTML = `
        <div class="alert-message-container">
          <span class="alert-title">${n.text}</span>
          <span class="alert-desc">${n.order ? `Order ID: ${n.order} · ` : ''}${n.time}</span>
        </div>
        ${n.order ? '<button class="btn btn-outline btn-sm" style="font-size:10px; padding:4px 8px;">Action</button>' : ''}
      `;
      container.appendChild(card);
    });
  }

  // ==================== START NEW ORDER MODAL ====================
  showStartOrderModal() {
    document.getElementById('start-order-modal').classList.add('active');
  }
  closeStartOrderModal() {
    document.getElementById('start-order-modal').classList.remove('active');
  }
  submitNewOrder() {
    const buyer = document.getElementById('new-order-buyer').value.trim();
    const value = parseFloat(document.getElementById('new-order-value').value);
    const goods = document.getElementById('new-order-goods').value.trim() || 'Export Commodities';
    const flow = document.getElementById('new-order-flow').value;

    if (!buyer || isNaN(value) || value <= 0) {
      this.showToast('Please specify a valid Buyer company and Order value.');
      return;
    }

    const nextId = `TRP-${123 + this.state.orders.length}`;
    
    // Create new order object
    const newOrder = {
      id: nextId,
      buyer: buyer,
      country: flow === 'lc' ? 'United Kingdom' : flow === 'advance' ? 'France' : 'Canada',
      value: value,
      goods: goods,
      flowType: flow,
      currentStage: 'timeline',
      statusText: flow === 'lc' ? 'Awaiting LC Draft' : flow === 'advance' ? 'Awaiting Payment' : 'Awaiting Ship docs',
      lcAccepted: false,
      lcChecks: { check1: false, check2: false, check3: false, check4: false },
      documents: flow === 'lc' ? { invoice: false, packing: false, origin: false, bl: false } : { invoice: false, packing: false, bl: false },
      bankAuditStatus: 'idle',
      releasedFunds: 0,
      fxConverted: false,
      settled: false,
      logs: [
        { text: `Order created under ${flow.toUpperCase()} terms.`, time: 'Just now' }
      ]
    };

    this.state.orders.push(newOrder);
    this.closeStartOrderModal();
    this.showToast(`Order ${nextId} created successfully! Opening workspace.`);
    
    // Open immediately
    this.openOrderWorkspace(nextId);
  }

  // ==================== WORKSPACE ROUTER ====================
  
  openOrderWorkspace(orderId) {
    this.state.selectedOrderId = orderId;
    this.state.activeTab = 'workspace';
    
    // Deactivate Level 1 Views
    document.querySelectorAll('.view-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show Workspace Panel
    document.getElementById('panel-order-workspace').classList.add('active');

    // Highlight Orders Sidebar Nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const ordersNav = document.getElementById('nav-item-orders');
    if (ordersNav) ordersNav.classList.add('active');

    // Show Exit button in header
    const backBtn = document.getElementById('btn-back-to-list');
    if (backBtn) {
      backBtn.style.display = 'inline-flex';
      backBtn.innerText = '← Back to Orders';
    }

    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return;

    // Render top banner details
    document.getElementById('workspace-title-text').innerText = `${order.id} · ${order.buyer}`;
    const flowText = order.flowType === 'lc' ? 'Irrevocable Letter of Credit' : order.flowType === 'advance' ? '100% Advance Payment' : 'Open Account (60 Days Net)';
    document.getElementById('workspace-banner-el').querySelector('.workspace-banner-meta').innerHTML = `
      <span><strong>Buyer:</strong> ${order.buyer} (${order.country})</span>
      <span><strong>Order Value:</strong> $${order.value.toLocaleString()} USD</span>
      <span><strong>Payment Term:</strong> ${flowText}</span>
    `;
    
    // Renders the banner status text
    this.updateWorkspaceBannerStatus();

    // Spec overview sync
    document.getElementById('spec-buyer-company').innerText = order.buyer;
    document.getElementById('spec-contract-amount').innerText = `$${order.value.toLocaleString()} USD`;
    document.getElementById('spec-goods-description').innerText = order.goods;
    document.getElementById('spec-payment-security').innerText = flowText;

    // Load initial subtab overview
    this.switchSubTab('overview');
  }

  updateWorkspaceBannerStatus() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;
    
    const badge = document.getElementById('workspace-status-badge-text');
    if (order.settled) {
      badge.innerText = 'Closed & Archived ✓';
      badge.className = 'status-badge green';
    } else if (order.fxConverted) {
      badge.innerText = 'FX Converted';
      badge.className = 'status-badge green';
    } else if (order.flowType === 'lc' && order.bankAuditStatus === 'complete') {
      badge.innerText = 'Funds Wallet Released';
      badge.className = 'status-badge green';
    } else if (order.documents.bl) {
      badge.innerText = order.flowType === 'lc' ? 'Awaiting Bank Audit' : 'Awaiting FX Lock';
      badge.className = 'status-badge orange';
    } else if (order.documents.invoice && order.documents.packing) {
      badge.innerText = 'Ready to Dispatch Cargo';
      badge.className = 'status-badge blue';
    } else if (order.flowType === 'lc' && order.lcAccepted) {
      badge.innerText = 'Awaiting Invoices & Packing';
      badge.className = 'status-badge orange';
    } else if (order.flowType === 'advance' && order.advancePaymentReceived) {
      badge.innerText = 'Payment Cleared, Awaiting Docs';
      badge.className = 'status-badge blue';
    } else {
      badge.innerText = order.statusText;
      badge.className = 'status-badge orange';
    }
  }

  exitWorkspace() {
    this.switchTab('orders');
  }

  switchSubTab(subTabName) {
    this.state.selectedSubTab = subTabName;
    
    // Toggle active subtab visual classes
    document.querySelectorAll('.workspace-subtabs .subtab-item').forEach(item => {
      item.classList.remove('active');
    });
    const targetTabItem = document.getElementById(`subtab-${subTabName}`);
    if (targetTabItem) targetTabItem.classList.add('active');

    // Toggle sub-panels visibility
    document.querySelectorAll('.workspace-subpanel').forEach(panel => {
      panel.classList.remove('active');
    });
    const targetPanel = document.getElementById(`workspace-panel-${subTabName}`);
    if (targetPanel) targetPanel.classList.add('active');

    // Refresh dynamic content in each panel
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;

    if (subTabName === 'overview') {
      this.renderOverviewSubpanel(order);
    } else if (subTabName === 'timeline') {
      this.renderTimelineSubpanel(order);
    } else if (subTabName === 'documents') {
      this.renderDocumentsSubpanel(order);
    } else if (subTabName === 'payment') {
      this.renderPaymentSubpanel(order);
    } else if (subTabName === 'close') {
      this.renderCloseSubpanel(order);
    }

    // Scroll back to top
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;
  }

  // ==================== RENDERING SUB-PANELS ====================

  renderOverviewSubpanel(order) {
    let happened = '';
    let next = '';
    
    if (order.flowType === 'lc') {
      if (!order.lcAccepted) {
        happened = 'Letter of Credit draft has been issued by JPMorgan Chase Bank and routed to State Bank of India.';
        next = 'Exporter Ankita Sharma needs to verify that the documentation conditions, amounts, and shipment timelines match contract constraints before accepting the bank guarantee terms.';
      } else if (!order.documents.bl) {
        happened = 'Exporter accepted JPMorgan Chase bank guarantee terms. Letter of Credit confirmed.';
        next = 'Upload physical cargo paperwork (Invoice, Packing List, Certificate of Origin) on the Documents tab and dispatch container cargo.';
      } else if (order.bankAuditStatus !== 'complete') {
        happened = 'Containers dispatched on Maersk Rajasthan vessel. carrier Bill of Lading (BL) uploaded.';
        next = 'SBI is auditing submitted documents to match JPMorgan Chase specifications. Go to FX & Settlement tab to trigger bank document check.';
      } else if (!order.fxConverted) {
        happened = 'State Bank of India audit passed! JPMorgan Chase has released USD 24,500.00 to your wallet.';
        next = 'Click Convert USD on FX & Settlement tab to lock exchange conversion rate and transfer Rupee credits.';
      } else {
        happened = 'Foreign exchange manual conversion completed. Rupees credited to State Bank of India account.';
        next = 'Go to Customs Reconciliation tab to link inwards remittance credits with customs shipping bill and close order.';
      }
    } else if (order.flowType === 'advance') {
      if (!order.advancePaymentReceived) {
        happened = 'Purchase Order initiated under 100% advance wire transfer terms. Proforma invoice dispatched.';
        next = 'Exporter awaits wire transfer arrival. Click Simulate Buyer Wire Arrival on Setup & Status tab to receive funds.';
      } else if (!order.documents.bl) {
        happened = 'Advance wire transfer of $18,200.00 received and cleared in wallet.';
        next = 'Upload physical cargo documentation (Invoice, Packing List) and dispatch container to ports.';
      } else if (!order.fxConverted) {
        happened = 'Vessel cargo dispatched. Shipping Bill customs logged.';
        next = 'Lock FX exchange rate and credit Rupees to linked SBI account.';
      } else {
        happened = 'Rupee settlement credits transferred to linked SBI account.';
        next = 'Link inwards IRM code with shipping bill on Customs Reconciliation tab to close transaction.';
      }
    } else if (order.flowType === 'open') {
      if (!order.shipped) {
        happened = 'Order confirmed under Open Account terms. Buyer Muller GmbH agrees to settle 60 days net post delivery.';
        next = 'Upload Invoice and Packing list on Documents tab, dispatch containers, and upload Carrier BL to confirm cargo loaded.';
      } else if (!order.openPaymentReceived) {
        happened = 'Containers loaded on vessel Maersk Rajasthan. 60-day net payment timeline active.';
        next = 'Exporter awaits buyer payment release. Simulate net remittance transfer arrival on Setup & Status tab.';
      } else if (!order.fxConverted) {
        happened = 'Open account remittance cleared. USD 9,800.00 held in multi-currency wallet.';
        next = 'Convert wallet balance to Rupee on FX & Settlement tab.';
      } else {
        happened = 'Rupee credits sent to SBI account.';
        next = 'Reconcile customs shipping log to archive transaction.';
      }
    }

    document.getElementById('overview-what-happened').innerText = happened;
    document.getElementById('overview-what-next').innerText = next;

    // Render overview button action redirection
    const cta = document.getElementById('overview-continue-cta');
    if (order.settled) {
      cta.setAttribute('onclick', "app.switchSubTab('close')");
      cta.querySelector('span').innerText = 'View Reconciliation Log &rarr;';
    } else if (order.fxConverted) {
      cta.setAttribute('onclick', "app.switchSubTab('close')");
      cta.querySelector('span').innerText = 'Proceed to Customs &rarr;';
    } else if (order.flowType === 'lc' && order.bankAuditStatus === 'complete') {
      cta.setAttribute('onclick', "app.switchSubTab('payment')");
      cta.querySelector('span').innerText = 'Proceed to FX Lock &rarr;';
    } else if (order.documents.bl) {
      cta.setAttribute('onclick', "app.switchSubTab('payment')");
      cta.querySelector('span').innerText = 'Proceed to Payment Audit &rarr;';
    } else if (order.flowType === 'lc' && !order.lcAccepted) {
      cta.setAttribute('onclick', "app.switchSubTab('timeline')");
      cta.querySelector('span').innerText = 'Verify & Accept LC &rarr;';
    } else if (order.flowType === 'advance' && !order.advancePaymentReceived) {
      cta.setAttribute('onclick', "app.switchSubTab('timeline')");
      cta.querySelector('span').innerText = 'Check Wire Status &rarr;';
    } else if (order.flowType === 'open' && !order.shipped) {
      cta.setAttribute('onclick', "app.switchSubTab('documents')");
      cta.querySelector('span').innerText = 'Upload Cargo Docs &rarr;';
    } else {
      cta.setAttribute('onclick', "app.switchSubTab('documents')");
      cta.querySelector('span').innerText = 'Upload Documents &rarr;';
    }
  }

  renderTimelineSubpanel(order) {
    const container = document.getElementById('timeline-flow-container');
    container.innerHTML = '';

    if (order.flowType === 'lc') {
      // LETTER OF CREDIT TIMELINE VIEW
      if (!order.lcAccepted) {
        // LC AUDIT CHECKS FORM
        const card = document.createElement('div');
        card.className = 'panel-card';
        card.innerHTML = `
          <h3 style="font-size:18px; font-weight:800; margin-bottom:4px;">Audit Bank Letter of Credit (LC)</h3>
          <p class="text-muted" style="font-size:12px; margin-bottom:20px;">Review irrevocable LC details below issued by JPMorgan Chase Bank. Validate conditions match contract specs before accepting.</p>
          
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px;">
            <!-- LC Certificate -->
            <div style="border: 2px dashed #94a3b8; border-radius:12px; padding:24px; font-family:'Courier New', monospace; font-size:11px; background:#f8fafc; line-height:1.5; color:#0f172a; max-height:400px; overflow-y:auto;">
              <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:12px;">
                <h4 style="margin:0 0 4px 0; font-size:12px; font-weight:bold;">IRREVOCABLE DOCUMENTARY LETTER OF CREDIT</h4>
                <span>JPMORGAN CHASE BANK, N.A. · DOCUMENTARY CREDITS DEPT</span>
              </div>
              <div><strong>LC NO:</strong> LCCN-2026-0897</div>
              <div><strong>DATE OF ISSUE:</strong> 24 MAY 2026</div>
              <div><strong>APPLICANT:</strong> ABC TEXTILES INC, 100 BROADWAY, NEW YORK, NY</div>
              <div><strong>BENEFICIARY:</strong> JAIPUR TEXTILES EXPORT, JAIPUR, INDIA</div>
              <div><strong>ADVISING BANK:</strong> STATE BANK OF INDIA, JAIPUR, INDIA</div>
              <div><strong>AMOUNT:</strong> USD 24,500.00 (TWENTY-FOUR THOUSAND FIVE HUNDRED USD)</div>
              <div><strong>EXPIRY:</strong> 30 JUNE 2026 IN EXPORTING COUNTRY</div>
              <div><strong>SHIPMENT OF:</strong> 100% COTTON WOVEN FABRICS (GREIGE FINISH)</div>
              <div><strong>PORT OF DISPATCH:</strong> MUMBAI PORT, INDIA</div>
              <div><strong>PORT OF ENTRY:</strong> NEW YORK PORT, USA</div>
              <div style="border-top:1px solid #cbd5e1; margin-top:12px; padding-top:12px;">
                <strong>DOCUMENTS REQUIRED:</strong><br>
                1. SIGNED COMMERCIAL INVOICE IN 3 COPIES.<br>
                2. PACKING LIST IN 2 COPIES.<br>
                3. CERTIFICATE OF ORIGIN (FORM A) ISSUED BY EXPORT COUNCILS.<br>
                4. FULL SET OF CLEAN ON-BOARD BILL OF LADING CONSIGNED TO ORDER.
              </div>
            </div>

            <!-- LC Checks Form -->
            <div style="display:flex; flex-direction:column; gap:16px;">
              <h4 style="font-size:12px; font-weight:800; margin:0; text-transform:uppercase; color:var(--text-muted);">LC Verification Checklist</h4>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <label style="display:flex; align-items:flex-start; gap:10px; font-size:12px; cursor:pointer;">
                  <input type="checkbox" id="lc-chk-1" ${order.lcChecks.check1 ? 'checked' : ''} onchange="app.handleLcCheckbox(1)">
                  <span><strong>Company Details Match</strong>: Exporter name matches "Jaipur Textiles Export" exactly.</span>
                </label>
                <label style="display:flex; align-items:flex-start; gap:10px; font-size:12px; cursor:pointer;">
                  <input type="checkbox" id="lc-chk-2" ${order.lcChecks.check2 ? 'checked' : ''} onchange="app.handleLcCheckbox(2)">
                  <span><strong>Expiry Timeline Buffer</strong>: LC Expiry (30 June 2026) gives enough manufacture buffer.</span>
                </label>
                <label style="display:flex; align-items:flex-start; gap:10px; font-size:12px; cursor:pointer;">
                  <input type="checkbox" id="lc-chk-3" ${order.lcChecks.check3 ? 'checked' : ''} onchange="app.handleLcCheckbox(3)">
                  <span><strong>Document Achievability</strong>: All 4 documents can be provided (Invoice, Packing, Origin, BL).</span>
                </label>
                <label style="display:flex; align-items:flex-start; gap:10px; font-size:12px; cursor:pointer;">
                  <input type="checkbox" id="lc-chk-4" ${order.lcChecks.check4 ? 'checked' : ''} onchange="app.handleLcCheckbox(4)">
                  <span><strong>Contract Amount Matches</strong>: Financial Value ($24,500.00) matches agreement.</span>
                </label>
              </div>

              <div style="margin-top:auto; padding-top:20px; border-top:1px solid var(--border-color);">
                <button class="btn btn-primary" id="lc-accept-btn" onclick="app.acceptLcDraft()" style="width:100%; justify-content:center;" ${this.verifyLcChecked(order) ? '' : 'disabled'}>Verify & Accept LC Terms &rarr;</button>
              </div>
            </div>
          </div>
        `;
        container.appendChild(card);
      } else {
        // LC TIMELINE GRAPHIC
        const card = document.createElement('div');
        card.className = 'panel-card';
        card.innerHTML = `
          <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Irrevocable Letter of Credit Timeline</h3>
          <div class="timeline">
            <div class="timeline-item done">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="timeline-info">
                  <span class="timeline-title">Letter of Credit Issued</span>
                  <span class="timeline-sub">JPMorgan Chase Bank guarantees USD 24,500.00 payment</span>
                </div>
              </div>
            </div>
            <div class="timeline-item done">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="timeline-info">
                  <span class="timeline-title">Exporter Audited & Accepted</span>
                  <span class="timeline-sub">Ankita Sharma verified and accepted document conditions</span>
                </div>
              </div>
            </div>
            <div class="timeline-item ${order.documents.invoice && order.documents.packing ? 'done' : 'active'}">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="timeline-info">
                  <span class="timeline-title">Upload Settlement Documents</span>
                  <span class="timeline-sub">Provide Commercial Invoice, Packing List, and Certificate of Origin</span>
                </div>
              </div>
            </div>
            <div class="timeline-item ${order.documents.bl ? 'done' : (order.documents.invoice && order.documents.packing ? 'active' : '')}">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="timeline-info">
                  <span class="timeline-title">Vessel Cargo Dispatch</span>
                  <span class="timeline-sub">Container dispatch to Mumbai ports and upload Carrier Bill of Lading (BL)</span>
                </div>
              </div>
            </div>
            <div class="timeline-item ${order.bankAuditStatus === 'complete' ? 'done' : (order.documents.bl ? 'active' : '')}">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="timeline-info">
                  <span class="timeline-title">SBI Audit & Settlement Release</span>
                  <span class="timeline-sub">SBI matches documents against Chase stipulations to release USD wallet</span>
                </div>
              </div>
            </div>
          </div>
        `;
        container.appendChild(card);
      }
    } else if (order.flowType === 'advance') {
      // ADVANCE PAYMENT TIMELINE VIEW
      const card = document.createElement('div');
      card.className = 'panel-card';
      
      let buttonHtml = '';
      if (!order.advancePaymentReceived) {
        buttonHtml = `
          <div style="background:var(--primary-light-bg); border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); border-radius:8px; padding:20px; text-align:center; margin-top:24px;">
            <p style="font-size:13px; font-weight:600; margin-bottom:12px;">Waiting for Advance Wire Transfer Arrival...</p>
            <button class="btn btn-orange" onclick="app.simulateAdvanceWireArrival()" style="margin:0 auto;">Simulate Buyer Wire Arrival &rarr;</button>
          </div>
        `;
      }

      card.innerHTML = `
        <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">100% Advance Payment Setup</h3>
        <div class="timeline">
          <div class="timeline-item done">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Purchase Order Issued</span>
                <span class="timeline-sub">Advance payment requested from Muller GmbH (Germany)</span>
              </div>
            </div>
          </div>
          <div class="timeline-item ${order.advancePaymentReceived ? 'done' : 'active'}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Wire Transfer Clearance</span>
                <span class="timeline-sub">${order.advancePaymentReceived ? 'USD 18,200.00 received and held in wallet' : 'Awaiting wire transfer routing through SWIFT'}</span>
              </div>
            </div>
          </div>
          <div class="timeline-item ${order.documents.invoice ? 'done' : (order.advancePaymentReceived ? 'active' : '')}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Upload Cargo Invoices</span>
                <span class="timeline-sub">Prepare invoice and cargo packing packing slip</span>
              </div>
            </div>
          </div>
          <div class="timeline-item ${order.documents.bl ? 'done' : (order.documents.invoice ? 'active' : '')}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Logistics Dispatch</span>
                <span class="timeline-sub">Dispatch cargo to carriers and record Bill of Lading (BL)</span>
              </div>
            </div>
          </div>
        </div>
        ${buttonHtml}
      `;
      container.appendChild(card);
    } else if (order.flowType === 'open') {
      // OPEN ACCOUNT TIMELINE VIEW
      const card = document.createElement('div');
      card.className = 'panel-card';

      let buttonHtml = '';
      if (order.shipped && !order.openPaymentReceived) {
        buttonHtml = `
          <div style="background:var(--primary-light-bg); border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); border-radius:8px; padding:20px; text-align:center; margin-top:24px;">
            <p style="font-size:13px; font-weight:600; margin-bottom:12px;">Containers Transit Departed · Awaiting Buyer Payment Release...</p>
            <button class="btn btn-orange" onclick="app.simulateOpenPaymentArrival()" style="margin:0 auto;">Simulate Buyer Net 60 Remittance &rarr;</button>
          </div>
        `;
      }

      card.innerHTML = `
        <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Open Account Timeline (60 Days Net)</h3>
        <div class="timeline">
          <div class="timeline-item done">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Contract Agreement Signed</span>
                <span class="timeline-sub">Open account terms established with Sunrise Imports (Dubai)</span>
              </div>
            </div>
          </div>
          <div class="timeline-item ${order.documents.invoice && order.documents.packing ? 'done' : 'active'}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Prepare Cargo Shipments</span>
                <span class="timeline-sub">Draft export invoice and loading packing list documentation</span>
              </div>
            </div>
          </div>
          <div class="timeline-item ${order.shipped ? 'done' : (order.documents.invoice && order.documents.packing ? 'active' : '')}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Dispatch Containers & BL</span>
                <span class="timeline-sub">Ship cargo out and upload carrier transit bill of lading (BL)</span>
              </div>
            </div>
          </div>
          <div class="timeline-item ${order.openPaymentReceived ? 'done' : (order.shipped ? 'active' : '')}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-info">
                <span class="timeline-title">Open Account Remittance</span>
                <span class="timeline-sub">${order.openPaymentReceived ? 'USD 9,800.00 wire received ✓' : 'Awaiting net 60 settlement credits'}</span>
              </div>
            </div>
          </div>
        </div>
        ${buttonHtml}
      `;
      container.appendChild(card);
    }
  }

  handleLcCheckbox(index) {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;
    
    const chk = document.getElementById(`lc-chk-${index}`);
    order.lcChecks[`check${index}`] = chk.checked;

    const acceptBtn = document.getElementById('lc-accept-btn');
    if (acceptBtn) {
      acceptBtn.disabled = !this.verifyLcChecked(order);
    }
  }

  verifyLcChecked(order) {
    return order.lcChecks.check1 && order.lcChecks.check2 && order.lcChecks.check3 && order.lcChecks.check4;
  }

  acceptLcDraft() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;
    
    order.lcAccepted = true;
    order.currentStage = 'documents';
    order.statusText = 'Doc Preparation';
    order.logs.push({ text: 'Letter of Credit draft verified and accepted by Exporter.', time: 'Just now' });
    
    this.showToast('LC draft accepted! Please proceed to upload settlement documents.');
    this.updateWorkspaceBannerStatus();
    this.switchSubTab('documents');
  }

  simulateAdvanceWireArrival() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;
    
    order.advancePaymentReceived = true;
    order.currentStage = 'documents';
    order.statusText = 'Doc Preparation';
    order.logs.push({ text: 'SWIFT wire transfer of USD 18,200.00 cleared in secure wallet.', time: 'Just now' });

    this.showToast('Wire transfer received! $18,200.00 has been credited to your USD wallet.');
    this.triggerConfetti();
    this.updateWorkspaceBannerStatus();
    this.switchSubTab('timeline');
  }

  simulateOpenPaymentArrival() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;
    
    order.openPaymentReceived = true;
    order.currentStage = 'payment';
    order.statusText = 'Payment Received';
    order.logs.push({ text: 'Open account wire transfer of USD 9,800.00 received from Sunrise Imports.', time: 'Just now' });

    this.showToast('Wire transfer received! $9,800.00 credited in your TradePe USD wallet.');
    this.triggerConfetti();
    this.updateWorkspaceBannerStatus();
    this.switchSubTab('timeline');
  }

  // ==================== RENDERING DOCUMENTS VIEW ====================

  renderDocumentsSubpanel(order) {
    const container = document.getElementById('documents-flow-container');
    container.innerHTML = '';

    const hasAllInitialDocs = order.documents.invoice && order.documents.packing && (order.flowType !== 'lc' || order.documents.origin);
    const hasBl = order.documents.bl;

    // What Happened / What Next info banner
    let subInfoBanner = '';
    if (order.flowType === 'lc' && !order.lcAccepted) {
      subInfoBanner = `
        <div class="what-next-card" style="margin-bottom:20px;">
          <div class="what-next-title">⚠️ Setup Pending</div>
          <div class="what-next-text">You must first verify and accept the JPMorgan Chase Letter of Credit draft on the "Setup & Status" tab before uploading shipping paperwork.</div>
        </div>
      `;
    }

    // Grid of cards
    let docsGrid = '';
    
    // Invoices card
    docsGrid += this.createDocCardHtml('invoice', 'Commercial Invoice', 'Official transaction bill detailing greige woven cargo pricing.', order.documents.invoice);
    
    // Packing List card
    docsGrid += this.createDocCardHtml('packing', 'Packing List', 'Specifies container cargo rollup counts, dimensions, and net weight details.', order.documents.packing);

    // Certificate of Origin card (only for LC)
    if (order.flowType === 'lc') {
      docsGrid += this.createDocCardHtml('origin', 'Certificate of Origin', 'Official certificate proving Indian origin of fabric cargo.', order.documents.origin);
    }

    // Bill of lading card
    let blCardDisabled = !hasAllInitialDocs;
    docsGrid += this.createDocCardHtml('bl', 'Carrier Bill of Lading (BL)', 'Official loading receipt issued by Maersk acknowledging transit cargo.', order.documents.bl, blCardDisabled);

    let submitCta = '';
    if (hasAllInitialDocs && !hasBl) {
      submitCta = `
        <div class="alert-banner purple" style="border-radius:12px; margin-top:24px;">
          <div class="alert-message-container">
            <span class="alert-title">Cargo Ready for Port Dispatch!</span>
            <span class="alert-desc">Invoices are verified. Deliver containers to Maersk cargo ship, then upload the Bill of Lading (BL) to present to the bank.</span>
          </div>
        </div>
      `;
    } else if (hasAllInitialDocs && hasBl) {
      let nextTabAction = order.flowType === 'lc' ? 'SBI compliance check' : 'currency conversion';
      let nextTabName = order.flowType === 'lc' ? 'payment' : 'payment';
      submitCta = `
        <div class="alert-banner success" style="border-radius:12px; margin-top:24px;">
          <div class="alert-message-container">
            <span class="alert-title">All required compliance paperwork loaded!</span>
            <span class="alert-desc">Your shipping documents match terms perfectly. Proceed to FX & Settlement for banking release.</span>
          </div>
          <button class="btn btn-success" onclick="app.switchSubTab('${nextTabName}')" style="font-size:12px; padding:8px 16px;">Proceed to Payment &rarr;</button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="panel-card">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:4px;">Upload Shipping Documentation</h3>
        <p class="text-muted" style="font-size:12px; margin-bottom:20px;">Upload documents matching requirements exactly. TradePe pre-scans compliance rules to avoid bank discrepancy audits.</p>
        
        ${subInfoBanner}
        
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px; opacity: ${order.flowType === 'lc' && !order.lcAccepted ? '0.5' : '1'}; pointer-events: ${order.flowType === 'lc' && !order.lcAccepted ? 'none' : 'auto'};">
          ${docsGrid}
        </div>
        
        ${submitCta}
      </div>
    `;
  }

  createDocCardHtml(key, title, desc, uploaded, disabled = false) {
    const badgeText = uploaded ? 'Uploaded ✓' : 'Pending';
    const badgeClass = uploaded ? 'green' : 'orange';
    const borderStyle = uploaded ? 'border:1px solid var(--success-border); background-color:var(--success-bg);' : 'border:1px solid var(--border-color);';
    
    return `
      <div class="panel-card" style="padding:20px; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; margin-bottom:0; transition: all 0.3s ease; opacity: ${disabled ? '0.5' : '1'}; pointer-events: ${disabled ? 'none' : 'auto'}; ${borderStyle}">
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; align-items:center;">
            <span style="font-size:20px;">📄</span>
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <h4 style="font-size:14px; font-weight:700; margin:0 0 4px 0; color:var(--text-main);">${title}</h4>
          <p class="text-muted" style="font-size:11px; line-height:1.4; margin:0;">${desc}</p>
        </div>
        <button class="btn ${uploaded ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="app.uploadDocument('${key}')" style="margin-top:16px; width:100%; justify-content:center;">
          ${uploaded ? 'Re-upload' : 'Upload File'}
        </button>
      </div>
    `;
  }

  uploadDocument(key) {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;

    const modal = document.getElementById('upload-dialog');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressPct = document.getElementById('upload-pct');
    const filenameEl = document.getElementById('upload-filename');
    const titleEl = document.getElementById('upload-dialog-title');

    const filenames = {
      invoice: 'commercial_invoice_v2.pdf',
      packing: 'packing_specification.pdf',
      origin: 'certificate_origin_customs.pdf',
      bl: 'bill_of_lading_ocean_freight.pdf'
    };

    titleEl.innerText = `Uploading document for ${order.id}`;
    filenameEl.innerText = filenames[key] || 'compliance_doc.pdf';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressPct.innerText = '0%';
    modal.classList.add('active');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressBar.style.width = `${progress}%`;
      progressPct.innerText = `${progress}%`;

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          modal.classList.remove('active');
          order.documents[key] = true;
          
          order.logs.push({ text: `Shipping document [${key.toUpperCase()}] uploaded successfully.`, time: 'Just now' });
          this.showToast(`${key.toUpperCase()} uploaded successfully!`);
          
          this.updateWorkspaceBannerStatus();
          this.switchSubTab('documents');
        }, 300);
      }
    }, 60);
  }

  closeUploadModal() {
    document.getElementById('upload-dialog').classList.remove('active');
  }

  // ==================== RENDERING PAYMENT FX VIEW ====================

  renderPaymentSubpanel(order) {
    const container = document.getElementById('payment-flow-container');
    container.innerHTML = '';

    // Flow B (LC) Specific Payment flow
    if (order.flowType === 'lc') {
      let auditLogHtml = '';
      let actionBtnHtml = '';
      let walletValue = '$0.00';
      let walletStatus = 'Pending Audits';
      let walletStatusClass = 'orange';

      if (order.bankAuditStatus === 'idle') {
        auditLogHtml = `
          <div class="update-item"><span class="update-icon" style="background:#fff3cd; color:#d97706;">⌛</span><div class="update-content"><span class="update-text">Commercial Invoice match verification pending.</span></div></div>
          <div class="update-item"><span class="update-icon" style="background:#fff3cd; color:#d97706;">⌛</span><div class="update-content"><span class="update-text">Carrier Bill of Lading loading verification pending.</span></div></div>
        `;
        actionBtnHtml = `<button class="btn btn-primary" onclick="app.executeLCAudit()" style="width:100%; justify-content:center; padding:12px;">Trigger SBI Bank Document Audit &rarr;</button>`;
      } else if (order.bankAuditStatus === 'running') {
        auditLogHtml = `
          <div class="update-item"><span class="spinner" style="border-top-color:var(--primary); border-width:3px; width:20px; height:20px; border-style:solid; display:inline-block; border-radius:50%; animation:spin 1s linear infinite;"></span><div class="update-content"><span class="update-text" style="font-weight:600;">SBI compliance team running documentation match...</span></div></div>
        `;
      } else if (order.bankAuditStatus === 'complete') {
        walletValue = `$${order.value.toLocaleString()}.00`;
        walletStatus = 'Released held in wallet';
        walletStatusClass = 'green';
        
        auditLogHtml = `
          <div class="update-item"><span class="update-icon" style="background:#d1fae5; color:#059669;">✓</span><div class="update-content"><span class="update-text" style="color:var(--success); font-weight:600;">Commercial Invoice matching checked.</span></div></div>
          <div class="update-item"><span class="update-icon" style="background:#d1fae5; color:#059669;">✓</span><div class="update-content"><span class="update-text" style="color:var(--success); font-weight:600;">Certificate of Origin authenticity checked.</span></div></div>
          <div class="update-item"><span class="update-icon" style="background:#d1fae5; color:#059669;">✓</span><div class="update-content"><span class="update-text" style="color:var(--success); font-weight:600;">Carrier Bill of Lading Maersk vessel departure checked.</span></div></div>
        `;

        if (!order.fxConverted) {
          actionBtnHtml = `
            <div id="fx-convert-widget">
              <h4 style="font-size:14px; font-weight:800; margin-bottom:12px;">Lock Currency Exchange Rate</h4>
              <div style="background:var(--primary-light-bg); border-radius:8px; padding:16px; margin-bottom:16px; border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Live exchange rate:</span><span class="text-bold" style="color:var(--primary);">1 USD = ₹83.42</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Rupee Yield Credits:</span><span class="text-bold" style="font-size:14px;">₹20,43,790</span></div>
                <div style="display:flex; justify-content:space-between;"><span class="text-muted">TradePe savings vs banks:</span><span class="text-bold" style="color:var(--success);">₹32,340</span></div>
              </div>
              <button class="btn btn-primary" onclick="app.executeFXConversion()" style="width:100%; justify-content:center; padding:12px; font-weight:700;">Convert USD ${order.value.toLocaleString()} to INR now &rarr;</button>
            </div>
          `;
        } else {
          actionBtnHtml = `
            <div style="text-align:center; padding:16px; border:1px solid var(--success-border); background-color:var(--success-bg); border-radius:8px;">
              <span style="font-size:32px; display:block; margin-bottom:8px;">✓</span>
              <h4 style="font-size:15px; font-weight:800; color:var(--success); margin:0 0 4px 0;">₹20,43,790.00 Credited</h4>
              <p class="text-muted" style="font-size:11px; margin-bottom:16px;">Funds successfully sent to State Bank of India AD account ending ...0542</p>
              <button class="btn btn-success btn-sm" onclick="app.switchSubTab('close')" style="width:100%; justify-content:center;">Proceed to Customs Reconciliation</button>
            </div>
          `;
        }
      }

      container.innerHTML = `
        <div class="panel-card" style="padding:24px;">
          <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Document Drawer Banking Audit</h3>
          
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px;">
            <!-- Compliance Audits log -->
            <div style="border: 1px solid var(--border-color); border-radius:12px; padding:20px; background:#fff; min-height:220px; display:flex; flex-direction:column;">
              <h4 style="font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:16px; text-transform:uppercase;">Compliance Audit Ledger</h4>
              <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
                ${auditLogHtml}
              </div>
            </div>

            <!-- Released Wallet -->
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div class="panel-card blue" style="padding:24px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); background:var(--primary-light-bg); margin-bottom:0;">
                <span class="text-muted" style="font-size:10px; text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Released USD Balance</span>
                <h3 style="font-size:32px; font-family:'Outfit'; font-weight:900; color:var(--primary); margin:8px 0;">${walletValue}</h3>
                <span class="status-badge ${walletStatusClass}" style="font-size:10px;">${walletStatus}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top:24px; border-top:1px solid var(--border-color); padding-top:20px;">
            ${actionBtnHtml}
          </div>
        </div>
      `;
    }

    // Flow A (Advance) Specific Payment flow
    if (order.flowType === 'advance') {
      let contentHtml = '';
      if (!order.advancePaymentReceived) {
        contentHtml = `
          <div style="text-align:center; padding:40px 20px;">
            <span style="font-size:48px; display:block; margin-bottom:16px;">⌛</span>
            <h4 style="font-size:16px; font-weight:800; margin-bottom:8px;">Awaiting SWIFT Wire Transfer Clearance</h4>
            <p class="text-muted" style="font-size:12px; max-width:400px; margin:0 auto 20px auto;">Once the buyer (Muller GmbH) issues wire transfer, funds will reflect in your TradePe USD balance. Navigate to Setup & Status to simulate transfer arrival.</p>
          </div>
        `;
      } else {
        let actionWidget = '';
        if (!order.fxConverted) {
          const yieldRupees = Math.round(order.value * 83.42);
          actionWidget = `
            <div>
              <h4 style="font-size:14px; font-weight:800; margin-bottom:12px;">Lock Currency Exchange Rate</h4>
              <div style="background:var(--primary-light-bg); border-radius:8px; padding:16px; margin-bottom:16px; border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Live exchange rate:</span><span class="text-bold" style="color:var(--primary);">1 USD = ₹83.42</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Rupee Yield Credits:</span><span class="text-bold" style="font-size:14px;">₹${yieldRupees.toLocaleString()}</span></div>
                <div style="display:flex; justify-content:space-between;"><span class="text-muted">TradePe savings vs banks:</span><span class="text-bold" style="color:var(--success);">₹${Math.round(order.value * 1.32).toLocaleString()}</span></div>
              </div>
              <button class="btn btn-primary" onclick="app.executeFXConversion()" style="width:100%; justify-content:center; padding:12px; font-weight:700;">Convert USD ${order.value.toLocaleString()} to INR now &rarr;</button>
            </div>
          `;
        } else {
          const yieldRupees = Math.round(order.value * 83.42);
          actionWidget = `
            <div style="text-align:center; padding:16px; border:1px solid var(--success-border); background-color:var(--success-bg); border-radius:8px;">
              <span style="font-size:32px; display:block; margin-bottom:8px;">✓</span>
              <h4 style="font-size:15px; font-weight:800; color:var(--success); margin:0 0 4px 0;">₹${yieldRupees.toLocaleString()}.00 Credited</h4>
              <p class="text-muted" style="font-size:11px; margin-bottom:16px;">Settlement funds sent to State Bank of India account ending ...0542</p>
              <button class="btn btn-success btn-sm" onclick="app.switchSubTab('close')" style="width:100%; justify-content:center;">Proceed to Customs Reconciliation</button>
            </div>
          `;
        }

        contentHtml = `
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px;">
            <div style="border: 1px solid var(--border-color); border-radius:12px; padding:20px; background:#fff;">
              <h4 style="font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:16px; text-transform:uppercase;">Advance Remittance Details</h4>
              <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><span class="text-muted">Payment Protocol</span><span class="text-bold">SWIFT MT103</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><span class="text-muted">Sender Bank</span><span class="text-bold">Deutsche Bank AG</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><span class="text-muted">Received Date</span><span class="text-bold">24 May 2026</span></div>
                <div style="display:flex; justify-content:space-between; padding-bottom:4px;"><span class="text-muted">Compliance Status</span><span class="status-badge green" style="font-size:9px; padding:2px 8px;">Cleared</span></div>
              </div>
            </div>

            <div>
              <div class="panel-card blue" style="padding:24px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); background:var(--primary-light-bg); margin-bottom:0;">
                <span class="text-muted" style="font-size:10px; text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Released USD Balance</span>
                <h3 style="font-size:32px; font-family:'Outfit'; font-weight:900; color:var(--primary); margin:8px 0;">$${order.value.toLocaleString()}.00</h3>
                <span class="status-badge green" style="font-size:10px;">Payment Cleared ✓</span>
              </div>
            </div>
          </div>

          <div style="margin-top:24px; border-top:1px solid var(--border-color); padding-top:20px;">
            ${actionWidget}
          </div>
        `;
      }

      container.innerHTML = `
        <div class="panel-card" style="padding:24px;">
          <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Advance Remittance Settlement</h3>
          ${contentHtml}
        </div>
      `;
    }

    // Flow C (Open Account) Specific Payment flow
    if (order.flowType === 'open') {
      let contentHtml = '';
      if (!order.openPaymentReceived) {
        contentHtml = `
          <div style="text-align:center; padding:40px 20px;">
            <span style="font-size:48px; display:block; margin-bottom:16px;">🕒</span>
            <h4 style="font-size:16px; font-weight:800; margin-bottom:8px;">Awaiting Open Account Net Remittance</h4>
            <p class="text-muted" style="font-size:12px; max-width:400px; margin:0 auto 20px auto;">Payment term is net 60 days post vessel delivery. Remittance of USD 9,800.00 is due from Sunrise Imports in 45 days. You can simulate buyer wire release on the Setup & Status tab.</p>
          </div>
        `;
      } else {
        let actionWidget = '';
        if (!order.fxConverted) {
          const yieldRupees = Math.round(order.value * 83.42);
          actionWidget = `
            <div>
              <h4 style="font-size:14px; font-weight:800; margin-bottom:12px;">Lock Currency Exchange Rate</h4>
              <div style="background:var(--primary-light-bg); border-radius:8px; padding:16px; margin-bottom:16px; border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Live exchange rate:</span><span class="text-bold" style="color:var(--primary);">1 USD = ₹83.42</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="text-muted">Rupee Yield Credits:</span><span class="text-bold" style="font-size:14px;">₹${yieldRupees.toLocaleString()}</span></div>
                <div style="display:flex; justify-content:space-between;"><span class="text-muted">TradePe savings vs banks:</span><span class="text-bold" style="color:var(--success);">₹${Math.round(order.value * 1.32).toLocaleString()}</span></div>
              </div>
              <button class="btn btn-primary" onclick="app.executeFXConversion()" style="width:100%; justify-content:center; padding:12px; font-weight:700;">Convert USD ${order.value.toLocaleString()} to INR now &rarr;</button>
            </div>
          `;
        } else {
          const yieldRupees = Math.round(order.value * 83.42);
          actionWidget = `
            <div style="text-align:center; padding:16px; border:1px solid var(--success-border); background-color:var(--success-bg); border-radius:8px;">
              <span style="font-size:32px; display:block; margin-bottom:8px;">✓</span>
              <h4 style="font-size:15px; font-weight:800; color:var(--success); margin:0 0 4px 0;">₹${yieldRupees.toLocaleString()}.00 Credited</h4>
              <p class="text-muted" style="font-size:11px; margin-bottom:16px;">Rupee settlement sent to State Bank of India account ending ...0542</p>
              <button class="btn btn-success btn-sm" onclick="app.switchSubTab('close')" style="width:100%; justify-content:center;">Proceed to Customs Reconciliation</button>
            </div>
          `;
        }

        contentHtml = `
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px;">
            <div style="border: 1px solid var(--border-color); border-radius:12px; padding:20px; background:#fff;">
              <h4 style="font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:16px; text-transform:uppercase;">Net 60 Days Remittance Details</h4>
              <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><span class="text-muted">Payment Mode</span><span class="text-bold">Inbound Wire Transfer</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><span class="text-muted">Sender Bank</span><span class="text-bold">Mashreq Bank PSC</span></div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><span class="text-muted">Settlement Date</span><span class="text-bold">24 May 2026</span></div>
                <div style="display:flex; justify-content:space-between; padding-bottom:4px;"><span class="text-muted">Compliance Status</span><span class="status-badge green" style="font-size:9px; padding:2px 8px;">Approved</span></div>
              </div>
            </div>

            <div>
              <div class="panel-card blue" style="padding:24px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; border:1px solid hsl(var(--primary-hue), var(--primary-sat), 88%); background:var(--primary-light-bg); margin-bottom:0;">
                <span class="text-muted" style="font-size:10px; text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">Released USD Balance</span>
                <h3 style="font-size:32px; font-family:'Outfit'; font-weight:900; color:var(--primary); margin:8px 0;">$${order.value.toLocaleString()}.00</h3>
                <span class="status-badge green" style="font-size:10px;">Payment Cleared ✓</span>
              </div>
            </div>
          </div>

          <div style="margin-top:24px; border-top:1px solid var(--border-color); padding-top:20px;">
            ${actionWidget}
          </div>
        `;
      }

      container.innerHTML = `
        <div class="panel-card" style="padding:24px;">
          <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Net Account Remittance Settlement</h3>
          ${contentHtml}
        </div>
      `;
    }
  }

  executeLCAudit() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;
    
    order.bankAuditStatus = 'running';
    this.switchSubTab('payment');
    
    setTimeout(() => {
      order.bankAuditStatus = 'complete';
      order.logs.push({ text: 'SBI Document Audit successfully cleared. No discrepancies found.', time: 'Just now' });
      this.showToast('SBI document compliance match verified! JPMorgan Chase released $24,500.00.');
      this.switchSubTab('payment');
    }, 2000);
  }

  executeFXConversion() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;

    order.fxConverted = true;
    order.currentStage = 'close';
    order.statusText = 'Awaiting Reconciliation';
    order.logs.push({ text: `USD converted to Rupee credits at exchange rate 83.42.`, time: 'Just now' });
    
    this.showToast('FX manual conversion rate locked successfully!');
    this.triggerConfetti();
    this.updateWorkspaceBannerStatus();
    this.switchSubTab('payment');
  }

  // ==================== RENDERING CLOSE VIEW ====================

  renderCloseSubpanel(order) {
    const container = document.getElementById('close-flow-container');
    container.innerHTML = '';

    const yieldRupees = Math.round(order.value * 83.42);
    
    let btnDisabled = !order.fxConverted;
    let alertBanner = '';
    
    if (!order.fxConverted) {
      alertBanner = `
        <div class="what-next-card" style="margin-bottom:20px;">
          <div class="what-next-title">⚠️ Payment Setup Pending</div>
          <div class="what-next-text">You must first execute the USD currency conversion on the "FX & Settlement" tab to release remittance credits before reconciling customs logs.</div>
        </div>
      `;
    } else {
      alertBanner = `
        <div class="alert-banner success" style="border-radius:12px; margin-bottom:24px;">
          <div class="alert-message-container">
            <span class="alert-title">Rupee balance verified against Customs Shipping Bill!</span>
            <span class="alert-desc">0 compliance discrepancies detected. RBI IDPMS ledger is fully prepared for archiving.</span>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="panel-card" style="padding:24px;">
        <h3 style="font-size:18px; font-weight:800; margin-bottom:16px;">Customs AD Code Reconciliation</h3>
        
        ${alertBanner}

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:24px;">
          <!-- Compliance status checklist -->
          <div style="border: 1px solid var(--border-color); border-radius:12px; padding:20px; background:#fff;">
            <h4 style="font-size:12px; font-weight:800; color:var(--text-muted); margin-bottom:16px; text-transform:uppercase;">RBI IDPMS Reconciliation Checklist</h4>
            <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <span style="color:var(--text-muted);">AD Code Registration</span>
                <span style="font-weight:700; color:var(--success);">SBI Noida registered ✓</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <span style="color:var(--text-muted);">Inward Remittance Message (IRM)</span>
                <span style="font-weight:700; color: ${order.fxConverted ? 'var(--success)' : 'var(--orange)'};">${order.fxConverted ? 'Cleared' : 'Awaiting Conversion'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
                <span style="color:var(--text-muted);">Shipping Bill customs match</span>
                <span style="font-weight:700; color: ${order.documents.bl ? 'var(--success)' : 'var(--orange)'};">${order.documents.bl ? 'Clean ✓' : 'Awaiting BL'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; padding-bottom:4px;">
                <span style="color:var(--text-muted);">RBI IDPMS Ledger Status</span>
                <span style="font-weight:700; color: ${order.fxConverted && order.documents.bl ? 'var(--success)' : 'var(--orange)'};">${order.fxConverted && order.documents.bl ? 'Fully Reconciled ✓' : 'Pending Verification'}</span>
              </div>
            </div>
          </div>

          <!-- Summary values -->
          <div style="border: 1px solid var(--border-color); border-radius:12px; padding:20px; background:hsl(var(--primary-hue), 90%, 98.5%); border-color: hsl(var(--primary-hue), 90%, 93%);">
            <h4 style="font-size:12px; font-weight:800; color:var(--primary); margin-bottom:12px; text-transform:uppercase;">Remittance Ledger Summary</h4>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--text-main);">
              <div style="display:flex; justify-content:space-between;"><span class="text-muted">Total USD Cleared:</span><strong>$${order.value.toLocaleString()}.00 USD</strong></div>
              <div style="display:flex; justify-content:space-between;"><span class="text-muted">INR Conversion Yield:</span><strong>₹${yieldRupees.toLocaleString()} INR</strong></div>
              <div style="display:flex; justify-content:space-between;"><span class="text-muted">Exchange Rate Locked:</span><strong>₹83.42 / USD</strong></div>
              <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1;"><span class="text-muted">Buyer Reliability Score:</span><strong style="color:var(--success);">A+ Excellent</strong></div>
            </div>
          </div>
        </div>

        <button class="btn btn-success" onclick="app.settleAndArchiveOrder()" style="width:100%; justify-content:center; padding:12px; font-weight:700;" ${btnDisabled ? 'disabled' : ''}>Mark Order Settled & Archived ✓</button>
      </div>
    `;
  }

  settleAndArchiveOrder() {
    const order = this.state.orders.find(o => o.id === this.state.selectedOrderId);
    if (!order) return;

    order.settled = true;
    order.currentStage = 'closed';
    order.statusText = 'Completed';
    order.logs.push({ text: `Remittance closed and customs matching completed successfully. Archived.`, time: 'Just now' });

    this.showToast(`Order ${order.id} closed and compliance logs archived!`);
    this.triggerConfetti();
    
    setTimeout(() => {
      this.switchTab('orders');
    }, 1500);
  }

  // ==================== ONBOARDING PROCESS ====================

  changeOnboardingStep(section) {
    this.state.onboarding.currentSection = section;

    const screens = ['welcome', 'biz-details', 'biz-kyc', 'owner-kyc', 'remittance', 'addl-docs', 'vkyc'];
    screens.forEach(s => {
      const screenEl = document.getElementById(`onb-screen-${s}`);
      if (screenEl) {
        screenEl.classList.toggle('active', s === section);
      }
    });

    this.updateOnboardingTabs();
  }

  updateOnboardingTabs() {
    const sections = ['biz-details', 'biz-kyc', 'owner-kyc', 'remittance', 'addl-docs', 'vkyc'];
    const completed = this.state.onboarding.completedSections;
    const current = this.state.onboarding.currentSection;

    sections.forEach(sec => {
      const tabEl = document.getElementById(`onb-tab-${sec === 'addl-docs' ? 'docs' : sec === 'owner-kyc' ? 'owner' : sec === 'biz-details' ? 'details' : sec === 'biz-kyc' ? 'kyc' : sec}`);
      const badgeEl = document.getElementById(`onb-badge-${sec === 'addl-docs' ? 'docs' : sec === 'owner-kyc' ? 'owner' : sec === 'biz-details' ? 'details' : sec === 'biz-kyc' ? 'kyc' : sec}`);

      if (tabEl && badgeEl) {
        tabEl.className = 'onboarding-step-tab';
        badgeEl.className = 'onboarding-step-tab-badge';

        if (completed.includes(sec)) {
          tabEl.classList.add('completed');
          badgeEl.classList.add('completed');
          badgeEl.innerText = 'Completed';
        } else if (current === sec) {
          tabEl.classList.add('active');
          badgeEl.classList.add('active');
          badgeEl.innerText = 'Active';
        } else {
          tabEl.classList.add('disabled');
          badgeEl.classList.add('pending');
          badgeEl.innerText = 'Pending';
        }
      }
    });
  }

  submitStepBizDetails() {
    const name = document.getElementById('onb-biz-name').value.trim();
    if (!name) {
      document.getElementById('onb-err-biz-name').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-biz-name').style.display = 'none';
    this.state.onboarding.completedSections.push('biz-details');
    this.changeOnboardingStep('biz-kyc');
  }

  submitStepBizKyc() {
    const pan = document.getElementById('onb-biz-pan').value.trim();
    const iec = document.getElementById('onb-biz-iec').value.trim();
    if (pan.length !== 10) {
      document.getElementById('onb-err-biz-pan').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-biz-pan').style.display = 'none';
    if (iec.length !== 10) {
      document.getElementById('onb-err-biz-iec').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-biz-iec').style.display = 'none';

    this.state.onboarding.completedSections.push('biz-kyc');
    this.changeOnboardingStep('owner-kyc');
  }

  submitStepOwnerKyc() {
    const name = document.getElementById('onb-owner-name').value.trim();
    if (!name) {
      document.getElementById('onb-err-owner-name').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-owner-name').style.display = 'none';

    this.state.onboarding.completedSections.push('owner-kyc');
    this.changeOnboardingStep('remittance');
  }

  submitStepRemittance() {
    const adcode = document.getElementById('onb-bank-adcode').value.trim();
    if (adcode.length !== 14) {
      document.getElementById('onb-err-bank-adcode').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-bank-adcode').style.display = 'none';

    this.state.onboarding.completedSections.push('remittance');
    this.changeOnboardingStep('addl-docs');
  }

  triggerOnbUpload(type) {
    this.state.onboarding.uploadType = type;
    document.getElementById('onb-file-input').click();
  }

  handleOnbFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
      const filename = files[0].name;
      const type = this.state.onboarding.uploadType;
      
      const modal = document.getElementById('upload-dialog');
      const progressContainer = document.getElementById('upload-progress-container');
      const progressBar = document.getElementById('upload-progress-bar');
      const progressPct = document.getElementById('upload-pct');
      const filenameEl = document.getElementById('upload-filename');
      const titleEl = document.getElementById('upload-dialog-title');

      titleEl.innerText = (type === 'auth') ? 'Uploading Authorization Letter' : 'Uploading Office Address Proof';
      filenameEl.innerText = filename;
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      progressPct.innerText = '0%';
      modal.classList.add('active');

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = `${progress}%`;
        progressPct.innerText = `${progress}%`;

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            modal.classList.remove('active');
            
            if (type === 'auth') {
              this.state.onboarding.uploadedAuth = true;
              document.getElementById('onb-file-label-auth').innerHTML = `${filename} <span style="color:var(--success); font-weight:700;">Verified ✓</span>`;
            } else {
              this.state.onboarding.uploadedAddr = true;
              document.getElementById('onb-file-label-addr').innerHTML = `${filename} <span style="color:var(--success); font-weight:700;">Verified ✓</span>`;
            }

            this.showToast('Document uploaded successfully.');
            event.target.value = '';
          }, 300);
        }
      }, 60);
    }
  }

  submitStepAddlDocs() {
    if (!this.state.onboarding.uploadedAuth) {
      document.getElementById('onb-err-doc-auth').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-doc-auth').style.display = 'none';

    if (!this.state.onboarding.uploadedAddr) {
      document.getElementById('onb-err-doc-addr').style.display = 'block';
      return;
    }
    document.getElementById('onb-err-doc-addr').style.display = 'none';

    this.state.onboarding.completedSections.push('addl-docs');
    this.changeOnboardingStep('vkyc');
  }

  startVideoKYCCall() {
    const callBtn = document.getElementById('vkyc-call-btn');
    callBtn.disabled = true;
    callBtn.innerText = 'Connecting to Officer...';

    const liveTag = document.getElementById('vkyc-live-tag');
    const agentCallPanel = document.getElementById('vkyc-agent-call-panel');
    const subtitles = document.getElementById('vkyc-agent-subtitles');

    setTimeout(() => {
      if (liveTag) {
        liveTag.className = 'vkyc-live-indicator';
        liveTag.querySelector('span:last-child').innerText = 'LIVE';
      }
      if (agentCallPanel) {
        agentCallPanel.style.display = 'flex';
      }

      const dialogues = [
        { text: "Hello Ankita, I am Rajesh from TradePe. Let's verify your identity.", delay: 0 },
        { text: "Please show your physical PAN card to the camera.", delay: 3000 },
        { text: "Scanning card details... matches records successfully.", delay: 6000 },
        { text: "Thank you. Aadhaar check is also cleared. We are done.", delay: 9000 }
      ];

      dialogues.forEach(dial => {
        setTimeout(() => {
          if (subtitles) subtitles.innerText = dial.text;
        }, dial.delay);
      });

      setTimeout(() => {
        if (liveTag) {
          liveTag.className = 'vkyc-live-indicator inactive';
        }
        if (agentCallPanel) {
          agentCallPanel.style.display = 'none';
        }
        
        callBtn.style.display = 'none';
        document.getElementById('vkyc-submit-btn').style.display = 'flex';
        this.showToast('vKYC verification successful!');
      }, 12000);

    }, 1500);
  }

  completeOnboarding() {
    this.state.onboardingCompleted = true;
    this.showToast('Business Onboarding successfully completed!');
    this.triggerConfetti();
    
    setTimeout(() => {
      this.switchTab('home');
    }, 1500);
  }

  // ==================== TOAST SYSTEM ====================
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063 1.06l-.041.02a.75.75 0 11-1.063-1.06zm0 0h.008v.008h-.008v-.008zm0-6.75h.008v.008h-.008V4.5z" />
      </svg>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==================== CONFETTI CELEBRATIONS ====================
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      'hsl(228, 91%, 43%)',
      'hsl(28, 90%, 52%)',
      'hsl(162, 84%, 31%)',
      'hsl(200, 90%, 60%)',
      'hsl(350, 90%, 60%)'
    ];

    const particles = [];
    const particleCount = 120;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 22 - 8,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1
      });
    }

    let animationFrameId;
    const gravity = 0.45;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height) {
          alive = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        canvas.style.display = 'none';
        cancelAnimationFrame(animationFrameId);
      }
    };

    render();
  }
}

// Instantiate
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TradePeApp();
});
