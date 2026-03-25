const { contextBridge } = require('electron');

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
});
