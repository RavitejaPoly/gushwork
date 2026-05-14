/**
 * Gushwork assignment — vanilla JS only.
 * 1) Sticky contextual bar: appears after scrolling past the hero fold when scrolling down;
 *    hides when scrolling up (per brief). Sits below the primary nav and shows product title, price range, and CTA.
 * 2) Product carousel: prev/next, thumbnails, optional keyboard arrows when focus inside gallery.
 * 3) Zoom preview: main image uses an on-canvas lens; thumbnails use a floating magnified preview.
 */

(function () {
  "use strict";

  /** @type {string[]} Replace indices with distinct export URLs when available from design */
  const SLIDE_SRC = [
    "https://www.figma.com/api/mcp/asset/325f4cda-510b-4e8e-94a5-2cb9e01596e1",
    "https://www.figma.com/api/mcp/asset/325f4cda-510b-4e8e-94a5-2cb9e01596e1",
    "https://www.figma.com/api/mcp/asset/325f4cda-510b-4e8e-94a5-2cb9e01596e1",
    "https://www.figma.com/api/mcp/asset/325f4cda-510b-4e8e-94a5-2cb9e01596e1",
    "https://www.figma.com/api/mcp/asset/325f4cda-510b-4e8e-94a5-2cb9e01596e1",
    "https://www.figma.com/api/mcp/asset/325f4cda-510b-4e8e-94a5-2cb9e01596e1",
  ];

  const ZOOM_SCALE = 2.2;
  const THUMB_PREVIEW_SCALE = 2.4;

  const heroFold = document.getElementById("heroFold");
  const stickyContext = document.getElementById("stickyContext");
  const carouselMainImg = document.getElementById("carouselMainImg");
  const carouselPrev = document.getElementById("carouselPrev");
  const carouselNext = document.getElementById("carouselNext");
  const carouselThumbs = document.getElementById("carouselThumbs");
  const zoomHostMain = document.getElementById("zoomHostMain");
  const zoomLensMain = document.getElementById("zoomLensMain");
  const zoomPreview = document.getElementById("zoomPreview");
  const zoomPreviewInner = document.getElementById("zoomPreviewInner");

  let lastScrollY = window.scrollY;
  let ticking = false;
  let currentIndex = 0;

  function heroFoldBottomY() {
    if (!heroFold) return 0;
    const r = heroFold.getBoundingClientRect();
    return r.bottom + window.scrollY;
  }

  /** True once the user has scrolled past the hero section (first fold), independent of sticky bar state */
  function isPastHeroFold() {
    const bottom = heroFoldBottomY();
    return window.scrollY >= bottom - window.innerHeight + 120;
  }

  function setStickyVisible(on) {
    if (!stickyContext) return;
    stickyContext.classList.toggle("is-visible", on);
    document.body.classList.toggle("has-sticky-context", on);
    if (on) {
      stickyContext.removeAttribute("hidden");
    } else {
      stickyContext.setAttribute("hidden", "");
    }
    stickyContext.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function onScroll() {
    if (!heroFold || !stickyContext) return;
    const y = window.scrollY;
    const delta = y - lastScrollY;
    lastScrollY = y;

    const past = isPastHeroFold();

    if (!past) {
      setStickyVisible(false);
      return;
    }

    if (delta > 4) {
      setStickyVisible(true);
    } else if (delta < -4) {
      setStickyVisible(false);
    }
  }

  function requestScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      ticking = false;
    });
  }

  function setSlide(index) {
    const max = SLIDE_SRC.length - 1;
    currentIndex = ((index % (max + 1)) + (max + 1)) % (max + 1);
    if (carouselMainImg) {
      carouselMainImg.src = SLIDE_SRC[currentIndex];
      carouselMainImg.alt = "Product image " + (currentIndex + 1);
    }
    if (carouselThumbs) {
      carouselThumbs.querySelectorAll(".hero-gallery__thumb").forEach(function (btn, i) {
        const active = i === currentIndex;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-current", active ? "true" : "false");
      });
    }
  }

  if (carouselPrev) {
    carouselPrev.addEventListener("click", function () {
      setSlide(currentIndex - 1);
    });
  }
  if (carouselNext) {
    carouselNext.addEventListener("click", function () {
      setSlide(currentIndex + 1);
    });
  }

  if (carouselThumbs) {
    carouselThumbs.addEventListener("click", function (e) {
      const btn = e.target.closest(".hero-gallery__thumb");
      if (!btn) return;
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (!Number.isNaN(idx)) setSlide(idx);
    });
  }

  /* --- Main stage: lens zoom (Figma-style hover magnifier) --- */
  function setupMainZoom() {
    if (!zoomHostMain || !zoomLensMain || !carouselMainImg) return;

    zoomHostMain.addEventListener("mousemove", function (e) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = zoomHostMain.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const url = carouselMainImg.currentSrc || carouselMainImg.src;
      const lensW = zoomLensMain.offsetWidth || 140;
      const lensH = zoomLensMain.offsetHeight || 140;
      const lensX = Math.min(Math.max(x - lensW / 2, 0), rect.width - lensW);
      const lensY = Math.min(Math.max(y - lensH / 2, 0), rect.height - lensH);

      zoomLensMain.style.left = lensX + "px";
      zoomLensMain.style.top = lensY + "px";
      zoomLensMain.style.backgroundImage = "url('" + url + "')";
      zoomLensMain.style.backgroundSize = rect.width * ZOOM_SCALE + "px " + rect.height * ZOOM_SCALE + "px";
      zoomLensMain.style.backgroundPosition =
        -lensX * ZOOM_SCALE + "px " + -lensY * ZOOM_SCALE + "px";

      zoomHostMain.classList.add("is-zooming");
    });

    zoomHostMain.addEventListener("mouseleave", function () {
      zoomHostMain.classList.remove("is-zooming");
    });
  }

  /* --- Thumbnails: floating preview near cursor --- */
  function positionPreview(clientX, clientY) {
    if (!zoomPreview) return;
    const margin = 16;
    const w = zoomPreview.offsetWidth || 220;
    const h = zoomPreview.offsetHeight || 220;
    let left = clientX + margin;
    let top = clientY + margin;
    if (left + w > window.innerWidth - margin) left = clientX - w - margin;
    if (top + h > window.innerHeight - margin) top = clientY - h - margin;
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));
    zoomPreview.style.left = left + "px";
    zoomPreview.style.top = top + "px";
  }

  function setupThumbZoom() {
    if (!carouselThumbs || !zoomPreview || !zoomPreviewInner) return;

    carouselThumbs.addEventListener("mousemove", function (e) {
      const btn = e.target.closest(".hero-gallery__thumb");
      if (!btn) return;
      const img = btn.querySelector("img");
      if (!img) return;
      const url = img.currentSrc || img.src;
      zoomPreviewInner.style.backgroundImage = "url('" + url + "')";
      zoomPreviewInner.style.backgroundSize = THUMB_PREVIEW_SCALE * 100 + "%";
      const rect = btn.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      zoomPreviewInner.style.backgroundPosition = px + "% " + py + "%";
      positionPreview(e.clientX, e.clientY);
      zoomPreview.classList.add("is-on");
      zoomPreview.removeAttribute("hidden");
      zoomPreview.setAttribute("aria-hidden", "false");
    });

    carouselThumbs.addEventListener("mouseleave", function () {
      zoomPreview.classList.remove("is-on");
      zoomPreview.setAttribute("hidden", "");
      zoomPreview.setAttribute("aria-hidden", "true");
    });
  }

  /* Keyboard: Left/Right when focus is inside gallery */
  const heroGallery = document.getElementById("heroGallery");
  if (heroGallery) {
    heroGallery.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSlide(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSlide(currentIndex + 1);
      }
    });
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  lastScrollY = window.scrollY;
  requestScroll();

  setupMainZoom();
  setupThumbZoom();
  setSlide(0);

  /* --- Mobile navigation drawer --- */
  const navBurger = document.getElementById("navBurger");
  const navDrawer = document.getElementById("navDrawer");
  const navBackdrop = document.getElementById("navBackdrop");
  const navClose = document.getElementById("navClose");

  function setNavOpen(open) {
    if (!navDrawer || !navBackdrop || !navBurger) return;
    navDrawer.classList.toggle("is-open", open);
    navBackdrop.classList.toggle("is-open", open);
    navBurger.setAttribute("aria-expanded", open ? "true" : "false");
    navDrawer.toggleAttribute("hidden", !open);
    navBackdrop.toggleAttribute("hidden", !open);
    document.body.classList.toggle("nav-open", open);
    if (open) {
      navClose && navClose.focus();
    }
  }

  if (navBurger) {
    navBurger.addEventListener("click", function () {
      setNavOpen(!navDrawer.classList.contains("is-open"));
    });
  }
  if (navClose) {
    navClose.addEventListener("click", function () {
      setNavOpen(false);
    });
  }
  if (navBackdrop) {
    navBackdrop.addEventListener("click", function () {
      setNavOpen(false);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && navDrawer && navDrawer.classList.contains("is-open")) {
      setNavOpen(false);
      navBurger && navBurger.focus();
    }
  });
  if (navDrawer) {
    navDrawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setNavOpen(false);
      });
    });
  }

  /* --- FAQ accordion --- */
  const faqList = document.getElementById("faqList");
  if (faqList) {
    faqList.addEventListener("click", function (e) {
      const btn = e.target.closest(".faq-item__trigger");
      if (!btn) return;
      const item = btn.closest(".faq-item");
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      const isOpen = item.classList.contains("is-open");
      faqList.querySelectorAll(".faq-item").forEach(function (other) {
        if (other === item) return;
        other.classList.remove("is-open");
        const b = other.querySelector(".faq-item__trigger");
        const p = b && document.getElementById(b.getAttribute("aria-controls"));
        if (b) b.setAttribute("aria-expanded", "false");
        if (p) p.setAttribute("hidden", "");
      });
      item.classList.toggle("is-open", !isOpen);
      btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      if (panel) {
        if (!isOpen) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      }
    });
  }

  function wireHScroll(prevId, nextId, scrollId, delta) {
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);
    const el = document.getElementById(scrollId);
    if (!el) return;
    const step = delta || Math.min(480, el.clientWidth * 0.85);
    if (prev) prev.addEventListener("click", function () { el.scrollBy({ left: -step, behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { el.scrollBy({ left: step, behavior: "smooth" }); });
  }

  wireHScroll("industriesPrev", "industriesNext", "industriesScroll");
  wireHScroll("testiPrev", "testiNext", "testiScroll");

  const catalogForm = document.getElementById("catalogForm");
  const modalTechnicalSheet = document.getElementById("modalTechnicalSheet");
  const datasheetModalForm = document.getElementById("datasheetModalForm");
  const openTechnicalSheetModalBtn = document.getElementById("openTechnicalSheetModalBtn");
  const modalCallback = document.getElementById("modalCallback");
  const modalCallbackForm = document.getElementById("modalCallbackForm");
  const requestQuoteBtn = document.getElementById("requestQuoteBtn");

  let activeModal = null;
  let modalReturnFocus = null;

  function openModal(modalEl, returnFocusEl) {
    if (!modalEl) return;
    modalReturnFocus = returnFocusEl || document.activeElement;
    activeModal = modalEl;
    modalEl.removeAttribute("hidden");
    document.body.classList.add("modal-open");
    var toFocus = modalEl.querySelector(".modal__close") || modalEl.querySelector("input, button");
    if (toFocus) toFocus.focus();
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.setAttribute("hidden", "");
    document.body.classList.remove("modal-open");
    activeModal = null;
    if (modalEl === modalCallback && modalCallbackForm) {
      modalCallbackForm.reset();
    }
    if (modalEl === modalTechnicalSheet && datasheetModalForm) {
      datasheetModalForm.reset();
    }
    if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
      try {
        modalReturnFocus.focus();
      } catch (_) {}
    }
    modalReturnFocus = null;
  }

  function wireModal(modalEl) {
    if (!modalEl) return;
    modalEl.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("[data-modal-close]")) {
        e.preventDefault();
        closeModal(modalEl);
      }
    });
  }

  wireModal(modalTechnicalSheet);
  wireModal(modalCallback);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !activeModal) return;
    closeModal(activeModal);
  });

  if (catalogForm) {
    catalogForm.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  if (openTechnicalSheetModalBtn && modalTechnicalSheet) {
    openTechnicalSheetModalBtn.addEventListener("click", function () {
      openModal(modalTechnicalSheet, openTechnicalSheetModalBtn);
    });
  }

  if (datasheetModalForm && modalTechnicalSheet) {
    datasheetModalForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!datasheetModalForm.reportValidity()) return;
      closeModal(modalTechnicalSheet);
    });
  }

  if (requestQuoteBtn && modalCallback) {
    requestQuoteBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal(modalCallback, requestQuoteBtn);
    });
  }

  if (modalCallbackForm) {
    modalCallbackForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!modalCallbackForm.reportValidity()) return;
      closeModal(modalCallback);
    });
  }

  const leadForm = document.getElementById("leadForm");
  if (leadForm) {
    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }
})();
