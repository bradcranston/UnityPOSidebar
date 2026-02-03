// Global function that FileMaker will call to load data
window.loadPOData = function(dataString) {
  console.log('Loading PO data:', dataString);
  
  // Hide loading overlay
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
  
  // Parse JSON string from FileMaker
  let data;
  try {
    data = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
  } catch (error) {
    console.error('Error parsing PO data:', error);
    return;
  }
  
  // Store vendor options globally
  window.vendorOptions = data.vendorOptions || [];
  
  // Store original values for change detection
  window.originalValues = {
    Number: data.Number || '',
    OrderNumber: data.OrderNumber || '',
    Date: data.Date || '',
    DateApproved: data.DateApproved || '',
    DeliveryRequired: data.DeliveryRequired || '',
    Firm: data.Firm || false,
    PlacedBy: data.PlacedBy || '',
    PlacedWith: data.PlacedWith || '',
    ShipVia: data.ShipVia || '',
    Terms: data.Terms || '',
    FOB: data.FOB || '',
    Vendor_ID: data.Vendor_ID || ''
  };
  
  // Populate PO Details
  document.getElementById('poNumber').value = data.Number || '';
  document.getElementById('orderNumber').value = data.OrderNumber || '';
  document.getElementById('date').value = data.Date || '';
  document.getElementById('dateApproved').value = data.DateApproved || '';
  document.getElementById('deliveryRequired').value = data.DeliveryRequired || '';
  document.getElementById('firm').checked = data.Firm || false;
  
  // Populate approval details if available
  const approvalDetails = document.getElementById('approvalDetails');
  if (data.ApprovalAccount || data.ApprovalTS) {
    const parts = [];
    if (data.ApprovalAccount) parts.push(`By: ${data.ApprovalAccount}`);
    if (data.ApprovalTS) parts.push(data.ApprovalTS);
    approvalDetails.textContent = parts.join(' • ');
  } else {
    approvalDetails.textContent = '';
  }
  document.getElementById('placedBy').value = data.PlacedBy || '';
  document.getElementById('placedWith').value = data.PlacedWith || '';
  
  // Populate Shipping & Terms
  document.getElementById('shipVia').value = data.ShipVia || '';
  document.getElementById('terms').value = data.Terms || '';
  document.getElementById('fob').value = data.FOB || '';
  
  // Populate vendor selector dropdown
  populateVendorSelect(data.vendorOptions);
  
  // Set current vendor if there's a Vendor_ID
  if (data.Vendor_ID) {
    selectVendorById(data.Vendor_ID);
  }
  
  // Auto-resize text in all inputs
  setTimeout(() => autoResizeAllInputs(), 50);
};

function autoResizeText(element) {
  if (!element || !element.value) return;
  
  // Reset to default size
  element.style.fontSize = '';
  
  // Check if text overflows
  const isOverflowing = element.scrollWidth > element.clientWidth;
  
  if (isOverflowing) {
    let fontSize = 12; // Starting font size
    element.style.fontSize = fontSize + 'px';
    
    // Reduce font size until it fits or reaches minimum
    while (element.scrollWidth > element.clientWidth && fontSize > 8) {
      fontSize -= 0.5;
      element.style.fontSize = fontSize + 'px';
    }
  }
}

function autoResizeAllInputs() {
  // Resize all text inputs and textareas
  const inputs = document.querySelectorAll('input[type="text"], textarea');
  inputs.forEach(input => autoResizeText(input));
}

function populateVendorSelect(vendors) {
  const dropdown = document.getElementById('vendorDropdown');
  
  // Clear existing options
  dropdown.innerHTML = '';
  
  // Add vendor options
  vendors.forEach((vendor, index) => {
    const option = document.createElement('div');
    option.className = 'vendor-option';
    option.dataset.id = vendor._ID;
    option.dataset.name = vendor.VendorName.trim().toLowerCase();
    option.textContent = vendor.VendorName.trim();
    
    option.addEventListener('click', () => {
      selectVendor(vendor._ID, vendor.VendorName.trim());
    });
    
    dropdown.appendChild(option);
  });
}

