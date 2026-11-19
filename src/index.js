// Track pending changes
let pendingChanges = new Set();

function formatDateForFileMaker(dateValue) {
  // Convert YYYY-MM-DD to MM/DD/YYYY for FileMaker
  if (!dateValue) return '';
  
  // If already in MM/DD/YYYY format, return as is
  if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    return dateValue;
  }
  
  // If in YYYY-MM-DD format (from date input), convert it
  if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateValue.split('-');
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  }
  
  return dateValue;
}

function formatDateForInput(dateValue) {
  // Convert MM/DD/YYYY to YYYY-MM-DD for date input
  if (!dateValue) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateValue;
  }
  
  // If in MM/DD/YYYY format, convert it
  if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = dateValue.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return dateValue;
}

function addSpacesToName(name) {
  // Add spaces before capital letters in concatenated names
  if (!name) return '';
  
  // Only process if the name has no spaces and has multiple capital letters
  if (name.includes(' ')) return name;
  
  // Add space before each capital letter (except the first one)
  return name.replace(/([A-Z])/g, ' $1').trim();
}

function populateDatalist(datalistId, optionsString) {
  // Populate a datalist with options from a return-separated string
  const datalist = document.getElementById(datalistId);
  if (!datalist || !optionsString) return;
  
  // Clear existing options
  datalist.innerHTML = '';
  
  // Split by returns (handle both \r and \n)
  const options = optionsString.split(/\r\n|\r|\n/).filter(opt => opt.trim());
  
  // Create option elements
  options.forEach(optionValue => {
    const option = document.createElement('option');
    option.value = optionValue.trim();
    datalist.appendChild(option);
  });
}

function updateUnsavedIndicator() {
  const indicator = document.getElementById('unsavedIndicator');
  if (indicator) {
    if (pendingChanges.size > 0) {
      indicator.classList.add('visible');
    } else {
      indicator.classList.remove('visible');
    }
  }
}

