// public/sw.js

self.addEventListener("install", (event) => {
    console.log("[Service Worker] Instalado");
    self.skipWaiting();
  });
  
  self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activado");
  });
  
  self.addEventListener("fetch", (event) => {
    // Opcional: cachear o interceptar
  });
  