// V12.4.1 — Liquidador solo flotante
// Oculta el bloque viejo del liquidador dentro del cuerpo principal.
// No toca Firebase, sesión, precios ni lógica de venta.

(function hideOldHomeLiquidator() {
  function hideMatchingBlocks() {
    const possibleBlocks = Array.from(document.querySelectorAll("section, article, div, form"));

    possibleBlocks.forEach((el) => {
      const text = (el.innerText || "").toLowerCase();

      const looksLikeOldLiquidator =
        text.includes("hoy hay que sacar esto") ||
        text.includes("liquidar hoy") ||
        text.includes("buscar producto real") ||
        text.includes("cuánto querés bajar");

      const isFloatingModal =
        el.id === "modal-liquidador" ||
        el.closest("#modal-liquidador") ||
        el.id === "fab-liquidador" ||
        el.closest("#fab-liquidador");

      if (looksLikeOldLiquidator && !isFloatingModal) {
        // Buscamos el contenedor visual más probable sin apagar toda la app.
        const card =
          el.closest(".card") ||
          el.closest(".panel") ||
          el.closest(".module-card") ||
          el.closest("section") ||
          el;

        if (card && !card.dataset.keepLiquidator) {
          card.style.display = "none";
          card.setAttribute("data-hidden-by", "V12.4.1-liquidador-solo-flotante");
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", hideMatchingBlocks);
  setTimeout(hideMatchingBlocks, 300);
  setTimeout(hideMatchingBlocks, 1000);

  const observer = new MutationObserver(() => hideMatchingBlocks());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