// Global function that FileMaker will call to load data
window.loadPOData = function(dataString, terms, placedWith, shipVia) {
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
    // FileMaker may embed literal CR/LF characters inside string values, which
    // are invalid in JSON. Sanitize by escaping control chars within strings and retry.
    if (typeof dataString === 'string') {
      try {
        const sanitized = dataString.replace(/"((?:[^"\\]|\\.)*)"/g, function(match) {
          return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        });
        data = JSON.parse(sanitized);
      } catch (e2) {
        console.error('Error parsing PO data after sanitization:', e2);
        return;
      }
    } else {
      return;
    }
  }
  
  // Store vendor options globally
  window.vendorOptions = data.vendorOptions || [];
  
  // Populate datalists from return-separated strings passed as separate parameters
  console.log('Datalist data received:', { terms, placedWith, shipVia });
  
  if (terms) populateDatalist('termsList', terms);
  if (placedWith) populateDatalist('placedWithList', placedWith);
  if (shipVia) populateDatalist('shipViaList', shipVia);
  
  // Store original values for change detection
  window.originalValues = {
    Number: data.Number || '',
    OrderNumber: data.OrderNumber || '',
    AccountNumber: data.AccountNumber || '',
    Date: formatDateForInput(data.Date || ''),
    DateApproved: formatDateForInput(data.DateApproved || ''),
    DeliveryRequired: formatDateForInput(data.DeliveryRequired || ''),
    Firm: data.Firm || false,
    PlacedBy: data.PlacedBy || '',
    PlacedWith: data.PlacedWith || '',
    ShipVia: data.ShipVia || '',
    Terms: data.Terms || '',
    FOB: data.FOB || '',
    Vendor_ID: data.Vendor_ID || '',
    PreferredPayment: data.PreferredPayment || ''
  };
  
  // Populate PO Details
  document.getElementById('poNumber').value = data.Number || '';
  document.getElementById('orderNumber').value = data.OrderNumber || '';
  document.getElementById('accountNumber').value = data.AccountNumber || '';
  document.getElementById('date').value = formatDateForInput(data.Date || '');
  document.getElementById('dateApproved').value = formatDateForInput(data.DateApproved || '');
  document.getElementById('deliveryRequired').value = formatDateForInput(data.DeliveryRequired || '');
  // Toggle class to hide native placeholder text when date fields are empty
  ['date', 'dateApproved', 'deliveryRequired'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('date-empty', !el.value);
  });
  document.getElementById('firm').checked = data.Firm || false;
  addSpacesToName(data.PlacedBy || '')
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
  
  // Clear any pending changes when new data is loaded
  pendingChanges.clear();
  updateUnsavedIndicator();
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
  vendors.forEach((vendor) => {
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

function selectVendor(vendorId, vendorName, isUserSelection = true) {
  const searchInput = document.getElementById('vendorSearch');
  const dropdown = document.getElementById('vendorDropdown');
  
  console.log('Selecting vendor:', vendorId, vendorName);
  
  searchInput.value = vendorName;
  dropdown.classList.remove('active');
  displayVendorDetails(vendorId, isUserSelection);
}

function selectVendorById(vendorId) {
  const vendor = window.vendorOptions.find(v => v._ID === vendorId);
  if (vendor) {
    selectVendor(vendorId, vendor.VendorName.trim(), false);
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

function displayVendorDetails(vendorId, isUserSelection = true) {
  if (!vendorId) {
    return;
  }
  
  const vendor = window.vendorOptions.find(v => v._ID === vendorId);
  
  if (!vendor) {
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
  
  // Populate PO Number with vendor abbreviation only when user selects a vendor
  if (isUserSelection && vendor.Abbreviation) {
    const normalizedAbbreviation = vendor.Abbreviation.trim().startsWith('-')
      ? vendor.Abbreviation.trim()
      : `-${vendor.Abbreviation.trim()}`;
    const poNumberInput = document.getElementById('poNumber');
    poNumberInput.value = normalizedAbbreviation;
    // Notify FileMaker of the PO Number change
    notifyFileMakerOfChange('Number', normalizedAbbreviation);
  }
  
  // Store original vendor email for change detection
  window.currentVendorEmail = vendor.Email || '';
  
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
  
  // Notify FileMaker of vendor selection immediately
  // Use setTimeout to ensure it happens after the UI updates
  setTimeout(() => {
    console.log('Sending vendor selection to FileMaker - Vendor_ID:', vendorId);
    notifyFileMakerOfChange('Vendor_ID', vendorId);
    notifyFileMakerOfChange('DefaultType', vendor.DefaultType || '');
  }, 100);
}

function notifyFileMakerOfChange(fieldName, newValue) {
  // Format dates for FileMaker
  let valueToSend = newValue;
  if (fieldName === 'Date' || fieldName === 'DateApproved' || fieldName === 'DeliveryRequired') {
    valueToSend = formatDateForFileMaker(newValue);
  }
  
  const parameter = JSON.stringify({
    mode: 'updatePO',
    fieldName: fieldName,
    value: valueToSend
  });
  
  console.log('Notifying FileMaker of change:', parameter);
  
  // Track this change as pending temporarily
  pendingChanges.add(fieldName);
  updateUnsavedIndicator();
  
  if (window.FileMaker && window.FileMaker.PerformScript) {
    window.FileMaker.PerformScript('Manage: PO Lines', parameter);
    
    // Remove from pending changes after sending (change has been transmitted)
    setTimeout(() => {
      pendingChanges.delete(fieldName);
      updateUnsavedIndicator();
    }, 500);
  } else {
    // If FileMaker not available (testing), clear immediately
    setTimeout(() => {
      pendingChanges.delete(fieldName);
      updateUnsavedIndicator();
    }, 500);
  }
  
  // Update stored original value (keep in input format)
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
    'accountNumber': 'AccountNumber',
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
  
  console.log(`Flushed ${changesFlushed} pending change(s)`);
  
  // Clear pending changes after flush
  pendingChanges.clear();
  updateUnsavedIndicator();
  
  return changesFlushed;
};

// Function FileMaker can call to mark changes as saved
window.markChangesSaved = function() {
  pendingChanges.clear();
  updateUnsavedIndicator();
  console.log('All changes marked as saved');
};

function attachEditListeners() {
  // Map element IDs to data.json field names
  const fieldMapping = {
    'poNumber': 'Number',
    'orderNumber': 'OrderNumber',
    'accountNumber': 'AccountNumber',
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
          // Toggle empty class for date fields to hide native placeholder
          if (e.target.type === 'date') {
            e.target.classList.toggle('date-empty', !e.target.value);
          }
          // Auto-resize text after change
          setTimeout(() => autoResizeText(e.target), 10);
        });
        
        // Add input listener for auto-resize on text fields (not date fields)
        if (element.type === 'text' || element.tagName === 'TEXTAREA') {
          element.addEventListener('input', (e) => {
            autoResizeText(e.target);
          });
        }
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
  
  // Handle blur - try to match vendor if typed directly
  searchInput.addEventListener('blur', (e) => {
    setTimeout(() => {
      const searchValue = e.target.value.trim().toLowerCase();
      if (searchValue) {
        // Try to find an exact match
        const matchingVendor = window.vendorOptions?.find(v => 
          v.VendorName.trim().toLowerCase() === searchValue
        );
        if (matchingVendor) {
          selectVendor(matchingVendor._ID, matchingVendor.VendorName.trim());
        }
      }
    }, 200); // Delay to allow dropdown click to register first
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