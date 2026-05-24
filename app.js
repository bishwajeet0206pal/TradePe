/**
 * TradePe Export Command Center MVP
 * Core Interactive Application Logic - Dashboard Entry & Stepper integration
 */

class TradePeApp {
  constructor() {
    this.state = {
      viewMode: 'dashboard', // 'dashboard' or 'stepper'
      isNewUser: null,
      onboardingCompleted: false,
      currentStep: 0, // 0 to 7
      
      onboarding: {
        currentSection: 'biz-details', // biz-details, biz-kyc, owner-kyc, remittance, addl-docs, vkyc
        completedSections: [],
        uploadedAuth: false,
        uploadedAddr: false
      },
      
      selectedPaymentTerm: 'lc', // Default to LC
      lcChecks: {
        check1: false,
        check2: false,
        check3: false,
        check4: false
      },
      
      documents: {
        invoice: false,
        packing: false,
        origin: false,
        bl: false
      },
      
      bankAuditStatus: 'idle', // 'idle', 'running', 'complete'
      fxConverted: false,
      orderCompleted: false
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
    // Start on the main Home Dashboard
    this.showDashboard();
  }

  bindEvents() {
    // Escape key closes upload modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeUploadModal();
      }
    });

    // Close modal when clicking outside
    const modal = document.getElementById('upload-dialog');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeUploadModal();
        }
      });
    }
  }

  // Switch to main dashboard view
  showDashboard() {
    this.state.viewMode = 'dashboard';
    
    // Hide access gate overlay just in case
    const gateOverlay = document.getElementById('app-access-gate');
    if (gateOverlay) {
      gateOverlay.style.display = 'none';
    }

    // Deactivate all panels
    document.querySelectorAll('.view-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show main dashboard panel
    const dashPanel = document.getElementById('panel-dashboard');
    if (dashPanel) {
      dashPanel.classList.add('active');
    }

    // Toggle sidebar navigation containers
    const mainSidebarNav = document.getElementById('main-sidebar-nav');
    const stepperSidebarNav = document.getElementById('stepper-sidebar-nav');
    if (mainSidebarNav) mainSidebarNav.style.display = 'flex';
    if (stepperSidebarNav) stepperSidebarNav.style.display = 'none';

    // Hide back button in header
    const backBtn = document.getElementById('btn-back-to-dashboard');
    if (backBtn) backBtn.style.display = 'none';

    // Update header title & subtitle
    const titleEl = document.getElementById('page-header-title');
    const subEl = document.getElementById('page-header-subtitle');
    if (titleEl) titleEl.innerText = 'Good morning, Ankita 👋';
    if (subEl) subEl.innerText = 'Here is what needs your attention today';

    // Reset navigation item highlights
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const homeNavItem = document.getElementById('nav-item-home');
    if (homeNavItem) homeNavItem.classList.add('active');

    this.updateUI();
  }

  // Enter stepper mode and load specific active order
  loadOrderWizard(orderId) {
    if (orderId === 'TRP-123') {
      this.showToast('Opening Order TRP-123 Lifecycle Wizard...');
      this.state.viewMode = 'stepper';
      this.state.isNewUser = false; // Existing user context for TRP-123
      this.state.onboardingCompleted = true;

      // Toggle sidebar navigation containers
      const mainSidebarNav = document.getElementById('main-sidebar-nav');
      const stepperSidebarNav = document.getElementById('stepper-sidebar-nav');
      if (mainSidebarNav) mainSidebarNav.style.display = 'none';
      if (stepperSidebarNav) stepperSidebarNav.style.display = 'flex';

      // Show exit button in header
      const backBtn = document.getElementById('btn-back-to-dashboard');
      if (backBtn) backBtn.style.display = 'inline-flex';

      // Load straight into Step 3: Documents upload stage
      this.goToStep(3);
    } else {
      this.showToast(`Loading Order ${orderId}...`);
    }
  }

  // Click handler for FAB "+ Start new order"
  startNewOrderFlow() {
    // Show configuration gate overlay
    const gateOverlay = document.getElementById('app-access-gate');
    if (gateOverlay) {
      gateOverlay.style.display = 'flex';
    }
  }

  // Gate selection options
  selectUserMode(mode) {
    this.state.isNewUser = (mode === 'new');
    this.state.viewMode = 'stepper';
    
    // Hide access gate overlay
    const gateOverlay = document.getElementById('app-access-gate');
    if (gateOverlay) {
      gateOverlay.style.display = 'none';
    }

    // Toggle sidebar navigation containers
    const mainSidebarNav = document.getElementById('main-sidebar-nav');
    const stepperSidebarNav = document.getElementById('stepper-sidebar-nav');
    if (mainSidebarNav) mainSidebarNav.style.display = 'none';
    if (stepperSidebarNav) stepperSidebarNav.style.display = 'flex';

    // Show exit button in header
    const backBtn = document.getElementById('btn-back-to-dashboard');
    if (backBtn) backBtn.style.display = 'inline-flex';
    
    if (this.state.isNewUser) {
      this.state.onboardingCompleted = false;
      this.clearProfileDetails();
      this.goToStep(0);
      this.changeOnboardingStep('biz-details');
    } else {
      this.state.onboardingCompleted = true;
      this.loadMockProfileDetails();
      this.goToStep(1);
    }
  }

  // Update Reactive UI elements based on state changes
  updateUI() {
    const isNew = this.state.isNewUser;
    
    // If we are in stepper mode, show/hide sidebar stepper items
    if (this.state.viewMode === 'stepper') {
      const step0 = document.getElementById('sidebar-step-0');
      if (step0) {
        step0.style.display = (isNew === true) ? 'flex' : 'none';
      }

      const otherStepsHidden = (isNew === true && !this.state.onboardingCompleted);
      for (let i = 1; i <= 7; i++) {
        const stepItem = document.getElementById(`sidebar-step-${i}`);
        if (stepItem) {
          stepItem.style.display = otherStepsHidden ? 'none' : 'flex';
        }
      }

      // Update active/completed/locked classes for stepper items
      if (isNew !== null) {
        if (isNew === true) {
          const step0Item = document.getElementById('sidebar-step-0');
          if (step0Item) {
            step0Item.className = 'step-item';
            if (this.state.onboardingCompleted) {
              step0Item.classList.add('completed');
            } else if (this.state.currentStep === 0) {
              step0Item.classList.add('active');
            } else {
              step0Item.classList.add('locked');
            }
          }
        }

        for (let i = 1; i <= 7; i++) {
          const stepItem = document.getElementById(`sidebar-step-${i}`);
          if (stepItem) {
            stepItem.className = 'step-item';
            if (otherStepsHidden) {
              stepItem.style.display = 'none';
            } else {
              if (this.state.currentStep > i) {
                stepItem.classList.add('completed');
              } else if (this.state.currentStep === i) {
                stepItem.classList.add('active');
              } else {
                stepItem.classList.add('locked');
              }
            }
          }
        }
      }
    }

    // Reactively update dashboard elements based on TRP-123 completion status
    if (this.state.orderCompleted) {
      // Hide TRP-123 from Needs Attention table
      const dashRow123 = document.getElementById('dash-row-123');
      if (dashRow123) dashRow123.style.display = 'none';

      // Update stats cards
      const statAttention = document.getElementById('stat-attention-val');
      if (statAttention) statAttention.innerText = '1'; // TRP-124 remains

      const statCompleted = document.getElementById('stat-completed-val');
      if (statCompleted) statCompleted.innerText = '6'; // 5 + 1 Completed

      // Update in All Active Orders table
      const dashAllBadge = document.getElementById('dash-all-badge-123');
      if (dashAllBadge) {
        dashAllBadge.innerText = 'Completed';
        dashAllBadge.className = 'status-badge green';
      }
      const dashTime = document.getElementById('dash-time-123');
      if (dashTime) dashTime.innerText = 'Settled just now';
    }
  }

  // Router for Stepper Panels
  goToStep(stepNumber) {
    this.state.currentStep = stepNumber;
    
    // Deactivate all panels
    document.querySelectorAll('.view-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Activate target panel
    const targetPanelId = (stepNumber === 'complete') ? 'panel-step-complete' : `panel-step-${stepNumber}`;
    const activeScreen = document.getElementById(targetPanelId);
    if (activeScreen) {
      activeScreen.classList.add('active');
    }

    // Update Header Text & Subtitle
    this.updateHeader(stepNumber);
    this.updateUI();

    // Scroll main content to top
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
      mainContent.focus();
    }
  }

  updateHeader(step) {
    const titleEl = document.getElementById('page-header-title');
    const subEl = document.getElementById('page-header-subtitle');
    if (!titleEl || !subEl) return;

    if (step === 0) {
      titleEl.innerText = 'Business Onboarding';
      subEl.innerText = 'Complete KYC details, verify identity, and configure bank remittance accounts';
    } else if (step === 1) {
      titleEl.innerText = 'Agreement Terms · Order #TRP-123';
      subEl.innerText = 'Review and select the payment security term for your $24,500 contract with ABC Textiles';
    } else if (step === 2) {
      titleEl.innerText = 'Audit Bank Letter of Credit (LC)';
      subEl.innerText = 'Verify JPMorgan Chase LC terms match your contract exactly to prevent discrepancy blocks';
    } else if (step === 3) {
      titleEl.innerText = 'Upload Settlement Documents';
      subEl.innerText = 'Upload commercial invoice, packing list, and certificate of origin matching LC specs';
    } else if (step === 4) {
      titleEl.innerText = 'Shipment Dispatched & Cargo Transit';
      subEl.innerText = 'Cargo has departed Mumbai Port. Upload Carrier Bill of Lading (BL) to present to the bank';
    } else if (step === 5) {
      titleEl.innerText = 'Document Drawer Banking Audit';
      subEl.innerText = 'SBI is auditing submitted document matches against JPMorgan Chase LC terms';
    } else if (step === 6) {
      titleEl.innerText = 'Foreign Exchange Conversion';
      subEl.innerText = 'Released USD is held in your secure wallet. Convert manually to Rupees whenever the rate is optimal';
    } else if (step === 7) {
      titleEl.innerText = 'Reconcile & Close Order';
      subEl.innerText = 'Match SBI Rupee credit against custom shipping bill records for RBI compliance logs';
    } else if (step === 'complete') {
      titleEl.innerText = 'Trade Finance Lifecycle Completed!';
      subEl.innerText = 'SBI rupee settlement reconciled and RBI IDPMS logs updated successfully';
    }
  }

  // Clear profile fields for new user onboarding
  clearProfileDetails() {
    document.querySelectorAll('.onboarding-error-msg').forEach(el => {
      el.classList.remove('active');
      el.style.display = 'none';
    });
    document.querySelectorAll('.onboarding-input').forEach(el => {
      el.classList.remove('error');
    });
  }

  // Load verified details for existing user
  loadMockProfileDetails() {
    this.showToast('Existing Exporter loaded. Onboarding credentials verified.');
  }

  // Onboarding Step Navigation
  changeOnboardingStep(section) {
    if (section === 'biz-details-form') {
      section = 'biz-details';
    }
    this.state.onboarding.currentSection = section;

    // Toggle active screens in onboarding content
    const screens = [
      'welcome', 'biz-details', 'biz-kyc', 'owner-kyc', 'remittance', 'addl-docs', 'vkyc'
    ];
    screens.forEach(s => {
      const el = document.getElementById(`onb-screen-${s}`);
      if (el) {
        el.classList.toggle('active', s === section);
      }
    });

    // Update onboarding tab states in sidebar
    this.updateOnboardingTabs();
  }

  updateOnboardingTabs() {
    const sectionsMap = {
      'biz-details': { tab: 'onb-tab-details', badge: 'onb-badge-details', key: 'biz-details' },
      'biz-kyc': { tab: 'onb-tab-kyc', badge: 'onb-badge-kyc', key: 'biz-kyc' },
      'owner-kyc': { tab: 'onb-tab-owner', badge: 'onb-badge-owner', key: 'owner-kyc' },
      'remittance': { tab: 'onb-tab-remittance', badge: 'onb-badge-remittance', key: 'remittance' },
      'addl-docs': { tab: 'onb-tab-docs', badge: 'onb-badge-docs', key: 'addl-docs' },
      'vkyc': { tab: 'onb-tab-vkyc', badge: 'onb-badge-vkyc', key: 'vkyc' }
    };

    const completed = this.state.onboarding.completedSections;
    const current = this.state.onboarding.currentSection;

    Object.keys(sectionsMap).forEach(key => {
      const config = sectionsMap[key];
      const tabEl = document.getElementById(config.tab);
      const badgeEl = document.getElementById(config.badge);
      
      if (!tabEl || !badgeEl) return;

      tabEl.className = 'onboarding-step-tab';
      badgeEl.className = 'onboarding-step-tab-badge';

      if (completed.includes(key)) {
        tabEl.classList.add('completed');
        badgeEl.classList.add('completed');
        badgeEl.innerText = 'Completed';
      } else if (current === key) {
        tabEl.classList.add('active');
        badgeEl.classList.add('active');
        badgeEl.innerText = 'Active';
      } else {
        // Disabled if previous sections are not completed
        const keysList = Object.keys(sectionsMap);
        const currentIndex = keysList.indexOf(current);
        const thisIndex = keysList.indexOf(key);

        if (thisIndex > currentIndex && !completed.includes(keysList[thisIndex - 1])) {
          tabEl.classList.add('disabled');
          badgeEl.classList.add('pending');
          badgeEl.innerText = 'Pending';
        } else {
          badgeEl.classList.add('pending');
          badgeEl.innerText = 'Pending';
        }
      }
    });
  }

  // Step 0 forms validation & submit
  submitStepBizDetails() {
    const nameEl = document.getElementById('onb-biz-name');
    const dateEl = document.getElementById('onb-biz-incdate');
    const addrEl = document.getElementById('onb-biz-address');

    let valid = true;

    if (!nameEl.value.trim()) {
      nameEl.classList.add('error');
      document.getElementById('onb-err-biz-name').style.display = 'block';
      valid = false;
    } else {
      nameEl.classList.remove('error');
      document.getElementById('onb-err-biz-name').style.display = 'none';
    }

    if (!dateEl.value) {
      dateEl.classList.add('error');
      document.getElementById('onb-err-biz-incdate').style.display = 'block';
      valid = false;
    } else {
      dateEl.classList.remove('error');
      document.getElementById('onb-err-biz-incdate').style.display = 'none';
    }

    if (!addrEl.value.trim()) {
      addrEl.classList.add('error');
      document.getElementById('onb-err-biz-address').style.display = 'block';
      valid = false;
    } else {
      addrEl.classList.remove('error');
      document.getElementById('onb-err-biz-address').style.display = 'none';
    }

    if (valid) {
      if (!this.state.onboarding.completedSections.includes('biz-details')) {
        this.state.onboarding.completedSections.push('biz-details');
      }
      this.showToast('Business details saved.');
      this.changeOnboardingStep('biz-kyc');
    }
  }

  submitStepBizKyc() {
    const panEl = document.getElementById('onb-biz-pan');
    const iecEl = document.getElementById('onb-biz-iec');

    let valid = true;

    if (panEl.value.trim().length !== 10) {
      panEl.classList.add('error');
      document.getElementById('onb-err-biz-pan').style.display = 'block';
      valid = false;
    } else {
      panEl.classList.remove('error');
      document.getElementById('onb-err-biz-pan').style.display = 'none';
    }

    if (iecEl.value.trim().length !== 10) {
      iecEl.classList.add('error');
      document.getElementById('onb-err-biz-iec').style.display = 'block';
      valid = false;
    } else {
      iecEl.classList.remove('error');
      document.getElementById('onb-err-biz-iec').style.display = 'none';
    }

    if (valid) {
      if (!this.state.onboarding.completedSections.includes('biz-kyc')) {
        this.state.onboarding.completedSections.push('biz-kyc');
      }
      this.showToast('KYC Codes validated.');
      this.changeOnboardingStep('owner-kyc');
    }
  }

  submitStepOwnerKyc() {
    const nameEl = document.getElementById('onb-owner-name');
    const panEl = document.getElementById('onb-owner-pan');
    const aadhaarEl = document.getElementById('onb-owner-aadhaar');

    let valid = true;

    if (!nameEl.value.trim()) {
      nameEl.classList.add('error');
      document.getElementById('onb-err-owner-name').style.display = 'block';
      valid = false;
    } else {
      nameEl.classList.remove('error');
      document.getElementById('onb-err-owner-name').style.display = 'none';
    }

    if (panEl.value.trim().length !== 10) {
      panEl.classList.add('error');
      document.getElementById('onb-err-owner-pan').style.display = 'block';
      valid = false;
    } else {
      panEl.classList.remove('error');
      document.getElementById('onb-err-owner-pan').style.display = 'none';
    }

    const clearAadhaar = aadhaarEl.value.replace(/\s/g, '');
    if (clearAadhaar.length !== 12) {
      aadhaarEl.classList.add('error');
      document.getElementById('onb-err-owner-aadhaar').style.display = 'block';
      valid = false;
    } else {
      aadhaarEl.classList.remove('error');
      document.getElementById('onb-err-owner-aadhaar').style.display = 'none';
    }

    if (valid) {
      if (!this.state.onboarding.completedSections.includes('owner-kyc')) {
        this.state.onboarding.completedSections.push('owner-kyc');
      }
      this.showToast('Owner identity verified.');
      this.changeOnboardingStep('remittance');
    }
  }

  submitStepRemittance() {
    const bankEl = document.getElementById('onb-bank-name');
    const accEl = document.getElementById('onb-bank-acc');
    const ifscEl = document.getElementById('onb-bank-ifsc');
    const adEl = document.getElementById('onb-bank-adcode');

    let valid = true;

    if (!bankEl.value.trim()) {
      bankEl.classList.add('error');
      document.getElementById('onb-err-bank-name').style.display = 'block';
      valid = false;
    } else {
      bankEl.classList.remove('error');
      document.getElementById('onb-err-bank-name').style.display = 'none';
    }

    if (!accEl.value.trim()) {
      accEl.classList.add('error');
      document.getElementById('onb-err-bank-acc').style.display = 'block';
      valid = false;
    } else {
      accEl.classList.remove('error');
      document.getElementById('onb-err-bank-acc').style.display = 'none';
    }

    if (ifscEl.value.trim().length !== 11) {
      ifscEl.classList.add('error');
      document.getElementById('onb-err-bank-ifsc').style.display = 'block';
      valid = false;
    } else {
      ifscEl.classList.remove('error');
      document.getElementById('onb-err-bank-ifsc').style.display = 'none';
    }

    if (adEl.value.trim().length !== 14) {
      adEl.classList.add('error');
      document.getElementById('onb-err-bank-adcode').style.display = 'block';
      valid = false;
    } else {
      adEl.classList.remove('error');
      document.getElementById('onb-err-bank-adcode').style.display = 'none';
    }

    if (valid) {
      if (!this.state.onboarding.completedSections.includes('remittance')) {
        this.state.onboarding.completedSections.push('remittance');
      }
      this.showToast('Settlement bank linked.');
      this.changeOnboardingStep('addl-docs');
    }
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
        progress += 5;
        progressBar.style.width = `${progress}%`;
        progressPct.innerText = `${progress}%`;

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            modal.classList.remove('active');
            
            if (type === 'auth') {
              this.state.onboarding.uploadedAuth = true;
              document.getElementById('onb-file-label-auth').innerHTML = `${filename} <span style="color:var(--success); font-weight:700;">Verified ✓</span>`;
              document.getElementById('onb-err-doc-auth').style.display = 'none';
            } else {
              this.state.onboarding.uploadedAddr = true;
              document.getElementById('onb-file-label-addr').innerHTML = `${filename} <span style="color:var(--success); font-weight:700;">Verified ✓</span>`;
              document.getElementById('onb-err-doc-addr').style.display = 'none';
            }

            this.showToast('Document uploaded successfully.');
            event.target.value = '';
          }, 300);
        }
      }, 50);
    }
  }

  submitStepAddlDocs() {
    let valid = true;
    if (!this.state.onboarding.uploadedAuth) {
      document.getElementById('onb-err-doc-auth').style.display = 'block';
      valid = false;
    }
    if (!this.state.onboarding.uploadedAddr) {
      document.getElementById('onb-err-doc-addr').style.display = 'block';
      valid = false;
    }

    if (valid) {
      if (!this.state.onboarding.completedSections.includes('addl-docs')) {
        this.state.onboarding.completedSections.push('addl-docs');
      }
      this.showToast('Authorization documents verified.');
      this.changeOnboardingStep('vkyc');
    }
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
        { text: "Hello Ankita, I am Rajesh from TradePe. Let's complete your Video KYC verification.", delay: 0 },
        { text: "Please hold your personal PAN card in front of the camera so we can scan it.", delay: 3500 },
        { text: "Perfect. Scanning PAN card details... Verified successfully.", delay: 7000 },
        { text: "Now, please hold your Aadhaar card up.", delay: 10500 },
        { text: "Excellent. scanning Aadhaar... Verified successfully.", delay: 14000 },
        { text: "Thank you Ankita. Your KYC is verified. You can now complete onboarding.", delay: 17500 }
      ];

      dialogues.forEach(dial => {
        setTimeout(() => {
          if (subtitles) subtitles.innerText = dial.text;
        }, dial.delay);
      });

      setTimeout(() => {
        if (liveTag) {
          liveTag.className = 'vkyc-live-indicator inactive';
          liveTag.querySelector('span:last-child').innerText = 'STANDBY';
        }
        if (agentCallPanel) {
          agentCallPanel.style.display = 'none';
        }
        
        callBtn.style.display = 'none';
        const submitBtn = document.getElementById('vkyc-submit-btn');
        if (submitBtn) submitBtn.style.display = 'flex';
        
        this.showToast('vKYC verification successful!');
      }, 21000);

    }, 2000);
  }

  completeOnboarding() {
    if (!this.state.onboarding.completedSections.includes('vkyc')) {
      this.state.onboarding.completedSections.push('vkyc');
    }
    this.state.onboardingCompleted = true;
    this.showToast('Business Onboarding successful! Account is fully activated.');
    this.triggerConfetti();

    setTimeout(() => {
      this.goToStep(1);
    }, 1000);
  }

  // Step 1: Payment security term selection
  selectPaymentTerm(term) {
    this.state.selectedPaymentTerm = term;
    
    const cards = document.querySelectorAll('#panel-step-1 div[onclick]');
    cards.forEach(card => {
      const onclickAttr = card.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(term)) {
        card.style.borderColor = 'var(--primary)';
        card.style.backgroundColor = 'var(--primary-light-bg)';
      } else {
        card.style.borderColor = 'var(--border-color)';
        card.style.backgroundColor = '';
      }
    });
  }

  confirmPaymentTerm() {
    if (this.state.selectedPaymentTerm !== 'lc') {
      this.showToast('ABC Textiles (New Buyer) requires bank-backed security. Please select Letter of Credit (LC).');
      return;
    }
    
    this.showToast('LC Agreement confirmed. Moving to Letter of Credit verification.');
    this.goToStep(2);
  }

  // Step 2: Letter of Credit Verification
  checkLcItems() {
    const c1 = document.getElementById('lc-check-1').checked;
    const c2 = document.getElementById('lc-check-2').checked;
    const c3 = document.getElementById('lc-check-3').checked;
    const c4 = document.getElementById('lc-check-4').checked;

    const acceptBtn = document.getElementById('lc-accept-btn');
    if (acceptBtn) {
      acceptBtn.disabled = !(c1 && c2 && c3 && c4);
    }
  }

  acceptLcDraft() {
    this.showToast('Letter of Credit verified & accepted by exporter!');
    this.goToStep(3);
  }

  // Step 3: Document uploads
  uploadTradeDoc(type) {
    const modal = document.getElementById('upload-dialog');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressPct = document.getElementById('upload-pct');
    const filenameEl = document.getElementById('upload-filename');
    const titleEl = document.getElementById('upload-dialog-title');

    const docNames = {
      invoice: { name: 'Commercial Invoice', file: 'commercial_invoice.pdf' },
      packing: { name: 'Packing List', file: 'packing_list.pdf' },
      origin: { name: 'Certificate of Origin', file: 'certificate_of_origin.pdf' },
      bl: { name: 'Carrier Bill of Lading (BL)', file: 'bill_of_lading.pdf' }
    };

    const docInfo = docNames[type];
    titleEl.innerText = `Uploading ${docInfo.name}`;
    filenameEl.innerText = docInfo.file;
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
          this.state.documents[type] = true;
          this.updateDocumentCard(type);
          this.showToast(`${docInfo.name} uploaded and verified!`);
        }, 300);
      }
    }, 100);
  }

  updateDocumentCard(type) {
    if (type === 'bl') {
      const badge = document.getElementById('doc-badge-bl');
      const card = document.getElementById('doc-card-bl');
      const btn = document.getElementById('doc-upload-btn-bl');
      const banner = document.getElementById('bl-complete-banner');
      const continueBtn = document.getElementById('bl-continue-btn');

      if (badge) {
        badge.innerText = 'Uploaded ✓';
        badge.className = 'status-badge green';
      }
      if (card) {
        card.style.borderColor = 'var(--success-border)';
        card.style.backgroundColor = 'var(--success-bg)';
      }
      if (btn) {
        btn.innerText = 'Re-upload BL';
      }
      if (banner) {
        banner.style.display = 'block';
      }
      if (continueBtn) {
        continueBtn.disabled = false;
      }
    } else {
      const badgeId = `doc-badge-${type}`;
      const cardId = `doc-card-${type}`;
      const btnId = `doc-upload-btn-${type}`;

      const badge = document.getElementById(badgeId);
      const card = document.getElementById(cardId);
      const btn = document.getElementById(btnId);

      if (badge) {
        badge.innerText = 'Uploaded ✓';
        badge.className = 'status-badge green';
      }
      if (card) {
        card.style.borderColor = 'var(--success-border)';
        card.style.backgroundColor = 'var(--success-bg)';
      }
      if (btn) {
        btn.innerText = 'Re-upload';
      }

      const all3Done = this.state.documents.invoice && this.state.documents.packing && this.state.documents.origin;
      const banner = document.getElementById('docs-complete-banner');
      const continueBtn = document.getElementById('docs-continue-btn');

      if (all3Done) {
        if (banner) banner.style.display = 'block';
        if (continueBtn) continueBtn.disabled = false;
      }
    }
  }

  confirmDocUploads() {
    this.goToStep(4);
  }

  // Step 4: Dispatch Shipment & BL
  confirmShipmentBl() {
    this.goToStep(5);
  }

  // Step 5: Bank Audit simulation
  startBankAudit() {
    const auditBtn = document.getElementById('bank-audit-btn');
    if (auditBtn) {
      auditBtn.disabled = true;
      auditBtn.innerText = 'SBI Auditing documents against Chase Bank LC terms...';
    }

    const blStatus = document.getElementById('audit-status-bl');
    if (blStatus) {
      blStatus.innerText = 'AUDITING...';
      blStatus.style.color = 'var(--orange)';
    }

    setTimeout(() => {
      if (blStatus) {
        blStatus.innerText = 'MATCHED ✓';
        blStatus.style.color = 'var(--success)';
      }
      
      this.showToast('SBI document verification matches Irrevocable LC rules exactly!');

      const releasedAmtVal = document.getElementById('bank-released-amt');
      const releasedStatus = document.getElementById('bank-released-status');
      
      let count = 0;
      const incrementVal = 2450;
      const walletTimer = setInterval(() => {
        count += incrementVal;
        if (count >= 24500) {
          count = 24500;
          clearInterval(walletTimer);
          if (releasedAmtVal) releasedAmtVal.innerText = '$24,500.00';
          if (releasedStatus) {
            releasedStatus.innerText = 'Funds Released';
            releasedStatus.className = 'status-badge green';
          }
          
          this.showToast('Chase Bank released USD 24,500 to secure wallet!');
          this.state.bankAuditStatus = 'complete';

          if (auditBtn) auditBtn.style.display = 'none';
          const continueBtn = document.getElementById('bank-continue-btn');
          if (continueBtn) continueBtn.style.display = 'block';
        } else {
          if (releasedAmtVal) releasedAmtVal.innerText = `$${count.toLocaleString()}.00`;
        }
      }, 80);

    }, 2500);
  }

  confirmBankClearance() {
    this.goToStep(6);
  }

  // Step 6: FX Conversion
  executeFxConversion() {
    const convertBtn = document.getElementById('execute-conv-btn');
    if (convertBtn) {
      convertBtn.disabled = true;
      convertBtn.innerText = 'Locking exchange rate & converting holdings...';
    }

    setTimeout(() => {
      this.state.fxConverted = true;
      this.showToast('Manual FX conversion executed successfully at rate ₹83.42!');
      
      const unconvBanner = document.getElementById('received-banner-unconverted');
      const convBanner = document.getElementById('received-banner-converted');
      if (unconvBanner) unconvBanner.style.display = 'none';
      if (convBanner) convBanner.style.display = 'block';

      const inrVal = document.getElementById('received-stat-inr-val');
      const inrDesc = document.getElementById('received-stat-inr-desc');
      if (inrVal) inrVal.innerText = '₹20,43,790';
      if (inrDesc) inrDesc.innerText = 'Rate locked at ₹83.42';

      const stateUnconv = document.getElementById('fx-conv-state-unconverted');
      const stateConv = document.getElementById('fx-conv-state-converted');
      if (stateUnconv) stateUnconv.style.display = 'none';
      if (stateConv) stateConv.style.display = 'block';

      this.triggerConfetti();
    }, 2000);
  }

  confirmFxConversion() {
    this.goToStep(7);
  }

  // Step 7: Settle & Close
  closeOrder() {
    this.state.orderCompleted = true;
    this.showToast('Order completed & compliance logs archived!');
    this.triggerConfetti();
    
    setTimeout(() => {
      this.goToStep('complete');
    }, 1200);
  }

  closeUploadModal() {
    const modal = document.getElementById('upload-dialog');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Restart Walkthrough
  restartDemo() {
    this.state.orderCompleted = false;
    this.state.onboardingCompleted = false;
    this.state.documents = { invoice: false, packing: false, origin: false, bl: false };
    this.state.fxConverted = false;
    this.state.bankAuditStatus = 'idle';

    // Reset document progress
    const types = ['invoice', 'packing', 'origin', 'bl'];
    types.forEach(t => {
      const badge = document.getElementById(`doc-badge-${t}`);
      const card = document.getElementById(`doc-card-${t}`);
      const btn = document.getElementById(`doc-upload-btn-${t}`);

      if (badge) {
        badge.innerText = 'Pending';
        badge.className = 'status-badge orange';
      }
      if (card) {
        card.style.borderColor = 'var(--border-color)';
        card.style.backgroundColor = '';
      }
      if (btn) {
        btn.innerText = (t === 'bl') ? 'Upload Bill of Lading' : `Upload ${t.charAt(0).toUpperCase() + t.slice(1)}`;
      }
    });

    const docsBanner = document.getElementById('docs-complete-banner');
    if (docsBanner) docsBanner.style.display = 'none';
    const docsContinue = document.getElementById('docs-continue-btn');
    if (docsContinue) docsContinue.disabled = true;

    const blBanner = document.getElementById('bl-complete-banner');
    if (blBanner) blBanner.style.display = 'none';
    const blContinue = document.getElementById('bl-continue-btn');
    if (blContinue) blContinue.disabled = true;

    // Reset VKYC call buttons
    const callBtn = document.getElementById('vkyc-call-btn');
    if (callBtn) {
      callBtn.disabled = false;
      callBtn.style.display = 'flex';
      callBtn.innerText = 'Start Call with Officer';
    }
    const vkycSubmit = document.getElementById('vkyc-submit-btn');
    if (vkycSubmit) vkycSubmit.style.display = 'none';

    // Reset Step 2 checks
    const checks = ['lc-check-1', 'lc-check-2', 'lc-check-3', 'lc-check-4'];
    checks.forEach(c => {
      const el = document.getElementById(c);
      if (el) el.checked = false;
    });
    const lcAccept = document.getElementById('lc-accept-btn');
    if (lcAccept) lcAccept.disabled = true;

    // Reset Step 5 bank audit elements
    const blStatus = document.getElementById('audit-status-bl');
    if (blStatus) {
      blStatus.innerText = 'AUDITING...';
      blStatus.style.color = 'var(--orange)';
    }
    const releasedAmtVal = document.getElementById('bank-released-amt');
    if (releasedAmtVal) releasedAmtVal.innerText = '$0.00';
    const releasedStatus = document.getElementById('bank-released-status');
    if (releasedStatus) {
      releasedStatus.innerText = 'Pending verification';
      releasedStatus.className = 'status-badge orange';
    }
    const auditBtn = document.getElementById('bank-audit-btn');
    if (auditBtn) {
      auditBtn.disabled = false;
      auditBtn.style.display = 'block';
      auditBtn.innerText = 'Trigger SBI Bank Document Audit →';
    }
    const continueBtn = document.getElementById('bank-continue-btn');
    if (continueBtn) continueBtn.style.display = 'none';

    // Reset Step 6 FX elements
    const unconvBanner = document.getElementById('received-banner-unconverted');
    const convBanner = document.getElementById('received-banner-converted');
    if (unconvBanner) unconvBanner.style.display = 'block';
    if (convBanner) convBanner.style.display = 'none';

    const inrVal = document.getElementById('received-stat-inr-val');
    const inrDesc = document.getElementById('received-stat-inr-desc');
    if (inrVal) inrVal.innerText = 'Pending';
    if (inrDesc) inrDesc.innerText = 'Awaiting FX request';

    const stateUnconv = document.getElementById('fx-conv-state-unconverted');
    const stateConv = document.getElementById('fx-conv-state-converted');
    if (stateUnconv) {
      stateUnconv.style.display = 'block';
      const executeBtn = document.getElementById('execute-conv-btn');
      if (executeBtn) {
        executeBtn.disabled = false;
        executeBtn.innerText = 'Convert USD 24,500 to INR now →';
      }
    }
    if (stateConv) stateConv.style.display = 'none';

    // Reset document labels & classes
    document.getElementById('onb-file-label-auth').innerHTML = 'Click to browse authorization_letter.pdf';
    document.getElementById('onb-file-label-addr').innerHTML = 'Click to browse electricity_bill.pdf';

    this.showDashboard();
  }

  // Toast Notification System
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

  // Pure HTML5 Canvas Confetti System
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      'hsl(228, 91%, 43%)', // Blue
      'hsl(28, 90%, 52%)',  // Orange
      'hsl(162, 84%, 31%)', // Green
      'hsl(200, 90%, 60%)', // Light Blue
      'hsl(350, 90%, 60%)'  // Pink
    ];

    const particles = [];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 25 - 10,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrameId;
    const gravity = 0.5;

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
        
        if (Math.random() > 0.5) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
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

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
}

// Instantiate the application in window context
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TradePeApp();
});
