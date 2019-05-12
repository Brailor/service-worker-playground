(function Blog() {
  'use strict';

  let offlineIcon;
  let isOnline = 'onLine' in navigator ? navigator.onLine : true;
  let isLoggedIn = /isLoggedIn=1/.test(document.cookie.toString() || '');
  let usingSW = 'serviceWorker' in navigator;
  let swRegistration;
  let svcWorker;

  document.addEventListener('DOMContentLoaded', ready, false);

  initServiceWorker().catch(console.error);

  // **********************************

  function ready() {
    offlineIcon = document.getElementById('connectivity-status');

    if (!isOnline) {
      offlineIcon.classList.remove('hidden');
    }

    window.addEventListener('online', () => {
      offlineIcon.classList.add('hidden');
      isOnline = true;
      sendStatusUdpdate();
    });

    window.addEventListener('offline', () => {
      offlineIcon.classList.remove('hidden');
      isOnline = false;
      sendStatusUdpdate();
    });
  }

  async function initServiceWorker() {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none'
    });

    svcWorker = swRegistration.installing || swRegistration.waiting || swRegistration.active;
    sendStatusUdpdate(svcWorker);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      svcWorker = navigator.serviceWorker.controller;
      sendStatusUdpdate(svcWorker);
    });

    navigator.serviceWorker.addEventListener('message', onSWMessage);
  }

  function onSWMessage(event) {
    let { data } = event;
    if (data.requestStatusUpdate) {
      sendStatusUdpdate(event.ports && event.ports[0]);
    }
  }

  function sendStatusUdpdate(target) {
    console.log(`Recieved status update req from SW, responding... isOnline: ${isOnline}, isLoggedIn: ${isLoggedIn}`);

    sendSWMessage({ statusUpdate: { isOnline, isLoggedIn } }, target);
  }

  function sendSWMessage(msg, target) {
    if (target) {
      target.postMessage(msg);
    } else if (svcWorker) {
      svcWorker.postMessage(msg);
    } else {
      navigator.serviceWorker.controller.postMessage(msg);
    }
  }
})();
