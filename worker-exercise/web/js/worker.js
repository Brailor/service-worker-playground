'use strict';

var curFib = 0;

self.onmessage = onMessage;

function onMessage(event) {
  getNextFib();
}

function getNextFib() {
  let fibNum = fib(curFib);
  self.postMessage({ index: curFib, fib: fibNum });
  curFib++;
  setTimeout(getNextFib, 0);
}

// **********************************

function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}
