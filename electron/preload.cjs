/**
 * Brücke zwischen Spiel und Desktop: genau drei synchrone Speicher-Funktionen, sonst nichts.
 * Synchron, weil die Storage-Schicht des Spiels (wie localStorage) synchron arbeitet.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chronokroneDesktop', {
  get: (key) => ipcRenderer.sendSync('save:get', key),
  set: (key, value) => ipcRenderer.sendSync('save:set', key, value),
  remove: (key) => ipcRenderer.sendSync('save:remove', key),
});
