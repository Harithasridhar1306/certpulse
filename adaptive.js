(function(){
  function boot(){
    if(window.examsReady && typeof window.renderDashboard==="function"){
      if(typeof window.buildCards==="function") window.buildCards();
      window.renderDashboard();
    }
  }
  window.addEventListener("certpulse-ready",boot);
  setTimeout(boot,1200);
})();