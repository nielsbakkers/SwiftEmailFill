browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({ 'state': 'on' });
  browser.storage.local.set({ 'data': {} });
  createMenu();
});

async function createMenu() {
  const currentState = await browser.storage.local.get('state');
  const filteredSVG = await generateFilteredSVG(currentState.state);

  const encodedSVG = encodeURIComponent(filteredSVG);
  const dataURL = `data:image/svg+xml,${encodedSVG}`;

  browser.contextMenus.create({
    id: "fill-email",
    title: "SwitchEmailFill",
    contexts: ["all"]
  });

  browser.menus.create({
    id: "fill-email-status",
    parentId: "fill-email",
    title: "Status",
    contexts: ["all"],
    icons: {
      "16": dataURL,
      "32": dataURL,
      "48": dataURL,
      "64": dataURL,
      "128": dataURL
    }
  });

  if (currentState.state === 'on') {

    browser.menus.create({
      id: "fill-email-fill",
      parentId: "fill-email",
      title: "Fill Email",
      contexts: ["all"],
      icons: {
        "16": "images/icon.png",
        "32": "images/icon.png",
        "48": "images/icon.png",
        "64": "images/icon.png",
        "128": "images/icon.png"
      }
    });
  }
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "fill-email":
    case "fill-email-status":
      browser.storage.local.get('state').then((currentState) => {
        const newState = currentState.state === 'on' ? 'off' : 'on';
        browser.storage.local.set({ 'state': newState });
        removeMenu();
        createMenu();
      });
      break;
    case "fill-email-fill":
      browser.storage.local.get('state').then((currentState) => {
        if (currentState.state === 'on') {
          browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const domain = extractDomain(activeTab.url);
            if (activeTab && activeTab.url) {
              browser.tabs.sendMessage(activeTab.id, { action: 'performShortcutAction', domain: domain, url: activeTab.url })
                .catch(error => { // Do nothing with the error 
                });
            }
          });
        }

      });
      break;
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updatePowerState') {
    browser.storage.local.set({ state: message.state });
    removeMenu();
    createMenu();
  }
  else if (message.action === 'getState') {
    browser.storage.local.get('state').then(result => {
      sendResponse({ state: result.state });
    }).catch(error => {
      console.error('Error retrieving state:', error);
    });
    return true;
  } else if (message.action === 'addNewData') {
    inputValidation(message.data) === true ? saveData(message.data) : browser.runtime.sendMessage({ action: 'addNewDataResponse', status: 'error', message: inputValidation(message.data) });
  } else if (message.action === 'loadData') {
    loadData(message.action, sender, id = message.id || null)
  } else if (message.action === 'updateData') {
    inputValidation(message.data, message.email) === true ? updateData(message.data, message.id, message.email) : browser.runtime.sendMessage({ action: 'editDataResponse', status: 'error', message: inputValidation(message.data) });
  } else if (message.action === 'loadEmail') {
    loadData(message.action)
  } else if (message.action === 'deleteEmail') {
    deleteEmail(message.id)
  } else if (message.action === 'toggleStatus') {
    toggleStatus(message.id);
  } else if (message.action === 'loadCurrentPrimary') {
    loadData(message.action, sender)
  } else if (message.action === 'updateShortcut') {
    updateShortcut(message.shortcut).then(([status, message]) => {
      sendResponse({ status: status, message: message });
    });
    return true;
  } else if (message.action === 'getShortcut') {
    getCurrentShortcut().then((shortcut) => {
      sendResponse({ shortcut: shortcut });
    });
    return true;
  }
});

browser.commands.onCommand.addListener((command) => {
  if (command === 'fillEmailShortcut') {
    browser.storage.local.get('state').then(result => {
      if (result.state === 'on') {
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          const domain = extractDomain(activeTab.url);
          if (activeTab && activeTab.url) {
            browser.tabs.sendMessage(activeTab.id, { action: 'performShortcutAction', domain: domain, url: activeTab.url })
              .catch(error => { // Do nothing with the error 
              });
          }
        });
      }
    });
  }
});

