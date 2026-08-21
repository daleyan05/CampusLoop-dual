(() => {
  const observerOptions = { childList: true, subtree: true };
  let iconObserver = null;

  const renderIcons = () => {
    if (globalThis.lucide?.createIcons) {
      iconObserver?.disconnect();
      globalThis.lucide.createIcons({
        attrs: { "aria-hidden": "true", focusable: "false" }
      });
      iconObserver?.observe(document.body, observerOptions);
    }
  };

  const observeDynamicIcons = () => {
    iconObserver = new MutationObserver((mutations) => {
      const hasPendingIcon = mutations.some((mutation) => [...mutation.addedNodes].some((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        return node.matches?.("i[data-lucide]") || node.querySelector?.("i[data-lucide]");
      }));
      if (hasPendingIcon) {
        renderIcons();
      }
    });
    renderIcons();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeDynamicIcons, { once: true });
  } else {
    observeDynamicIcons();
  }
})();
