'use strict';

const version = 2;
let isOnline = true;
let isLoggedIn = false;

self.addEventListener('install', onInstall);
self.addEventListener('activate', onActivate);
self.addEventListener('message', onMessage);

main().catch(console.error);

async function onInstall(event) {
  console.log(`Service Worker ${version} is installed.`);
  self.skipWaiting();
}
async function onActivate(event) {
  event.waitUntil(handleActivation());
}

async function main() {
  await sendMessage({ requestStatusUpdate: true });
}

async function handleActivation(params) {
  await clients.claim();
  console.log(`Service Worker ${version} is activated.`);
}

async function sendMessage(msg) {
  let allClients = await clients.matchAll({ includeUncontrolled: true });

  return Promise.all(
    allClients.map(function clientMsg(client) {
      let channel = new MessageChannel();

      channel.port1.onmessage = onMessage;
      return client.postMessage(msg, [channel.port2]);
    })
  );
}

async function onMessage(event) {
  let { data } = event;

  if (data.statusUpdate) {
    ({ isLoggedIn, isOnline } = data.statusUpdate);
    console.log(`SW (v${version}), status update... isOnline: ${isOnline}, isLoggedIn: ${isLoggedIn}`);
  }
}