function saveData(data) {
  browser.storage.local.get('data').then((result) => {
    dataDict = result.data || {};

    if (dataDict.hasOwnProperty(data.email)) {
      browser.runtime.sendMessage({ action: 'addNewDataResponse', status: 'error', message: 'This email address already exsits...' });
    } else {
      const primaryEmail = Object.keys(dataDict).filter((email) => {
        if (dataDict[email].primary === 'yes') return email;
      });

      if (data.primary === 'yes' && primaryEmail[0]) {
        dataDict[primaryEmail[0]].primary = 'no';
      }

      dataDict[data.email] = { "suffix": data.suffix, "status": data.status, "primary": data.primary, "domains": data.domains, "customSuffix": data.customSuffix };
      browser.storage.local.set({ 'data': dataDict });

      browser.runtime.sendMessage({ action: 'addNewDataResponse', status: 'success', message: 'Email address successfully added...' });
    }
  }).catch((error) => {
    console.error('Error retrieving data:', error);
  });
}

function loadData(action, sender = null, id) {
  browser.storage.local.get('data').then((result) => {
    var data = result.data || {};
    const email = Object.keys(result.data);

    if (id != null) {
      data = data[Object.keys(data)[id]];
      browser.runtime.sendMessage({ action: 'loadDataEditResponse', data: data, email: email[id] });
    } else if (action === 'loadEmail') {
      browser.runtime.sendMessage({ action: 'loadEmailResponse', data: email });
    } else if (action === 'loadCurrentPrimary') {
      const primaryEmail = email.filter((email) => {
        if (data[email].primary === 'yes') return email;
      });
      browser.runtime.sendMessage({ action: 'loadCurrentPrimaryResponse', data: primaryEmail[0] });
    } else {
      if (sender.tab) {
        browser.tabs.sendMessage(sender.tab.id, { action: 'loadDataResponse', data: data });
      } else {
        browser.runtime.sendMessage({ action: 'loadDataResponse', data: data });
      }
    }
  }).catch((error) => {
    console.error('Error retrieving data:', error);
  });
}

function updateData(data, id, email) {
  browser.storage.local.get('data').then((result) => {
    let dataDict = result.data || {};
    const emails = Object.keys(result.data);
    const emailToUpdate = emails[id];
    const primaryEmail = emails.filter((email) => {
      if (dataDict[email].primary === 'yes') return email;
    });

    if (emailToUpdate !== email) {
      dataDict = Object.fromEntries(
        Object.entries(dataDict).map(([key, value]) =>
          key === emailToUpdate ? [email, value] : [key, value]
        )
      );
      dataDict[email] = data;
    } else {
      dataDict[email] = data;
    }
    if (data.suffix != 'custom') {
      dataDict[email].customSuffix = '';
    }
    if (data.primary === 'yes' && primaryEmail[0] && primaryEmail[0] !== email && primaryEmail[0] !== emailToUpdate) {
      dataDict[primaryEmail[0]].primary = 'no';
    }
    browser.storage.local.set({ 'data': dataDict });
    browser.runtime.sendMessage({ action: 'reloadWindow' });
  }).catch((error) => {
    console.error('Error retrieving data:', error);
  });
}

function deleteEmail(id) {
  browser.storage.local.get('data').then((result) => {
    const data = result.data || {};
    const email = Object.keys(result.data);
    const emailToRemove = email[id];
    delete data[emailToRemove];
    browser.storage.local.set({ 'data': data });
    browser.runtime.sendMessage({ action: 'reloadWindow' });
  }).catch((error) => {
    console.error('Error retrieving data:', error);
  });
}

