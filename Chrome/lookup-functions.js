/*
TODO
-Provide option to save formatting options (cookie?)
*/
javascript:(function(){
  console.clear();
  if (!window.htmlData) {
    console.error('HTML data not loaded. Make sure data-source.js is included before this script.');
    alert('HTML data not available. Please ensure the extension is properly installed.');
    return;
  }
  
  const htmlData = window.htmlData;

  // Check for and remove existing dialog
  const existingShadowHost = document.getElementById('a11y-tools-shadow-host');
  if (existingShadowHost) {
    // Clean up existing dialog
    const elementsWithAriaHidden = document.querySelectorAll('[aria-hidden="true"]');
    elementsWithAriaHidden.forEach(element => {
      if (element !== existingShadowHost) {
        element.removeAttribute('aria-hidden');
      }
    });
    
    // Restore tabindex for elements that were made non-focusable
    const elementsWithNegativeTabindex = document.querySelectorAll('[tabindex="-1"]');
    elementsWithNegativeTabindex.forEach(element => {
      element.removeAttribute('tabindex');
    });
    
    // Remove the existing shadow host
    document.body.removeChild(existingShadowHost);
  }

  //remember element with focus
  const currentFocus = document.activeElement;

  let selectedItem = null;
  let currentSelection = -1;
  let filteredData = []; // Store the filtered results
  let notificationTimeout = null; // Store timeout for notification
  
  // Create shadow host element
  const shadowHost = document.createElement('div');
  shadowHost.setAttribute('id', 'a11y-tools-shadow-host');
  shadowHost.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    pointer-events: none;
  `;

  // Create shadow root
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

  let sideBarOverrides='';
  let isFullPage = false;
  if (typeof openInSidebar !== 'undefined' && openInSidebar) {
    isFullPage = true;
    sideBarOverrides = `#a11y-tools-data-lookup {
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      top:0;
      bottom:0;
      outline:0;
      border:0;
    }
    #data-list {
      max-height: 70vh;
    }
  `;
  }

  // Add comprehensive reset styles to shadow DOM
  const shadowStyles = document.createElement('style');
  shadowStyles.textContent = `
    /* Reset all default styles */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 100%;
      vertical-align: baseline;
      box-sizing: border-box;
      line-height: 1;
    }

    /* Basic styling for all elements */
    * {
      font-family: Arial, sans-serif;
      color: inherit;
      background: transparent;
      text-decoration: none;
      list-style: none;
    }

    /* Specific component styles */
    #a11y-tools-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      pointer-events: all;
    }

    #a11y-tools-data-lookup {
      background: white;
      background: #e4efe4;
      color: black;
      position: fixed;
      top: 2em;
      left: 50%;
      transform: translate(-50%, 0);
      border: 2px solid #333;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 10000;
      font-family: Arial, sans-serif;
      max-width: 90vw;
      width: 60em;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      pointer-events: all;
    }

    #a11y-tools-data-lookup h1 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 20px;
      font-weight: bold;
      line-height: 1.2;
    }

    #a11y-tools-data-lookup input[type="text"] {
      background: white;
      color: black;
      width: 100%;
      padding: 12px;
      border: 2px solid #235f20;
      font-size: 16px;
      margin-bottom: 16px;
      box-sizing: border-box;
      border-radius: 5px;
    }

    #a11y-tools-data-lookup input[type="text"]:focus {
      outline: 3px solid #235f20;
      outline-offset: 3px;
    }

    #a11y-tools-data-lookup button {
      border-radius: 5px;
    }

    #a11y-tools-data-lookup button:focus {
      outline: 3px solid #235f20;
      outline-offset: 3px;
    }

    .search-hint {
      font-size: 12px;
      color: #666;
      margin-bottom: 10px;
      line-height: 1.3;
    }

    #data-list:empty {
      display:none!important;
    }
    #data-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ccc;
      margin: 0 0 15px 0;
      padding: 0;
      list-style: none;
      background: #f9f9f9;
    }

    #data-list li {
      padding: 10px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      background: white;
      line-height: 1.4;
    }

    #data-list li:hover,
    #data-list li.hover {
      background: #0f380d;
    }

    #data-list li:hover *,
    #data-list li.hover * {
      color: white!important;
    }

    #selection-made {
      border: 1px solid #235f20;
      padding: 10px;
      margin-bottom: 15px;
      background: #f2fff0;
      display: none;
      border-radius: 3px;
    }

    #selection-made strong {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    .selection-text {
      font-family: monospace;
      font-size: 14px;
      line-height: 1.3;
    }

    #selection-made:focus {
      outline: 3px solid #235f20;
      outline-offset: 3px;
    }

    .buttons-container {
      display: none;
      gap: 10px;
      flex-wrap: wrap;
    }

    .action-button {
      background: #235f20;
      color: white;
      border: none;
      padding: 10px 15px;
      cursor: pointer;
      font-size: 14px;
      margin: 5px 5px 5px 0;
      border-radius: 3px;
    }

    .action-button:hover {
      background: #0f380d;
    }

    .secondary-button {
      background: #666;
      color: white;
      border: none;
      padding: 10px 15px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
      border-radius: 3px;
    }

    .secondary-button:hover {
      background: #444;
    }
    .category {
      color:white;
      background:gray;
      padding:0.2em;
      font-size:0.8em;
      border-radius:5px;
      outline:1px solid white;
    }
    .element {
      background:#173b4e;
    }
    .attribute {
      background:#295f19;
    }
    .ARIA {
      background:#65395b;
    }