function selectVendor(vendorId, vendorName) {
  const searchInput = document.getElementById('vendorSearch');
  const dropdown = document.getElementById('vendorDropdown');
  
  searchInput.value = vendorName;
  dropdown.classList.remove('active');
  displayVendorDetails(vendorId);
}

function selectVendorById(vendorId) {
  const vendor = window.vendorOptions.find(v => v._ID === vendorId);
  if (vendor) {
    selectVendor(vendorId, vendor.VendorName.trim());
  }
}

function filterVendors(searchTerm) {
  const dropdown = document.getElementById('vendorDropdown');
  const options = dropdown.querySelectorAll('.vendor-option');
  const term = searchTerm.toLowerCase();
  
  let hasVisible = false;
  options.forEach(option => {
    const name = option.dataset.name;
    if (name.includes(term)) {
      option.style.display = 'block';
      hasVisible = true;
    } else {
      option.style.display = 'none';
    }
  });
  
  return hasVisible;
}

function displayVendorDetails(vendorId) {
  const vendorDetails = document.getElementById('vendorDetails');
  
  if (!vendorId) {
    vendorDetails.classList.remove('active');
    return;
  }
  
  const vendor = window.vendorOptions.find(v => v._ID === vendorId);
  
  if (!vendor) {
    vendorDetails.classList.remove('active');
    return;
  }
  
  // Populate vendor details
  document.getElementById('vendorAddress').value = vendor.VendorAddress || '';
  document.getElementById('vendorPhone').value = vendor.Phone || '';
  document.getElementById('vendorEmail').value = vendor.Email || '';
  document.getElementById('vendorFax').value = vendor.Fax || '';
  document.getElementById('vendorPayment').value = vendor.PreferredPayment || '';
  document.getElementById('vendorAccounting').value = vendor.AccountingName || '';
  document.getElementById('vendorAccountingPhone').value = vendor.AccountingPhone || '';
  
  // Store original vendor email for change detection
  window.currentVendorEmail = vendor.Email || '';
  
  // Show vendor details with animation
  vendorDetails.classList.add('active');
  
  // Auto-resize text in vendor detail inputs
  setTimeout(() => {
    autoResizeText(document.getElementById('vendorAddress'));
    autoResizeText(document.getElementById('vendorPhone'));
    autoResizeText(document.getElementById('vendorEmail'));
    autoResizeText(document.getElementById('vendorFax'));
    autoResizeText(document.getElementById('vendorPayment'));
    autoResizeText(document.getElementById('vendorAccounting'));
    autoResizeText(document.getElementById('vendorAccountingPhone'));
  }, 50);
  
  // Notify FileMaker of vendor selection
  notifyFileMakerOfChange('Vendor_ID', vendorId);
  
  // Attach change listener to vendor email
  const emailInput = document.getElementById('vendorEmail');
  if (emailInput) {
    // Remove any existing listeners
    emailInput.replaceWith(emailInput.cloneNode(true));
    const newEmailInput = document.getElementById('vendorEmail');
    
    newEmailInput.addEventListener('change', (e) => {
      notifyFileMakerOfChange('Email', e.target.value);
      // Auto-resize text after change
      setTimeout(() => autoResizeText(e.target), 10);
    });
    
    newEmailInput.addEventListener('input', (e) => {
      // Auto-resize text as user types
      autoResizeText(e.target);
    });
  }
}

function notifyFileMakerOfChange(fieldName, newValue) {
  const parameter = JSON.stringify({
    mode: 'updatePO',
    fieldName: fieldName,
    value: newValue
  });
  
  console.log('Notifying FileMaker of change:', parameter);
  
  if (window.FileMaker && window.FileMaker.PerformScript) {
    window.FileMaker.PerformScript('Manage: PO Lines', parameter);
  }
  
  // Update stored original value
  if (window.originalValues) {
    window.originalValues[fieldName] = newValue;
  }
}

