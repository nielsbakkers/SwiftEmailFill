document.addEventListener("DOMContentLoaded", function () {
    let addForm = document.getElementById("add-form");
    let closeButton = document.getElementById("close-button");
    let customInput = document.getElementById('custom-input');

    addForm.addEventListener("submit", function (event) {
        event.preventDefault();

        email = document.getElementById("email").value;
        selectedStatusOption = document.querySelector('input[name="statusOption"]:checked').value;
        selectedPrimaryOption = document.querySelector('input[name="primaryOption"]:checked').value;
        emailInput = document.getElementById('email');
        selectedSuffixOption = document.querySelector('input[name="suffixOption"]:checked').value;
        customSuffixInput = document.getElementById('custom-suffix');
        domainFilterInput = document.getElementById('domain-filter');
        messageDisplay = document.getElementById('message');
        messageDisplayDiv = document.getElementById('message-container');
        browser.runtime.sendMessage({ action: 'addNewData', data: { "email": email, "status": selectedStatusOption, "primary": selectedPrimaryOption, "suffix": selectedSuffixOption, "customSuffix": customSuffixInput.value, "domains": domainFilterInput.value } });
    });

    closeButton.addEventListener("click", function (event) {
        event.preventDefault();
        window.close();
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

    browser.runtime.sendMessage({ action: 'loadCurrentPrimary' });

    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'addNewDataResponse') {
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
        } else if (message.action === 'loadCurrentPrimaryResponse') {
            if (message.data === undefined) {
                document.getElementById('current-primary').style.display = 'none';
                document.getElementById('current-primary-email').innerHTML = '';
            }
            const currentPrimaryEmail = message.data;
            document.getElementById('current-primary-email').innerHTML = currentPrimaryEmail;
        }
    });

});