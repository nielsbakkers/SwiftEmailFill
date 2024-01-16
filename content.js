browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'performShortcutAction') {
    const domain = message.domain;
    const url = message.url;

    const loadDataListener = (response) => {
      if (response.action === 'loadDataResponse') {
        const data = response.data;

        const emailInput = document.querySelector('input[type="email"]');
        let leadingDict = null;
        const emails = Object.keys(data);

        Object.entries(data).forEach(([userEmail, item]) => {
          const primary = item.primary;
          const suffix = item.suffix;
          const preferredDomains = item.domains;
          const status = item.status;
          const customSuffix = item.customSuffix;

          const email = userEmail.split('@')[0];
          const emailDomain = userEmail.split('@')[1];

          let modifiedEmail = userEmail;
          if (suffix === 'domain') {
            modifiedEmail = email + '+' + domain + '@' + emailDomain;
          } else if (suffix === 'custom') {
            modifiedEmail = email + '+' + customSuffix + '@' + emailDomain;
          }

          
          if (status === 'enabled') {
            if (emails.length === 1) {
              leadingDict = modifiedEmail;
            }
            
            if (
              preferredDomains &&
              preferredDomains.some((domain) => url.includes(domain))
            ) {
              leadingDict = modifiedEmail;
            }

            if (leadingDict === null && primary === 'yes') {
              leadingDict = modifiedEmail;
            }

            if (emailInput && leadingDict !== null) {
              emailInput.value = leadingDict;
              return;
            }
          }
        });
        browser.runtime.onMessage.removeListener(loadDataListener);
      }
    };
    browser.runtime.onMessage.addListener(loadDataListener);
    browser.runtime.sendMessage({ action: 'loadData' });

  }
});