/* Radio button options styling */
.radio-options {
  display: none;
  border: 1px solid #235f20;
  padding: 10px;
  margin-bottom: 15px;
  background: #f2fff0;
  border-radius: 3px;
}

.radio-options fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

.radio-options legend {
  font-weight: bold;
  margin-bottom: 8px;
  color: #235f20;
  font-size: 14px;
}

.radio-options-container {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.radio-option {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.radio-option input[type="radio"] {
  width: auto;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: inherit;
}

.radio-option input[type="radio"]:focus {
  outline: 2px solid #235f20;
  outline-offset: 2px;
}

.radio-option label {
  cursor: pointer;
  font-size: 14px;
  line-height: 1.3;
  color: #333;
}
    /* Notification panel styles */
    #notification-panel {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #2d5016;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      border: 2px solid #4a7c2a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      width:calc(100%-40px);
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      opacity: 0;
      transform: translateX(100%);
      pointer-events: all;
    }

    #notification-panel.show {
      opacity: 1;
      transform: translateX(0);
    }

    #notification-panel .notification-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #a8d982;
    }

    #notification-panel .notification-content {
      font-family: monospace;
      background: rgba(255,255,255,0.1);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.2);
      word-break: break-all;
    }

    ${sideBarOverrides}
  `;

  // Store elements that should be hidden from AT
  const elementsToHide = [];
  const bodyChildren = Array.from(document.body.children);
  bodyChildren.forEach(child => {
    if (child !== shadowHost) {
      elementsToHide.push({
        element: child,
        originalAriaHidden: child.getAttribute('aria-hidden')
      });
      child.setAttribute('aria-hidden', 'true');
    }
  });
  
  // Store elements that can receive focus
  const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
  const focusableElements = Array.from(document.querySelectorAll(focusableSelectors));
  
  // Store original tabindex values and make elements non-focusable
  const originalTabIndices = [];
  focusableElements.forEach(element => {
    originalTabIndices.push({
      element: element,
      originalTabIndex: element.getAttribute('tabindex')
    });
    element.setAttribute('tabindex', '-1');
  });
  
  // Create modal backdrop inside shadow DOM
  const modalBackdrop = document.createElement('div');
  modalBackdrop.setAttribute('id', 'a11y-tools-modal-backdrop');
  
  const dialog = document.createElement('div');
  if (!isFullPage) {
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
  }
  dialog.setAttribute('id', 'a11y-tools-data-lookup');
  dialog.setAttribute('aria-labelledby', 'a11y-tools-lookup-dialog-header');
  
  const title = document.createElement('h1');
  title.textContent = 'Look up HTML reference';
  title.setAttribute('id', 'a11y-tools-lookup-dialog-header');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type to search/filter';
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-labelledby', 'a11y-tools-lookup-dialog-header');
  input.setAttribute('aria-controls', 'data-list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-describedby', 'search-hint');
  
  // const hint = document.createElement('div');
  // hint.id = 'search-hint';
  // hint.className = 'search-hint';
  // hint.textContent = 'Use arrow keys to navigate results, Enter to select, Escape to close';
  
  const results = document.createElement('ul');
  results.setAttribute('role', 'listbox');
  results.setAttribute('tabindex', '0');
  results.setAttribute('id', 'data-list');
  results.setAttribute('aria-label', 'HTML elements');
  
  const selectionDiv = document.createElement('div');
  selectionDiv.setAttribute('id','selection-made');
  selectionDiv.setAttribute('tabindex','-1');
  
  const selectionTitle = document.createElement('strong');
  selectionTitle.textContent = 'Selected:';
  
  const selectionText = document.createElement('div');
  selectionText.className = 'selection-text';
  
  selectionDiv.appendChild(selectionTitle);
  selectionDiv.appendChild(selectionText);
  
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'buttons-container';
  
  // Create radio button options container
  // const radioOptionsDiv = document.createElement('div');
  // radioOptionsDiv.className = 'radio-options';
  
  // const fieldset = document.createElement('fieldset');
  // const legend = document.createElement('legend');
  // legend.textContent = 'Angle bracket formatting (in copied links):';
  
  // const radioOption1 = document.createElement('div');
  // radioOption1.className = 'radio-option';
  
  // const radioConvertBrackets = document.createElement('input');
  // radioConvertBrackets.type = 'radio';
  // radioConvertBrackets.name = 'angle-brackets';
  // radioConvertBrackets.id = 'convert-brackets';
  // radioConvertBrackets.value = 'convert';
  // radioConvertBrackets.checked = true; // Default selection
  
  // const labelConvertBrackets = document.createElement('label');
  // labelConvertBrackets.setAttribute('for', 'convert-brackets');
  // labelConvertBrackets.textContent = 'Convert < > to &lt; &gt;';
  
  // radioOption1.appendChild(radioConvertBrackets);
  // radioOption1.appendChild(labelConvertBrackets);
  
  // const radioOption2 = document.createElement('div');
  // radioOption2.className = 'radio-option';
  
  // const radioKeepBrackets = document.createElement('input');
  // radioKeepBrackets.type = 'radio';
  // radioKeepBrackets.name = 'angle-brackets';
  // radioKeepBrackets.id = 'keep-brackets';
  // radioKeepBrackets.value = 'keep';
  
  // const labelKeepBrackets = document.createElement('label');
  // labelKeepBrackets.setAttribute('for', 'keep-brackets');
  // labelKeepBrackets.textContent = 'Keep < > characters as-is';
  
  // radioOption2.appendChild(radioKeepBrackets);
  // radioOption2.appendChild(labelKeepBrackets);

  // const radioContainer = document.createElement('div');
  // radioContainer.className = 'radio-options-container';

  // radioContainer.appendChild(radioOption1);
  // radioContainer.appendChild(radioOption2);
      
  // fieldset.appendChild(legend);
  // fieldset.appendChild(radioContainer);
  // radioOptionsDiv.appendChild(fieldset);
  
  // Create notification panel
  const notificationPanel = document.createElement('div');
  notificationPanel.setAttribute('id', 'notification-panel');
  notificationPanel.setAttribute('role', 'status');
  notificationPanel.setAttribute('aria-live', 'polite');
  
  const notificationTitle = document.createElement('div');
  notificationTitle.className = 'notification-title';
  
  const notificationContent = document.createElement('div');
  notificationContent.className = 'notification-content';
  
  notificationPanel.appendChild(notificationTitle);
  notificationPanel.appendChild(notificationContent);
  
  // Function to show notification
  function showNotification(title, content) {
    // Clear any existing timeout
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    // Set notification content
    notificationTitle.textContent = title;
    notificationContent.textContent = content;
    
    // Show notification with animation
    notificationPanel.classList.add('show');
    
    // Hide notification after 5 seconds
    notificationTimeout = setTimeout(() => {
      notificationPanel.classList.remove('show');
    }, 5000);
  }
  
  // Function to get the selected angle bracket option
  // function getAngleBracketOption() {
  //   const checkedRadio = radioOptionsDiv.querySelector('input[name="angle-brackets"]:checked');
  //   return checkedRadio ? checkedRadio.value : 'convert';
  // }
  
  // Function to format title based on selected option
  // function formatTitle(title) {
  //   const option = getAngleBracketOption();
  //   if (option === 'convert') {
  //     return title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  //   }
  //   return title;
  // }
  
  // Define all possible buttons
  const allButtons = [
    { text: 'Copy MDN page URL as Markdown Link (1)', key: '1', action: 'MDNpageMarkdown' },
    { text: 'Copy MDN page URL as HTML Link (2)', key: '2', action: 'MDNpageHtml' },
    { text: 'Go to MDN ref page (3)', key: '3', action: 'gotoMDNpage' },
    { text: 'Copy HTML spec URL as Markdown Link (4)', key: '4', action: 'HTMLspecMarkdown' },
    { text: 'Copy HTML spec URL as HTML Link (5)', key: '5', action: 'HTMLspecHtml' },
    { text: 'Go to HTML spec page (6)', key: '6', action: 'gotoHTMLspec' },
  ];
  
  // Function to create buttons based on selected item
  function createButtons(item) {
    // Clear existing buttons
    buttonsDiv.innerHTML = '';
    
    // Determine which buttons to show based on category
    const isAttribute = item.category === 'attribute' || item.category === 'ARIA';
    const buttonsToShow = isAttribute ? allButtons.slice(0, 3) : allButtons;
    
    buttonsToShow.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.className = 'action-button';
      button.onclick = () => copyContent(btn.action);
      buttonsDiv.appendChild(button);
    });
  }
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close (Escape)';
  closeBtn.className = 'secondary-button';
  
  const startAgainBtn = document.createElement('button');
  startAgainBtn.textContent = 'Start again';
  startAgainBtn.className = 'secondary-button';
  
  function startAgain(){
    results.setAttribute('tabindex', '0');
    selectionDiv.style.display = 'none';
    buttonsDiv.style.display = 'none';
    // radioOptionsDiv.style.display = 'none';
    startAgainBtn.style.display = 'none';
    input.value = '';
    selectedItem = null;
    currentSelection = -1;
    performSearch('');
    input.focus();
  }

  function closeDialog() {
    // Clear notification timeout if active
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    
    // Restore original aria-hidden values
    elementsToHide.forEach(({element, originalAriaHidden}) => {
      if (originalAriaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', originalAriaHidden);
      }
    });
    
    // Restore original tabindex values
    originalTabIndices.forEach(({element, originalTabIndex}) => {
      if (originalTabIndex === null) {
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('tabindex', originalTabIndex);
      }
    });
    
    // Remove shadow host element
    document.body.removeChild(shadowHost);
    
    // Return focus to original element
    currentFocus.focus();
  }
  
  closeBtn.addEventListener('click', closeDialog);
  startAgainBtn.addEventListener('click', startAgain);
  
  // Close dialog when clicking backdrop
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeDialog();
    }
  });
  
  // Trap focus within dialog
  function trapFocus(e) {
    const focusableElements = dialog.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (shadowRoot.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (shadowRoot.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  }

  function populateListBox(){

  }
  
  function performSearch(query) {
    filteredData = htmlData.filter(item => {
      if (query.length === 0) return true;
      
      const title = item.title.toLowerCase();
      const searchQuery = query.toLowerCase();
      
      // Extract words from title and query
      const titleWords = title.match(/[a-z0-9]+/g) || [];
      const queryWords = searchQuery.match(/[a-z0-9]+/g) || [];
      
      // If no valid query words, no match
      if (queryWords.length === 0) return false;
      
      // Check if every query word starts at least one title word
      return queryWords.every(queryWord => 
        titleWords.some(titleWord => titleWord.startsWith(queryWord))
      );
    });
    
    results.innerHTML = '';
    currentSelection = -1;
    
    input.setAttribute('aria-expanded', filteredData.length > 0 ? 'true' : 'false');
    
    if (filteredData.length === 0) {
      const noResults = document.createElement('li');
      noResults.textContent = 'No HTML element or attribute found that matches this filtering';
      noResults.style.cssText = 'padding: 10px; color: #666; font-style: italic;';
      results.appendChild(noResults);
      return;
    }
    
    filteredData.forEach((item, index) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('id', `option-${index}`);
      const strClass = item.category;
      const cleanedTitle = item.title.replace('<','&lt;').replace('>','&gt;')
      li.innerHTML = '<span style="font-weight:bold">' + cleanedTitle + ' <span class="category ' + strClass + '">' + item.category + '</span></span>';
      li.dataset.index = index;
      li.dataset.whatwgUrl = item.whatwgUrl;
      li.dataset.title = item.title;
      
      li.onmouseenter = () => {
        currentSelection = index;
        updateSelection();
      };
      
      li.onclick = () => showSelectedItem(item);
      
      results.appendChild(li);
    });
  }
function flexibleMatch(title, query) {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Debug logging
  console.log('Debug - Title:', title);
  console.log('Debug - Query:', query);
  
  // Extract all words from both title and query (letters/numbers only)
  const titleWords = titleLower.match(/\b[a-z0-9]+\b/g) || [];
  const queryWords = queryLower.match(/\b[a-z0-9]+\b/g) || [];
  
  console.log('Debug - Title words:', titleWords);
  console.log('Debug - Query words:', queryWords);
  
  // If no query words, don't match
  if (queryWords.length === 0) return false;
  
  // Strategy 1: Check if all query words start any title words
  const startsWithMatch = queryWords.every(queryWord => 
    titleWords.some(titleWord => titleWord.startsWith(queryWord))
  );
  
  console.log('Debug - Starts with match:', startsWithMatch);
  
  if (startsWithMatch) return true;
  
  // Strategy 2: Only for concatenated matching with stricter rules
  // Only try concatenation if query looks like it could be concatenated words
  if (queryWords.length === 1 && queryWords[0].length >= 4) {
    const concatenatedTitle = titleWords.join('');
    const concatMatch = concatenatedTitle.includes(queryWords[0]);
    console.log('Debug - Concatenated title:', concatenatedTitle);
    console.log('Debug - Concat match:', concatMatch);
    return concatMatch;
  }
  
  console.log('Debug - Final result: false');
  return false;
}

function fuzzyWordMatch(titleWords, queryWords) {
  // Removed - functionality moved to main flexibleMatch function
  return false;
}

function concatenatedWordMatch(titleWords, queryWords) {
  // Handle cases like "PIGDOG", "DOGPIG", "DOGCOWPIG"
  // Only check concatenation of actual title words, not arbitrary substrings
  const concatenatedTitle = titleWords.join('');
  
  return queryWords.every(queryWord => {
    // Only match if the query word appears at word boundaries in concatenated form
    // or if it's a meaningful prefix of a word (3+ chars)
    return queryWord.length >= 3 && concatenatedTitle.includes(queryWord);
  });
}
function flexibleMatch(title, query) {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Debug logging
  console.log('Debug - Title:', title);
  console.log('Debug - Query:', query);
  
  // Extract all words from both title and query (letters/numbers only)
  const titleWords = titleLower.match(/\b[a-z0-9]+\b/g) || [];
  const queryWords = queryLower.match(/\b[a-z0-9]+\b/g) || [];
  
  console.log('Debug - Title words:', titleWords);
  console.log('Debug - Query words:', queryWords);
  
  // If no query words, don't match
  if (queryWords.length === 0) return false;
  
  // Strategy 1: Check if all query words start any title words
  const startsWithMatch = queryWords.every(queryWord => 
    titleWords.some(titleWord => titleWord.startsWith(queryWord))
  );
  
  console.log('Debug - Starts with match:', startsWithMatch);
  
  if (startsWithMatch) return true;
  
  // Strategy 2: Only for concatenated matching with stricter rules
  // Only try concatenation if query looks like it could be concatenated words
  if (queryWords.length === 1 && queryWords[0].length >= 4) {
    const concatenatedTitle = titleWords.join('');
    const concatMatch = concatenatedTitle.includes(queryWords[0]);
    console.log('Debug - Concatenated title:', concatenatedTitle);
    console.log('Debug - Concat match:', concatMatch);
    return concatMatch;
  }
  
  console.log('Debug - Final result: false');
  return false;
}

function fuzzyWordMatch(titleWords, queryWords) {
  // Removed - functionality moved to main flexibleMatch function
  return false;
}

function concatenatedWordMatch(titleWords, queryWords) {
  // Handle cases like "PIGDOG", "DOGPIG", "DOGCOWPIG"
  // Only check concatenation of actual title words, not arbitrary substrings
  const concatenatedTitle = titleWords.join('');
  
  return queryWords.every(queryWord => {
    // Only match if the query word appears at word boundaries in concatenated form
    // or if it's a meaningful prefix of a word (3+ chars)
    return queryWord.length >= 3 && concatenatedTitle.includes(queryWord);
  });
}
  function flexibleMatch(title, query) {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Extract all words from both title and query (letters/numbers only)
    const titleWords = titleLower.match(/\b[a-z0-9]+\b/g) || [];
    const queryWords = queryLower.match(/\b[a-z0-9]+\b/g) || [];
    
    // If no query words, don't match
    if (queryWords.length === 0) return false;
    
    // Strategy 1: Check if all query words start any title words
    const startsWithMatch = queryWords.every(queryWord => 
      titleWords.some(titleWord => titleWord.startsWith(queryWord))
    );
    
    if (startsWithMatch) return true;
    
    // Strategy 2: Only for concatenated matching with stricter rules
    // Only try concatenation if query looks like it could be concatenated words
    if (queryWords.length === 1 && queryWords[0].length >= 4) {
      const concatenatedTitle = titleWords.join('');
      return concatenatedTitle.includes(queryWords[0]);
    }
    
    return false;
  }

  function fuzzyWordMatch(titleWords, queryWords) {
    // Removed - functionality moved to main flexibleMatch function
    return false;
  }

  function concatenatedWordMatch(titleWords, queryWords) {
    // Handle cases like "PIGDOG", "DOGPIG", "DOGCOWPIG"
    // Only check concatenation of actual title words, not arbitrary substrings
    const concatenatedTitle = titleWords.join('');
    
    return queryWords.every(queryWord => {
      // Only match if the query word appears at word boundaries in concatenated form
      // or if it's a meaningful prefix of a word (3+ chars)
      return queryWord.length >= 3 && concatenatedTitle.includes(queryWord);
    });
  }
  function flexibleMatch(title, query) {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Extract all words from both title and query
    const titleWords = titleLower.match(/\b\w+\b/g) || [];
    const queryWords = queryLower.match(/\b\w+\b/g) || [];
    
    // If no query words, don't match
    if (queryWords.length === 0) return false;
    
    // Check if all query words are found in the title (order doesn't matter)
    const allWordsMatch = queryWords.every(queryWord => 
      titleWords.some(titleWord => titleWord.startsWith(queryWord))
    );
    
    if (allWordsMatch) return true;
    
    // Check for concatenated words only if we have meaningful word boundaries
    return concatenatedWordMatch(titleWords, queryWords);
  }

  function fuzzyWordMatch(titleWords, queryWords) {
    // Removed - functionality moved to main flexibleMatch function
    return false;
  }

  function concatenatedWordMatch(titleWords, queryWords) {
    // Handle cases like "PIGDOG", "DOGPIG", "DOGCOWPIG"
    // Only check concatenation of actual title words, not arbitrary substrings
    const concatenatedTitle = titleWords.join('');
    
    return queryWords.every(queryWord => {
      // Only match if the query word appears at word boundaries in concatenated form
      // or if it's a meaningful prefix of a word (3+ chars)
      return queryWord.length >= 3 && concatenatedTitle.includes(queryWord);
    });
  }

  function flexibleMatch(title, query) {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Extract all words from both title and query
    const titleWords = titleLower.match(/\b\w+\b/g) || [];
    const queryWords = queryLower.match(/\b\w+\b/g) || [];
    
    // If no query words, don't match
    if (queryWords.length === 0) return false;
    
    // Check if all query words are found in the title (order doesn't matter)
    const allWordsMatch = queryWords.every(queryWord => 
      titleWords.some(titleWord => titleWord.includes(queryWord))
    );
    
    if (allWordsMatch) return true;
    
    // Additional fuzzy matching for partial words and concatenated words
    return fuzzyWordMatch(titleWords, queryWords) || 
           concatenatedWordMatch(titleLower, queryWords);
  }

  function fuzzyWordMatch(titleWords, queryWords) {
    // Check if query words can be found as substrings in title words
    // Only allow title words to be substrings of query words if title word is 2+ chars
    return queryWords.every(queryWord => 
      titleWords.some(titleWord => 
        titleWord.includes(queryWord) || 
        (titleWord.length >= 2 && queryWord.includes(titleWord))
      )
    );
  }

  function concatenatedWordMatch(titleText, queryWords) {
    // Handle cases like "PIGDOG", "DOGPIG", "DOGCOWPIG"
    // Remove spaces and check if query words can be found in the concatenated title
    const concatenatedTitle = titleText.replace(/\s+/g, '');
    
    return queryWords.every(queryWord => {
      // Check if the query word appears in the concatenated title
      if (concatenatedTitle.includes(queryWord)) return true;
      
      // Check if the query word can be formed by parts of concatenated words
      // This handles cases like "DO" matching part of "DOG"
      return queryWord.length >= 2 && concatenatedTitle.includes(queryWord);
    });
  }

  function flexibleMatch(title, query) {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Extract all words from both title and query
    const titleWords = titleLower.match(/\b\w+\b/g) || [];
    const queryWords = queryLower.match(/\b\w+\b/g) || [];
    
    // If no query words, don't match
    if (queryWords.length === 0) return false;
    
    // Check if all query words are found in the title (order doesn't matter)
    const allWordsMatch = queryWords.every(queryWord => 
      titleWords.some(titleWord => titleWord.includes(queryWord))
    );
    
    if (allWordsMatch) return true;
    
    // Additional fuzzy matching for partial words and concatenated words
    return fuzzyWordMatch(titleWords, queryWords) || 
           concatenatedWordMatch(titleLower, queryWords);
  }

  function fuzzyWordMatch(titleWords, queryWords) {
    // Check if query words can be found as substrings in title words
    return queryWords.every(queryWord => 
      titleWords.some(titleWord => 
        titleWord.includes(queryWord) || queryWord.includes(titleWord)
      )
    );
  }

  function concatenatedWordMatch(titleText, queryWords) {
    // Handle cases like "PIGDOG", "DOGPIG", "DOGCOWPIG"
    // Remove spaces and check if query words can be found in the concatenated title
    const concatenatedTitle = titleText.replace(/\s+/g, '');
    
    return queryWords.every(queryWord => {
      // Check if the query word appears in the concatenated title
      if (concatenatedTitle.includes(queryWord)) return true;
      
      // Check if the query word can be formed by parts of concatenated words
      // This handles cases like "DO" matching part of "DOG"
      return queryWord.length >= 2 && concatenatedTitle.includes(queryWord);
    });
  }

  function updateSelection() {
    const options = results.querySelectorAll('li[role="option"]');
    options.forEach((option, index) => {
      if (index === currentSelection) {
        option.classList.add('hover');
        input.setAttribute('aria-activedescendant', option.id);
        
        option.scrollIntoView({
          block: 'nearest'
        });
      } else {
        option.classList.remove('hover');
      }
    });
  }
  
  function showSelectedItem(item) {
    results.setAttribute('tabindex', '-1');
    selectedItem = item;
    const cleanedTitle = item.title;
    selectionText.textContent = cleanedTitle;
    selectionDiv.style.display = 'block';
    selectionDiv.focus();
    
    // Create appropriate buttons for this item
    createButtons(item);
    buttonsDiv.style.display = 'flex';
    // radioOptionsDiv.style.display = 'block';
    startAgainBtn.style.display = 'block';
    
    input.value = cleanedTitle;
    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
  }
  
  function copyContent(action) {
    if (!selectedItem) return;
    
    // const formattedTitle = formatTitle(selectedItem.title);
    const formattedTitle = selectedItem.title;
    let content;
    
    switch(action) {
      case 'HTMLspecMarkdown':
        content = `[WhatWG - ${formattedTitle} ${selectedItem.category}](${selectedItem.whatwgUrl})`;
        break;
      case 'HTMLspecHtml':
        content = `<a href="${selectedItem.whatwgUrl}">WhatWG: ${formattedTitle} ${selectedItem.category}</a>`;
        break;
      case 'gotoHTMLspec':
        window.open(selectedItem.whatwgUrl, '_blank');
        return;
      case 'MDNpageMarkdown':
        content = `[MDN - ${formattedTitle} ${selectedItem.category}](${selectedItem.mdnUrl})`;
        break;
      case 'MDNpageHtml':
        content = `<a href="${selectedItem.mdnUrl}">MDN: ${formattedTitle} ${selectedItem.category}</a>`;
        break;
      case 'gotoMDNpage':
        window.open(selectedItem.mdnUrl, '_blank');
        return;
    }
    
    navigator.clipboard.writeText(content).then(() => {
      showNotification('Copied to clipboard!', content);
    }).catch(() => {
      console.log(content);
      showNotification('Could not copy to clipboard', 'Details pasted to console');
    });
  }
  
  // Reset to initial state when new input is entered
  function resetToInitialState() {
    if (selectedItem) {
      selectedItem = null;
      currentSelection = -1;
      selectionDiv.style.display = 'none';
      buttonsDiv.style.display = 'none';
      startAgainBtn.style.display = 'none';
      results.setAttribute('tabindex', '0');
    }
  }
  
  input.oninput = (e) => {
    resetToInitialState();
    performSearch(e.target.value);
  };
  
  // Add focus event listener to select text when input receives focus after a selection
  input.onfocus = (e) => {
    if (selectedItem) {
      // Select all text in the input when returning focus after making a selection
      setTimeout(() => {
        input.select();
      }, 0);
    }
  };
  
  input.onkeydown = (e) => {
    trapFocus(e);
    const options = results.querySelectorAll('li[role="option"]');
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentSelection < options.length - 1) {
          currentSelection++;
          updateSelection();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (currentSelection > 0) {
          currentSelection--;
          updateSelection();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (currentSelection >= 0 && filteredData[currentSelection]) {
          showSelectedItem(filteredData[currentSelection]);
        }
        break;
        
      case 'Escape':
        if (!isFullPage) {
          e.preventDefault();
          closeDialog();
        }
        break;
    }
  };
  
  // Add event listener to the dialog for ESC key handling and number key handling
  dialog.addEventListener('keydown', (e) => {
    trapFocus(e);
    
    // Handle ESC key from anywhere in the dialog
    if (e.key === 'Escape') {
      if (!isFullPage) {
        e.preventDefault();
        closeDialog();
      }
    }
    
    // Handle number keys for button actions when an item is selected
    if (selectedItem && e.key >= '1' && e.key <= '6' && shadowRoot.activeElement !== input) {
      const keyNum = parseInt(e.key);
      const isAttribute = selectedItem.category === 'attribute' || selectedItem.category === 'ARIA attribute';
      
      // For attributes, only allow keys 1-3
      if (isAttribute && keyNum > 3) {
        return; // Ignore keys 4-6 for attributes
      }
      
      e.preventDefault();
      const actions = ['MDNpageMarkdown', 'MDNpageHtml', 'gotoMDNpage', 'HTMLspecMarkdown', 'HTMLspecHtml', 'gotoHTMLspec'];
      copyContent(actions[keyNum - 1]);
    }
  });
  
  // Build the dialog
  dialog.appendChild(title);
  dialog.appendChild(input);
  //dialog.appendChild(hint);
  dialog.appendChild(results);
  dialog.appendChild(selectionDiv);
  dialog.appendChild(buttonsDiv);
  // dialog.appendChild(radioOptionsDiv);
  dialog.appendChild(startAgainBtn);
  startAgainBtn.style.display = 'none';

  if (typeof openInSidebar === 'undefined') {
    dialog.appendChild(closeBtn);
  }
  
  modalBackdrop.appendChild(dialog);
  modalBackdrop.appendChild(notificationPanel);
  
  // Add styles and content to shadow DOM
  shadowRoot.appendChild(shadowStyles);
  shadowRoot.appendChild(modalBackdrop);
  
  // Add shadow host to document
  document.body.appendChild(shadowHost);
  
  input.focus();
  performSearch('');
})();