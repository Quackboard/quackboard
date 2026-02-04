(function () {
  'use strict';

  window.QuackBoard = window.QuackBoard || {};

  window.QuackBoard.init = function (config) {
    // 1. Validate Configuration
    if (!config.elementId || !config.producerSlug) {
      console.error("QuackBoard: elementId and producerSlug are required.");
      return;
    }

    const container = document.getElementById(config.elementId);
    if (!container) {
      console.error("QuackBoard: Container element not found: " + config.elementId);
      return;
    }

    // 2. Determine Base URL
    // Use config.baseUrl if provided, otherwise assume current origin (useful for testing)
    // For external embeds, users should provide the full URL to the QuackBoard instance
    const baseUrl = config.baseUrl || window.location.origin;

    // 3. Create Iframe
    const iframe = document.createElement("iframe");
    const producerSlug = encodeURIComponent(config.producerSlug);
    iframe.src = baseUrl + "/embed/" + producerSlug;

    // Iframe styling
    iframe.style.width = "100%";
    iframe.style.height = "520px";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";

    // Clear container and append iframe
    container.innerHTML = "";
    container.appendChild(iframe);
  };
})();