function toggleStatus(id) {
  browser.storage.local.get('data').then((result) => {
    const data = result.data || {};
    const email = Object.keys(result.data);
    const emailToToggle = email[id];
    const primary = data[emailToToggle].primary;
    if (primary === 'no') {
      if (data[emailToToggle].status === 'enabled') {
        data[emailToToggle].status = 'disabled';
      } else {
        data[emailToToggle].status = 'enabled';
      }
      browser.storage.local.set({ 'data': data });
      browser.runtime.sendMessage({ action: 'reloadWindow', statusToggle: true });
    }
  }).catch((error) => {
    console.error('Error retrieving data:', error);
  });
}

async function updateShortcut(newShortcut) {
  if (newShortcut.indexOf("Control") !== -1) {
    newShortcut = await newShortcut.replace('Control', 'Ctrl');
  }

  let currentShortcut = await getCurrentShortcut();

  if (currentShortcut === newShortcut || (currentShortcut.length === 0 && newShortcut.length === 0)) {
    if (currentShortcut.length === 0) {
      return [false, 'Shortcut is already disabled'];
    } else {
      return [false, 'Shortcut is already set to ' + newShortcut];
    }
  } else if (newShortcut.length === 0) {
    await browser.commands.update({
      name: "fillEmailShortcut",
      shortcut: '',
    });
    return [true, 'Shortcut has been disabled'];
  } else {
    await browser.commands.update({
      name: "fillEmailShortcut",
      shortcut: newShortcut,
    });
    return [true, 'Shortcut succesfully updated'];
  }
}

async function getCurrentShortcut() {
  let commands = await browser.commands.getAll();
  for (let command of commands) {
    if (command.name === 'fillEmailShortcut') {
      return command.shortcut;
    }
  }
}

function inputValidation(data, email = false) {
  const domainRegex = /^(?:(?:\*\.)?(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,})$/;
  const specialCharacters = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  const emailRegex = /^[^\s@]@[^\s@]+\.[^\s@]+$/;

  if (email) {
    data.email = email;
  }

  if (data.email.length === 0 || emailRegex.test(data.email)) {
    return 'Please provide a valid email address....';
  } else if (data.status !== 'enabled' && data.status !== 'disabled') {
    return 'Please set a valid status....';
  } else if (data.primary !== 'yes' && data.primary !== 'no') {
    return 'Please set a valid primary....';
  } else if (data.suffix !== 'domain' && data.suffix !== 'custom' && data.suffix !== 'none') {
    return 'Please select a valid suffix option....';
  } else if (data.domains.length === 0) {
    data.domains = [];
    return true;
  } else if (data.domains.length !== 0 && isListFormat(data.domains) === false) {
    return 'Please provide a valid domain filter....';
  } else if (data.domains.length !== 0 && isListFormat(data.domains) === true && (JSON.parse(data.domains)).every(domain => domainRegex.test(domain)) === false) {
    return 'Please make sure that all domains provided are valid....';
  } else if (data.suffix === 'custom' && data.customSuffix.length === 0) {
    return 'Please provide a custom suffix....';
  } else {
    data.domains = JSON.parse(data.domains);
    return true;
  }
}

function extractDomain(url) {
  const match = url.match(/^(?:https?:\/\/)?(?:[^:/?#]+\.)?([^:/?#]+)\.[^:/?#]+/i);
  return match && match[1];
}

const isListFormat = str => {
  try {
    return Array.isArray(JSON.parse(str));
  } catch (e) {
    return false;
  }
};

async function generateFilteredSVG(state) {
  const filter = state === 'on' ? 'invert(15%) sepia(92%) saturate(4625%) hue-rotate(94deg) brightness(90%) contrast(82%)' : 'invert(6%) sepia(99%) saturate(5882%) hue-rotate(1deg) brightness(106%) contrast(107%)';

  const response = await fetch('images/power.svg');
  let svgContent = await response.text();

  svgContent = svgContent.replace('<svg', `<svg style="filter: ${filter};"`);

  return svgContent;
}

async function removeMenu() {
  browser.menus.removeAll();
}