document.addEventListener('DOMContentLoaded', function () {
    let emailInput = document.getElementById('email');
    let customInput = document.getElementById('custom-input');
    let messageDisplay = document.getElementById('message');
    let editForm = document.getElementById('edit-form');
    let closeButton = document.getElementById("close-button");
    let messageDisplayDiv = document.getElementById('message-container');

    closeButton.addEventListener("click", function (event) {
        event.preventDefault();
        window.close();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const emailFillId = urlParams.get('id');

    browser.runtime.sendMessage({ action: 'loadData', id: emailFillId });
    browser.runtime.sendMessage({ action: 'loadCurrentPrimary' });

    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'loadDataEditResponse') {
            emailInput.value = message.email;
            document.querySelector(`input[name="statusOption"][value="${message.data.status}"]`).checked = true;
            document.querySelector(`input[name="suffixOption"][value="${message.data.suffix}"]`).checked = true;
            document.querySelector(`input[name="primaryOption"][value="${message.data.primary}"]`).checked = true;

            if (message.data.suffix === 'custom') {
                customInput.style.display = 'block';
                document.getElementById('custom-suffix').value = message.data.customSuffix;
            }

            document.querySelector('textarea[id="domain-filter"]').value = JSON.stringify(message.data.domains);

            if (message.email && message.data.primary === 'yes') {
                document.getElementById('current-primary').style.display = 'none';
                document.getElementById('current-primary-email').innerHTML = '';
            }
        }
        else if (message.action === 'loadCurrentPrimaryResponse') {
            if (message.data === undefined) {
                document.getElementById('current-primary').style.display = 'none';
                document.getElementById('current-primary-email').innerHTML = '';
            }
            const currentPrimaryEmail = message.data;
            document.getElementById('current-primary-email').innerHTML = currentPrimaryEmail;
        } else if (message.action === 'reloadWindow') {
            browser.runtime.sendMessage({ action: 'loadData', id: emailFillId });
            browser.runtime.sendMessage({ action: 'loadCurrentPrimary' });
        } else if (message.action === 'editDataResponse') {
            messageDisplayDiv.classList.toggle('hidden');
            messageDisplayDiv.classList.toggle('visible');
            if (message.status === 'success') {
                messageDisplay.innerHTML = message.message;
                messageDisplayDiv.classList.add('success')
                closeButton.style.display = 'inline-flex';
                setTimeout(function () {
                    messageDisplay.innerHTML = '';
                    messageDisplayDiv.classList.remove('success')
                    messageDisplayDiv.classList.toggle('hidden');
                    messageDisplayDiv.classList.toggle('visible');
                }, 5000);
            } else if (message.status === 'error') {
                messageDisplay.innerHTML = message.message;
                messageDisplayDiv.classList.add('error')
                setTimeout(function () {
                    messageDisplay.innerHTML = '';
                    messageDisplayDiv.classList.remove('error')
                    messageDisplayDiv.classList.toggle('hidden');
                    messageDisplayDiv.classList.toggle('visible');
                }, 5000);
            }
        }
    });

    document.querySelectorAll('input[name="suffixOption"]').forEach((radioButton) => {
        radioButton.addEventListener('change', function () {
            if (this.value === 'custom') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
            }
        });
    });

    editForm.removeEventListener('submit', handleSubmit);
    editForm.addEventListener('submit', handleSubmit);

    function handleSubmit(event) {
        event.preventDefault();

        let formData = getFormData();

        const loadDataListener = (response) => {
            if (response.action === 'loadDataEditResponse') {
                const status = response.data.status;
                const primary = response.data.primary;
                const suffix = response.data.suffix;
                const domains = response.data.domains;
                const email = response.email;
                const customSuffix = response.data.customSuffix;
                
                messageDisplayDiv.classList.toggle('hidden');
                messageDisplayDiv.classList.toggle('visible');

                if (formData.email !== email || formData.status !== status || formData.primary !== primary || formData.suffix !== suffix || formData.domains !== JSON.stringify(domains) || formData.customSuffix !== customSuffix) {
                    browser.runtime.onMessage.addListener(loadEmailResponseListener);
                    browser.runtime.sendMessage({ action: 'loadEmail' });
                    
                    function loadEmailResponseListener(message) {
                        if (message.action === 'loadEmailResponse') {
                            browser.runtime.sendMessage({ action: 'updateData', data: { "suffix": formData.suffix, "status": formData.status, "primary": formData.primary, "domains": formData.domains, "customSuffix": formData.customSuffix }, id: emailFillId, email: formData.email });
                            messageDisplay.innerHTML = 'Updated successfully';
                            messageDisplayDiv.classList.add('success');
                            setTimeout(function () {
                                messageDisplay.innerHTML = '';
                                messageDisplayDiv.classList.remove('success')
                                messageDisplayDiv.classList.toggle('hidden');
                                messageDisplayDiv.classList.toggle('visible');                
                            }, 5000);
                        }
                        browser.runtime.onMessage.removeListener(loadEmailResponseListener);
                    }
                } else {
                    messageDisplay.innerHTML = 'Nothing changed';
                    messageDisplayDiv.classList.add('error');
                    // messageDisplay.classList.add('message-warning');
                    setTimeout(function () {
                        messageDisplay.innerHTML = '';
                        messageDisplayDiv.classList.remove('error');
                        // messageDisplay.classList.remove('message-warning');
                        messageDisplayDiv.classList.remove('success')
                        messageDisplayDiv.classList.toggle('hidden');
                        messageDisplayDiv.classList.toggle('visible');
        
                    }, 5000);
                }
            }
            browser.runtime.onMessage.removeListener(loadDataListener);
        };

        browser.runtime.onMessage.addListener(loadDataListener);
        browser.runtime.sendMessage({ action: 'loadData', id: emailFillId });
    }
});

function getFormData() {
    let domainFilter = document.getElementById('domain-filter');
    let selectedStatusOption = document.querySelector('input[name="statusOption"]:checked').value;
    let selectedPrimaryOption = document.querySelector('input[name="primaryOption"]:checked').value;
    let selectedSuffixOption = document.querySelector('input[name="suffixOption"]:checked').value;
    let customSuffix = document.getElementById('custom-suffix');
    let inputEmail = document.getElementById('email');

    return { email: inputEmail.value, suffix: selectedSuffixOption, status: selectedStatusOption, primary: selectedPrimaryOption, domains: domainFilter.value, customSuffix: customSuffix.value };
}