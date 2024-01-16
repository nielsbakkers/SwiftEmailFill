document.addEventListener("DOMContentLoaded", function () {
  const powerFlag = document.getElementById("powerFlag");
  const addButton = document.getElementById("add");
  const globalOptionsButton = document.getElementById("global-options");
  const aboutButton = document.getElementById("about");
  const emailUl = document.getElementById("email-list");
  const headerContainer = document.getElementsByClassName("header-container")[0];
  const parentContainer = document.getElementById("email-list");

  parentContainer.addEventListener("click", function (event) {
    const clickedElement = event.target;
    if (event.target.tagName === "IMG" && event.target.classList.contains("trash-icon")) {
      const parentLi = clickedElement.closest("li");

      if (parentLi) {
        const parentId = parentLi.id;
        browser.runtime.sendMessage({ action: 'deleteEmail', id: parentId });
      }
    }
    if (event.target.tagName === "IMG" && event.target.classList.contains("power-icon")) {
      const parentLi = clickedElement.closest("li");

      if (parentLi) {
        const parentId = parentLi.id;
        browser.runtime.sendMessage({ action: 'toggleStatus', id: parentId });
      }
    }
    if (event.target.tagName === "LI" && event.target.id || event.target.tagName === "SPAN" && event.target.parentElement.id) {
      const id = event.target.id || event.target.parentElement.id;
      openWindow(`../pages/edit/edit.html?id=${id}`, 580, 645);
    }

  });

  addButton.addEventListener("click", function () {
    openWindow('../pages/add/add.html', 580, 645);
  });

  globalOptionsButton.addEventListener("click", function () {
    openWindow('../pages/options/options.html', 580, 645);
  });

  aboutButton.addEventListener("click", function () {
    browser.tabs.create({ url: "https://github.com/nielsbakkers/SwiftEmailFill"});
  });

  powerFlag.addEventListener('click', function () {
    togglePower();
  });

  browser.runtime.sendMessage({ action: 'getState' }, (response) => {

    const flag = document.getElementById('powerFlag');
    const flagText = document.getElementById('flag-text');

    if (response && response.state === 'off') {
      flag.classList.toggle('power-on');
      flag.classList.toggle('power-off');
      flagText.innerText = 'OFF';
      flagText.classList.toggle('power-off');
      flagText.classList.toggle('power-on');
    } else if (response && response.state === 'on') {
      flagText.innerText = 'ON';
    }

  });

  browser.runtime.sendMessage({ action: 'loadData' });

  browser.runtime.onMessage.addListener((message) => {

    if (message.action === 'loadDataResponse') {
      const data = message.data;
      const emails = Object.keys(data);

      if (emails.length > 4) {
        headerContainer.style.marginBottom = "0px";

        var searchDiv = document.createElement("div");
        var searchElement = document.createElement("span");
        var searchImg = document.createElement("img");
        var searchInput = document.createElement("input");

        searchImg.src = "../images/search.svg";
        searchImg.height = "32";
        searchElement.appendChild(searchImg);
        searchDiv.appendChild(searchElement);
        searchDiv.appendChild(searchInput);
        searchInput.id = "filter-input";
        searchInput.type = "text";
        searchInput.placeholder = "Search Profiles";
        searchDiv.classList.add("search-container");


        searchInput.addEventListener('keydown', () => {

          var filterText = this.value.toLowerCase();
          var listItems = document.getElementById('email-list').getElementsByTagName('li');

          for (var i = 0; i < listItems.length; i++) {
            var listItemText = listItems[i].textContent.toLowerCase();

            if (listItemText.includes(filterText)) {
              listItems[i].style.display = 'flex';
            } else {
              listItems[i].style.display = 'none';
            }
          }
        });

        emailUl.parentNode.insertBefore(searchDiv, emailUl);
      }

      if (emails.length === 0) {
        var newDiv = document.createElement("div");
        var newSpan = document.createElement("span");

        newDiv.classList.add("no-profiles");
        newSpan.textContent = "NO PROFILES FOUND...";

        newDiv.appendChild(newSpan);
        emailUl.appendChild(newDiv);
      } else {
        emails.forEach((email, index) => {
          var newListItem = document.createElement("li");
          var newSpan = document.createElement("span");
          var newDiv = document.createElement("div");
          var newIMG1span = document.createElement("span");
          var newIMG1 = document.createElement("img");
          var newIMG2span = document.createElement("span");
          var newIMG2 = document.createElement("img");

          newSpan.textContent = email;
          newIMG1.src = "../images/power.svg";
          newIMG1.classList.add("power-icon");

          if (data[email].status === 'enabled') {
            newIMG1span.classList.add('power-on');
          } else if (data[email].status === 'disabled') {
            newIMG1span.classList.add('power-off');
          }

          if (data[email].primary === 'yes') {
            newIMG1.title = "You cannot disable a primary profile";
            var newIMG3span = document.createElement("span");
            var newIMG3 = document.createElement("img");
            newIMG3span.classList.add("primary");
            newIMG3.src = "../images/star.svg";
            newIMG3span.appendChild(newIMG3);
            newIMG3.title = "Primary Email";
            newDiv.appendChild(newIMG3span);
          } else {
            newIMG1.title = "Toggle Status";
          }

          newIMG2span.classList.add("trash-icon");
          newIMG2.title = "Delete Profile";
          newIMG2.src = "../images/trash.svg";
          newIMG2.classList.add("trash-icon");
          newIMG1span.appendChild(newIMG1);
          newIMG2span.appendChild(newIMG2);
          newDiv.appendChild(newIMG1span);
          newDiv.appendChild(newIMG2span);
          newDiv.classList.add("option-container");
          newSpan.classList.add("ellipsis-span");
          newListItem.id = index;
          newListItem.appendChild(newSpan);
          newListItem.appendChild(newDiv);
          emailUl.appendChild(newListItem);
        });
      }
    } else if (message.action === 'reloadWindow') {
      window.location.reload();
    }
  });

  function openWindow(relativePath, width, height) {
    browser.windows.getAll({ populate: true, windowTypes: ["popup"] }).then((windows) => {
      const popupWindow = windows.find(window => window.tabs.length > 0 && window.tabs[0].url.includes(relativePath));

      if (popupWindow) {
        browser.windows.update(popupWindow.id, { focused: true });
      } else {
        browser.windows.create({
          url: browser.extension.getURL(relativePath),
          type: 'popup',
          width: width,
          height: height,
        });
      }
    });
  }

  function togglePower() {
    const flag = document.getElementById('powerFlag');
    const flagText = document.getElementById('flag-text');
    const currentState = flag.classList.contains('power-on') ? 'on' : 'off';

    flag.classList.toggle('power-on');
    flag.classList.toggle('power-off');

    if (flag.classList.contains('power-on')) {
      flagText.innerText = 'ON';
    } else if (flag.classList.contains('power-off')) {
      flagText.innerText = 'OFF';
    }

    browser.runtime.sendMessage({ action: 'updatePowerState', state: currentState })
  }
});
