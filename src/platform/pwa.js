
// GAME-008C: optional PWA shell; no change to game state or origin storage.
if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&window.isSecureContext){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{/* Browser game remains available without offline support. */})},{once:true});
}
