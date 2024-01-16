document.addEventListener("DOMContentLoaded", function () {
    const updateShortcutButton = document.getElementById("update-shortcut");
    const shortcutInput = document.getElementById("shortcut");
    let messageDisplayDiv = document.getElementById('message-container');
    let messageDisplay = document.getElementById('message');
    let closeButton = document.getElementById("close-button");
    let shortcutInputFocused = false;
    let capturedKeystrokes = "";
    var timeoutId;

    function setupTimeout() {
        timeoutId = setTimeout(function () {
            removeMessage();
        }, 5000);
    }

    function removeMessage() {
        messageDisplay.innerHTML = '';
        updateShortcutButton.disabled = false;
        messageDisplayDiv.classList.remove('error');
        messageDisplayDiv.classList.remove('success');
        messageDisplayDiv.classList.toggle('hidden');
        messageDisplayDiv.classList.toggle('visible');
}

    async function setCurrentShortcut() {
        const response = await browser.runtime.sendMessage({ action: 'getShortcut' });
        if (response && (response.shortcut || response.shortcut.length === 0)) {
            if (response.shortcut.length === 0) {
                shortcutInput.placeholder = 'undefined';
            } else {
                shortcutInput.value = response.shortcut;
            }
        }
    }

    setCurrentShortcut();


    closeButton.addEventListener("click", function (event) {
        event.preventDefault();
        window.close();
    });

    updateShortcutButton.addEventListener("click", function (event) {
        event.preventDefault();
        
        if (shortcutInput.value.length > 0) {
            shortcutInput.placeholder = '';
        }
        browser.runtime.sendMessage({ action: 'updateShortcut', shortcut: shortcutInput.value }, (response) => {
            if (response && response.status === false || true && response.message) {
                messageDisplayDiv.classList.toggle('hidden');
                messageDisplayDiv.classList.toggle('visible');
                if (response.status === true) {
                    messageDisplay.innerHTML = response.message;
                    messageDisplayDiv.classList.add('success')
                    updateShortcutButton.disabled = true;

                    if (shortcutInput.value.length === 0) {
                        shortcutInput.placeholder = 'undefined';
                    }

                    setupTimeout();
                } else if (response.status === false) {
                    messageDisplay.innerHTML = response.message;
                    messageDisplayDiv.classList.add('error');
                    updateShortcutButton.disabled = true;
                    setupTimeout();
                }    
            }
        });

    });

    shortcutInput.addEventListener("keydown", function (event) {
        captureKeystrokes(event);
    });

    shortcutInput.addEventListener("focusin", function (event) {
        event.preventDefault();
        
        if(timeoutId) {
            clearTimeout(timeoutId);
            removeMessage();
        }

        if (!shortcutInputFocused) {
            capturedKeystrokes = "";
            shortcutInput.value = "";
            shortcutInputFocused = true;
        }
    });

    shortcutInput.addEventListener("focusout", function (event) {
        event.preventDefault();
        shortcutInputFocused = false;
    });

    function captureKeystrokes(event) {
        let pressedKey = event.key;

        if (pressedKey === "Backspace" || pressedKey === "Delete" || pressedKey === "Escape") {
            capturedKeystrokes = "";
            shortcutInput.value = "";
            return;
        }
        if (pressedKey === "Control") {
            pressedKey = "Ctrl";
        } else if (pressedKey === "Alt" || pressedKey === "Shift" || pressedKey === "Meta") {
            pressedKey = pressedKey;
        } else {
            pressedKey = pressedKey.toUpperCase();
        }

        capturedKeystrokes === "" ? capturedKeystrokes = pressedKey : capturedKeystrokes = capturedKeystrokes + '+' + pressedKey;
        shortcutInput.value = capturedKeystrokes;

        event.preventDefault();
    }
});