// Function FileMaker can call to flush any pending unsaved changes
window.flushPendingChanges = function() {
  console.log('Flushing pending changes...');
  
  // Map of element IDs to field names
  const fieldMapping = {
    'poNumber': 'Number',
    'orderNumber': 'OrderNumber',
    'date': 'Date',
    'dateApproved': 'DateApproved',
    'deliveryRequired': 'DeliveryRequired',
    'placedBy': 'PlacedBy',
    'placedWith': 'PlacedWith',
    'shipVia': 'ShipVia',
    'terms': 'Terms',
    'fob': 'FOB',
    'firm': 'Firm'
  };
  
  let changesFlushed = 0;
  
  // Check each field for unsaved changes
  Object.keys(fieldMapping).forEach(elementId => {
    const element = document.getElementById(elementId);
    const fieldName = fieldMapping[elementId];
    
    if (element && window.originalValues) {
      const currentValue = element.type === 'checkbox' ? element.checked : element.value;
      const originalValue = window.originalValues[fieldName];
      
      // If value has changed from original, send update
      if (currentValue !== originalValue) {
        console.log(`Flushing change for ${fieldName}: "${originalValue}" -> "${currentValue}"`);
        notifyFileMakerOfChange(fieldName, currentValue);
        changesFlushed++;
      }
    }
  });
  
  // Check vendor email separately if it's been modified
  const emailInput = document.getElementById('vendorEmail');
  if (emailInput && window.currentVendorEmail !== undefined) {
    if (emailInput.value !== window.currentVendorEmail) {
      console.log(`Flushing change for Email: "${window.currentVendorEmail}" -> "${emailInput.value}"`);
      notifyFileMakerOfChange('Email', emailInput.value);
      window.currentVendorEmail = emailInput.value;
      changesFlushed++;
    }
  }
  
  console.log(`Flushed ${changesFlushed} pending change(s)`);
  return changesFlushed;
};

function attachEditListeners() {
  // Map element IDs to data.json field names
  const fieldMapping = {
    'poNumber': 'Number',
    'orderNumber': 'OrderNumber',
    'date': 'Date',
    'dateApproved': 'DateApproved',
    'deliveryRequired': 'DeliveryRequired',
    'placedBy': 'PlacedBy',
    'placedWith': 'PlacedWith',
    'shipVia': 'ShipVia',
    'terms': 'Terms',
    'fob': 'FOB',
    'firm': 'Firm'
  };
  
  // Attach listeners to all editable fields
  Object.keys(fieldMapping).forEach(elementId => {
    const element = document.getElementById(elementId);
    const dataFieldName = fieldMapping[elementId];
    
    if (element) {
      if (element.type === 'checkbox') {
        element.addEventListener('change', (e) => {
          notifyFileMakerOfChange(dataFieldName, e.target.checked);
        });
      } else {
        element.addEventListener('change', (e) => {
          notifyFileMakerOfChange(dataFieldName, e.target.value);
        });
      }
    }
  });
}

// Event listener for vendor selection
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('vendorSearch');
  const dropdown = document.getElementById('vendorDropdown');
  
  // Show dropdown on focus
  searchInput.addEventListener('focus', () => {
    dropdown.classList.add('active');
    filterVendors(searchInput.value);
  });
  
  // Filter on input
  searchInput.addEventListener('input', (e) => {
    dropdown.classList.add('active');
    filterVendors(e.target.value);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
  
  // Attach edit listeners to non-vendor inputs
  attachEditListeners();
  
  // Log ready state
  console.log('PO Sidebar initialized. Waiting for FileMaker to call window.loadPOData()');
});

// For testing in browser without FileMaker, uncomment below:
// (You can load test data automatically)
/*
fetch('./data.json')
  .then(response => response.json())
  .then(data => window.loadPOData(data))
  .catch(error => console.error('Error loading test data:', error));
*/