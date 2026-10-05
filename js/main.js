(() => {
  'use strict';

  /* ---------- Fullscreen Hero Background 3D Video Playback Engine ---------- */
  const heroBgVideo = document.getElementById('heroBgVideo');
  if (heroBgVideo) {
    // 1.0x native smooth playback rate (eliminates frame-drop stutter)
    heroBgVideo.playbackRate = 1.0;
    heroBgVideo.defaultPlaybackRate = 1.0;
    heroBgVideo.muted = true;
    heroBgVideo.defaultMuted = true;
    heroBgVideo.playsInline = true;
    heroBgVideo.loop = true;
    heroBgVideo.setAttribute('playsinline', '');
    heroBgVideo.setAttribute('webkit-playsinline', '');
    heroBgVideo.setAttribute('loop', '');
    heroBgVideo.setAttribute('autoplay', '');
    heroBgVideo.setAttribute('muted', '');

    const playVideo = () => {
      heroBgVideo.playbackRate = 1.0;
      if (heroBgVideo.paused) {
        const playPromise = heroBgVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            heroBgVideo.muted = true;
            heroBgVideo.play().catch(() => {});
          });
        }
      }
    };

    heroBgVideo.addEventListener('loadedmetadata', playVideo);
    heroBgVideo.addEventListener('canplay', playVideo);
    heroBgVideo.addEventListener('ended', playVideo);

    // Never stop or pause the video during scroll, touch, or gestures
    heroBgVideo.addEventListener('pause', () => {
      if (!document.hidden) {
        playVideo();
      }
    });

    playVideo();

    // Auto-resume playback smoothly if user switches tabs and returns
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && heroBgVideo.paused) {
        playVideo();
      }
    });

    // Keep video continuously playing across scroll, touch, touchpad, and icon clicks
    const keepVideoPlaying = () => {
      if (heroBgVideo.paused && !document.hidden) {
        playVideo();
      }
    };
    window.addEventListener('scroll', keepVideoPlaying, { passive: true });
    window.addEventListener('wheel', keepVideoPlaying, { passive: true });
    window.addEventListener('touchmove', keepVideoPlaying, { passive: true });
    window.addEventListener('touchstart', keepVideoPlaying, { passive: true });
    window.addEventListener('pointerdown', keepVideoPlaying, { passive: true });

    // Fallback play trigger on first user interaction if browser blocked initial autoplay
    const unlockPlay = () => {
      playVideo();
      window.removeEventListener('pointerdown', unlockPlay);
      window.removeEventListener('scroll', unlockPlay);
      window.removeEventListener('touchstart', unlockPlay);
    };
    window.addEventListener('pointerdown', unlockPlay, { passive: true, once: true });
    window.addEventListener('scroll', unlockPlay, { passive: true, once: true });
    window.addEventListener('touchstart', unlockPlay, { passive: true, once: true });
  }

  /* =========================================================
     2. SINGLE-PAGE SCROLLSPY & SMOOTH NAVIGATION
     ========================================================= */
  const nav = document.getElementById('siteNav');
  const navSectionIds = ['top', 'work', 'services', 'process', 'contact'];
  let isSmoothScrolling = false;
  let scrollTimeout = null;

  // Header background style on scroll (for mobile nav)
  function updateNavStyle() {
    if (!nav) return;
    if (window.scrollY > 35) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', updateNavStyle, { passive: true });
  updateNavStyle();

  // Helper to activate link across side-nav, mobile menu, and header
  function setActiveSection(currentId) {
    if (!currentId) return;

    // 1. Update circular side-nav links
    const sideNavLinks = document.querySelectorAll('.side-nav__link');
    sideNavLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const targetId = href.replace(/^.*#/, '');
      const isTarget = (targetId === currentId) || (currentId === 'top' && (targetId === 'top' || targetId === ''));
      if (isTarget) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    // 2. Update mobile slide-out drawer links
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    mobileLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const targetId = href.replace(/^.*#/, '');
      const isTarget = (targetId === currentId) || (currentId === 'top' && (targetId === 'top' || targetId === ''));
      if (isTarget) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  // Scroll-Linked 100 Logo Zoom Dynamics (Section-Specific Scaling Across Full Page)
  let navScrollTicking = false;
  let targetLogoScale = 1.0;
  let currentLogoScale = 1.0;
  let logoZoomAnimId = null;

  const navSectionScales = [
    { id: 'top', scale: 0.95 },
    { id: 'work', scale: 1.05 },
    { id: 'services', scale: 1.15 },
    { id: 'process', scale: 1.25 },
    { id: 'contact', scale: 1.30 }
  ];

  let cachedSectionOffsets = [];
  function refreshSectionOffsets() {
    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const sy = window.scrollY || window.pageYOffset || 0;
    cachedSectionOffsets = navSectionScales.map((item, i) => {
      let top = 0;
      if (item.id === 'top') {
        top = 0;
      } else if (item.id === 'contact') {
        top = docHeight;
      } else {
        const el = document.getElementById(item.id);
        if (el) {
          top = Math.max(0, el.getBoundingClientRect().top + sy - 60);
        } else {
          top = (i / (navSectionScales.length - 1)) * docHeight;
        }
      }
      return { id: item.id, scale: item.scale, top };
    });

    for (let i = 1; i < cachedSectionOffsets.length; i++) {
      if (cachedSectionOffsets[i].top <= cachedSectionOffsets[i - 1].top) {
        cachedSectionOffsets[i].top = cachedSectionOffsets[i - 1].top + 60;
      }
    }
  }

  // Precision Real-Time ScrollSpy using eye-level focal threshold (40% of viewport)
  function updateScrollSpy() {
    if (isSmoothScrolling) return;

    const scrollY = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // 1. Bottom of page threshold: If within 90px of page bottom, activate contact
    if (vh + scrollY >= docHeight - 90) {
      setActiveSection('contact');
      return;
    }

    // 2. Near top of page: If within top 120px, always activate home/top
    if (scrollY < 120) {
      setActiveSection('top');
      return;
    }

    // 3. Focal scan line at 40% of viewport height
    const scanLine = scrollY + (vh * 0.40);
    let activeId = 'top';

    if (cachedSectionOffsets.length === navSectionScales.length) {
      for (let i = 0; i < cachedSectionOffsets.length; i++) {
        if (scanLine >= cachedSectionOffsets[i].top) {
          activeId = cachedSectionOffsets[i].id;
        }
      }
    } else {
      for (let i = 0; i < navSectionIds.length; i++) {
        const id = navSectionIds[i];
        let el = document.getElementById(id);
        if (!el && id === 'top') {
          el = document.querySelector('section.hero');
        }
        if (el && scanLine >= (el.offsetTop || 0)) {
          activeId = id;
        }
      }
    }

    setActiveSection(activeId);
  }

  let tickingScrollSpy = false;
  function scheduleScrollSpy() {
    if (!tickingScrollSpy) {
      window.requestAnimationFrame(() => {
        updateScrollSpy();
        tickingScrollSpy = false;
      });
      tickingScrollSpy = true;
    }
  }
  window.addEventListener('scroll', scheduleScrollSpy, { passive: true });
  window.addEventListener('resize', () => {
    refreshSectionOffsets();
    scheduleScrollSpy();
  }, { passive: true });
  window.addEventListener('DOMContentLoaded', () => {
    refreshSectionOffsets();
    updateScrollSpy();
  });
  window.addEventListener('load', () => {
    refreshSectionOffsets();
    updateScrollSpy();
  });

  function calculateSectionScale(sy) {
    if (!cachedSectionOffsets.length) refreshSectionOffsets();
    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (sy <= 10) return navSectionScales[0].scale;
    if (sy >= docHeight - 20) return navSectionScales[navSectionScales.length - 1].scale;

    for (let i = 0; i < cachedSectionOffsets.length - 1; i++) {
      const p1 = cachedSectionOffsets[i];
      const p2 = cachedSectionOffsets[i + 1];
      if (sy >= p1.top && sy <= p2.top) {
        const span = Math.max(1, p2.top - p1.top);
        const t = Math.max(0, Math.min(1, (sy - p1.top) / span));
        const smoothT = t * t * (3 - 2 * t);
        return p1.scale + (p2.scale - p1.scale) * smoothT;
      }
    }
    return navSectionScales[navSectionScales.length - 1].scale;
  }

  function runLogoZoomLerp() {
    currentLogoScale += (targetLogoScale - currentLogoScale) * 0.14;
    document.documentElement.style.setProperty('--nav-logo-scale', currentLogoScale.toFixed(4));

    if (Math.abs(targetLogoScale - currentLogoScale) > 0.001) {
      logoZoomAnimId = window.requestAnimationFrame(runLogoZoomLerp);
    } else {
      currentLogoScale = targetLogoScale;
      document.documentElement.style.setProperty('--nav-logo-scale', currentLogoScale.toFixed(4));
      logoZoomAnimId = null;
    }
  }

  function updateNavScrollDynamics() {
    const sy = window.scrollY || window.pageYOffset || 0;
    targetLogoScale = calculateSectionScale(sy);

    if (!logoZoomAnimId) {
      logoZoomAnimId = window.requestAnimationFrame(runLogoZoomLerp);
    }
    navScrollTicking = false;
  }

  function onNavScrollTick() {
    if (!navScrollTicking) {
      window.requestAnimationFrame(updateNavScrollDynamics);
      navScrollTicking = true;
    }
  }

  window.addEventListener('scroll', onNavScrollTick, { passive: true });
  window.addEventListener('wheel', onNavScrollTick, { passive: true });
  window.addEventListener('touchmove', onNavScrollTick, { passive: true });

  // If page loads with a hash (e.g. #telemetry, #work), immediately align and illuminate that section
  if (window.location.hash) {
    const initialHash = window.location.hash.replace(/^.*#/, '');
    if (navSectionIds.includes(initialHash)) {
      setActiveSection(initialHash);
      const initialEl = document.getElementById(initialHash);
      if (initialEl) {
        setTimeout(() => {
          const isDesktop = window.innerWidth >= 992;
          const navOffset = isDesktop ? 0 : 64;
          const targetTop = initialHash === 'top' ? 0 : (initialEl.getBoundingClientRect().top + window.pageYOffset - navOffset);
          window.scrollTo({
            top: Math.max(0, Math.round(targetTop)),
            behavior: 'auto'
          });
        }, 100);
      }
    } else {
      updateScrollSpy();
    }
  } else {
    updateScrollSpy();
  }

  // Smooth scroll click handler for anchor links
  document.querySelectorAll('a[href*="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || !href.includes('#')) return;
      const targetId = href.split('#')[1];
      if (!targetId) return;

      let targetEl = document.getElementById(targetId);
      if (!targetEl && targetId === 'top') {
        targetEl = document.querySelector('section.hero');
      }

      if (targetEl) {
        e.preventDefault();

        // Instantly illuminate the target section in circular nav & mobile menu
        setActiveSection(targetId);

        // Lock scrollspy during smooth scroll animation to avoid flickering
        isSmoothScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isSmoothScrolling = false;
          updateScrollSpy();
        }, 850);

        const isDesktop = window.innerWidth >= 992;
        const navOffset = isDesktop ? 0 : 64;
        const targetTop = targetId === 'top' ? 0 : (targetEl.getBoundingClientRect().top + window.pageYOffset - navOffset);

        window.scrollTo({
          top: Math.max(0, Math.round(targetTop)),
          behavior: 'smooth'
        });

        // Push URL hash without abrupt jump
        if (history.pushState) {
          history.pushState(null, null, '#' + targetId);
        }
      }
    });
  });

  // Kinetic shockwave ripple on side-nav button click
  document.querySelectorAll('.side-nav__link').forEach(link => {
    link.addEventListener('click', function() {
      const btn = this.querySelector('.side-nav__btn');
      if (btn) {
        const ripple = document.createElement('span');
        ripple.className = 'side-nav__click-ripple';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      }
    });
  });

  /* ---------- Mobile Menu ---------- */
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    const closeMobileMenu = () => {
      mobileMenu.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
      }
    });
  }

  /* ---------- Cursor Glow (Desktop Only) ---------- */
  const glow = document.getElementById('cursorGlow');
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (glow && isFinePointer && !reduceMotion) {
    let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    let tx = gx, ty = gy;
    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
  } else if (glow) {
    glow.style.display = 'none';
  }

  /* =========================================================
     3. SHOWREEL CATEGORY FILTER TABS
     ========================================================= */
  const filterButtons = document.querySelectorAll('.reel__filter-btn');
  const reelCards = document.querySelectorAll('.reel__card');

  if (filterButtons.length && reelCards.length) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const filter = btn.dataset.filter || 'all';

        reelCards.forEach(card => {
          const category = card.dataset.categoryTag || '';
          if (filter === 'all' || category.includes(filter)) {
            card.classList.remove('is-hidden');
            card.style.opacity = '';
            card.style.transform = '';
          } else {
            card.classList.add('is-hidden');
          }
        });

        if (window.refreshReelCarousel) {
          window.refreshReelCarousel(filter);
        }
      });
    });
  }

  /* =========================================================
     4. CINEMA SHOWCASE LIGHTBOX MODAL
     ========================================================= */
  const cinemaModal = document.getElementById('cinemaModal');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalBadge = document.getElementById('modalBadge');
  const modalDesc = document.getElementById('modalDesc');
  const modalClose = document.getElementById('modalClose');
  const modalDismiss = document.getElementById('modalDismiss');
  const modalCta = document.getElementById('modalCta');
  const projectTypeSelect = document.getElementById('project_type');

  function openCinemaModal(card) {
    if (!cinemaModal) return;
    const title = card.dataset.title || card.querySelector('h3')?.textContent || 'Studio Production';
    const category = card.dataset.category || card.querySelector('.reel__meta span')?.textContent || 'AI Production';
    const imgEl = card.querySelector('.reel__thumb img');
    const img = card.dataset.img || (imgEl ? imgEl.getAttribute('src') : 'assets/c_shot1.jpg');
    const desc = card.dataset.desc || 'Original high-fidelity production rendered by 100 International Universe generative pipelines under human creative direction.';
    const project = card.dataset.project || 'Short film';

    if (modalImg) {
      modalImg.src = img;
      modalImg.alt = title;
    }
    if (modalTitle) modalTitle.textContent = title;
    if (modalBadge) modalBadge.textContent = category;
    if (modalDesc) modalDesc.textContent = desc;

    if (modalCta) {
      modalCta.onclick = (e) => {
        e.preventDefault();
        closeCinemaModal();

        // Pre-select project type in form
        if (projectTypeSelect) {
          for (const opt of projectTypeSelect.options) {
            if (opt.value.toLowerCase().includes(project.toLowerCase()) || project.toLowerCase().includes(opt.value.toLowerCase())) {
              opt.selected = true;
              break;
            }
          }
        }

        // Smooth scroll to contact section
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          const offsetPos = contactSection.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top: offsetPos, behavior: 'smooth' });
          const msgInput = document.getElementById('message');
          if (msgInput) setTimeout(() => msgInput.focus(), 600);
        }
      };
    }

    cinemaModal.classList.add('is-open');
    cinemaModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCinemaModal() {
    if (!cinemaModal) return;
    cinemaModal.classList.remove('is-open');
    cinemaModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.reel__card').forEach(card => {
    card.addEventListener('click', (e) => {
      const carouselEl = document.getElementById('reelCarousel');
      const carouselTrack = document.getElementById('reelTrack');
      if (carouselTrack && card.parentElement === carouselTrack) {
        if (!carouselEl?.classList.contains('is-filtered') && !card.classList.contains('is-center')) {
          e.preventDefault();
          e.stopPropagation();
          if (window.reelCarouselGoToCard) {
            window.reelCarouselGoToCard(card);
          }
          return;
        }
      }
      openCinemaModal(card);
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeCinemaModal);
  if (modalDismiss) modalDismiss.addEventListener('click', closeCinemaModal);
  if (cinemaModal) {
    cinemaModal.addEventListener('click', (e) => {
      if (e.target === cinemaModal) closeCinemaModal();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cinemaModal && cinemaModal.classList.contains('is-open')) {
      closeCinemaModal();
    }
  });

  /* =========================================================
     5. STATS ANIMATED COUNTER ON SCROLL
     ========================================================= */
  const stats = document.querySelectorAll('.stat__num, .hero__analytics-num');
  if (stats.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10) || 0;
        const suffix = el.dataset.suffix || '';
        const duration = 1500;
        const start = performance.now();
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    stats.forEach(el => io.observe(el));
  }

  /* =========================================================
     6. REEL CARDS SCROLL REVEAL & HOVER VIDEO AUTO-PLAY ENGINE
     ========================================================= */
  if (reelCards && reelCards.length) {
    const hasCarousel = document.getElementById('reelCarousel');
    if (!hasCarousel) {
      // Normal smooth scroll reveal without 3D perspective distortion
      reelCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(22px)';
        card.style.transition = 'opacity .7s var(--ease), transform .7s var(--ease), box-shadow .35s var(--ease)';
      });

      const cardIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '';
            entry.target.style.transform = '';
            cardIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      reelCards.forEach(card => cardIO.observe(card));
    }

    // Hover Video Preview Auto-Play (smooth individual video clip playback)
    reelCards.forEach(card => {
      const video = card.querySelector('.reel__card-video');
      if (!video) return;

      const previewStart = parseFloat(card.dataset.previewStart || '0');
      let playTimeout = null;

      const startVideoPreview = () => {
        clearTimeout(playTimeout);
        playTimeout = setTimeout(() => {
          try {
            card.classList.add('is-video-playing');
            if (video.readyState >= 1) {
              video.currentTime = previewStart;
            }
            const promise = video.play();
            if (promise !== undefined) {
              promise.catch(() => {});
            }
          } catch (err) {}
        }, 100);
      };

      const stopVideoPreview = () => {
        clearTimeout(playTimeout);
        card.classList.remove('is-video-playing');
        try {
          video.pause();
          video.currentTime = previewStart;
        } catch (err) {}
      };

      card.addEventListener('mouseenter', startVideoPreview);
      card.addEventListener('mouseleave', stopVideoPreview);
      card.addEventListener('touchstart', startVideoPreview, { passive: true });
      card.addEventListener('touchend', stopVideoPreview, { passive: true });
    });
  }

  /* =========================================================
     7. SCROLL REVEAL ANIMATIONS (OTHER SECTIONS)
     ========================================================= */
  const revealTargets = document.querySelectorAll('.service, .process__card, .hero__telemetry-hud');
  revealTargets.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(22px)';
    el.style.transition = 'opacity .7s var(--ease), transform .7s var(--ease)';
  });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '';
        entry.target.style.transform = '';
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach(el => revealIO.observe(el));


  /* ---------- Year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     8. INTERACTIVE PROJECT BRIEF CONTACT FORM
     ========================================================= */
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('contactStatus');
  const submitBtn = document.getElementById('contactSubmit');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        statusEl.className = 'contact__status is-error';
        statusEl.textContent = 'Please fill in all required fields with a valid email address.';
        form.reportValidity();
        return;
      }
      const data = new FormData(form);
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Transmitting brief…';
      statusEl.className = 'contact__status';
      statusEl.textContent = '';

      const endpoints = ['php/contact.php', 'contact.php'];
      let res = null;

      for (const endpoint of endpoints) {
        try {
          const testRes = await fetch(endpoint, { method: 'POST', body: data });
          if (testRes.ok) {
            res = testRes;
            break;
          }
        } catch (err) {
          // fallback
        }
      }

      try {
        if (res) {
          const result = await res.json();
          if (result.success) {
            statusEl.className = 'contact__status is-success';
            statusEl.textContent = result.message || 'Thanks — your brief has been submitted. A studio producer will reply within one working day.';
            form.reset();
          } else {
            statusEl.className = 'contact__status is-error';
            statusEl.textContent = result.message || 'Submission error. Please email studio@100iuniverse.com directly.';
          }
        } else {
          throw new Error('Endpoint not reached');
        }
      } catch (err) {
        statusEl.className = 'contact__status is-error';
        statusEl.textContent = 'Unable to send brief automatically. Please email studio@100iuniverse.com directly.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }


  /* =========================================================
     10. INTERACTIVE BOXES & CARDS DYNAMIC LIGHTING
     ========================================================= */
  const interactiveCards = document.querySelectorAll('.reel__card, .service, .process__card, .contact__card-info, .contact__form, .hero__telemetry-hud');
  interactiveCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--card-mouse-x', `${x}%`);
      card.style.setProperty('--card-mouse-y', `${y}%`);
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });


  /* =========================================================
     PAGE ENHANCEMENTS ENGINE
     ========================================================= */
  function initPageEnhancements() {
    initNavFireEngine();
    initMacScrollReveals();
    initReelCarousel();
    initServicesAutoHighlight();
    initProcessAutoHighlight();
  }

  /* =========================================================
     11. PROCEDURAL NAV PERIMETER FIRE & BACKGROUND EMBERS ENGINE
     (Featherweight GPU profile, reduced opacity, smooth video friendly)
     ========================================================= */
  function initNavFireEngine() {
    const navCanvas = document.getElementById('navFireCanvas');
    const bgCanvas = document.getElementById('bgLogoEmberCanvas');
    if (!navCanvas && !bgCanvas) return;

    const navCtx = navCanvas ? navCanvas.getContext('2d', { alpha: true }) : null;
    const bgCtx = bgCanvas ? bgCanvas.getContext('2d', { alpha: true }) : null;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let navW = 560;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let isRunning = true;
    let animId = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;

      if (navCanvas) {
        const parent = navCanvas.parentElement;
        navW = parent ? parent.offsetWidth : 560;
        if (navW < 520) navW = 560;
        navCanvas.width = Math.floor(navW * dpr);
        navCanvas.height = Math.floor(height * dpr);
        navCanvas.style.width = navW + 'px';
        navCanvas.style.height = height + 'px';
      }

      if (bgCanvas) {
        // Render background embers at 1x resolution to keep GPU buffer light & video 100% smooth
        bgCanvas.width = width;
        bgCanvas.height = height;
        bgCanvas.style.width = width + 'px';
        bgCanvas.style.height = height + 'px';
      }
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // -------------------------------------------------------------
    // EXACT CIRCLE DOCK GEOMETRY (Rx = 198px, slightly outside 190px dock)
    // -------------------------------------------------------------
    const Rx = 198;

    function getArcPoint(u, yc) {
      const clampedU = Math.max(-0.995, Math.min(0.995, u));
      const y = yc + clampedU * yc;
      const radTerm = Math.max(0, 1 - clampedU * clampedU);
      const x = Rx * Math.sqrt(radTerm);

      const dx_dy = (radTerm > 0.0004) ? - (Rx / yc) * (clampedU / Math.sqrt(radTerm)) : 0;
      const len = Math.sqrt(1 + dx_dy * dx_dy) || 1;
      const nx = 1 / len;
      const ny = -dx_dy / len;

      return { x, y, nx, ny };
    }

    // -------------------------------------------------------------
    // PRE-RENDERED HIGH-FIDELITY GAUSSIAN FLAMELET SPRITES
    // -------------------------------------------------------------
    function createFlameSprite(size, stops) {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = size;
      sCanvas.height = size;
      const sCtx = sCanvas.getContext('2d');
      const half = size / 2;

      const grad = sCtx.createRadialGradient(half, half, 0, half, half, half);
      for (let i = 0; i < stops.length; i++) {
        grad.addColorStop(stops[i][0], stops[i][1]);
      }
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, size, size);
      return sCanvas;
    }

    const spriteCore = createFlameSprite(80, [
      [0.0, 'rgba(255, 255, 255, 1.0)'],
      [0.15, 'rgba(255, 252, 230, 0.95)'],
      [0.35, 'rgba(255, 215, 80, 0.65)'],
      [0.65, 'rgba(255, 140, 20, 0.25)'],
      [1.0, 'rgba(255, 60, 0, 0)']
    ]);

    const spriteGold = createFlameSprite(120, [
      [0.0, 'rgba(255, 230, 60, 0.88)'],
      [0.25, 'rgba(255, 175, 25, 0.70)'],
      [0.60, 'rgba(245, 95, 12, 0.35)'],
      [1.0, 'rgba(180, 25, 0, 0)']
    ]);

    const spriteOrange = createFlameSprite(160, [
      [0.0, 'rgba(255, 135, 15, 0.72)'],
      [0.30, 'rgba(235, 60, 8, 0.48)'],
      [0.68, 'rgba(170, 22, 0, 0.20)'],
      [1.0, 'rgba(0, 0, 0, 0)']
    ]);

    const spriteCrimson = createFlameSprite(200, [
      [0.0, 'rgba(200, 32, 5, 0.45)'],
      [0.40, 'rgba(130, 15, 0, 0.22)'],
      [0.75, 'rgba(50, 6, 0, 0.07)'],
      [1.0, 'rgba(0, 0, 0, 0)']
    ]);

    // -------------------------------------------------------------
    // ARTISTIC WISPY LICKING FLAME PLUMES (Hyper-Realistic Slow-Drift Tendrils)
    // -------------------------------------------------------------
    const TONGUE_COUNT = 20;
    const tongues = [];
    for (let i = 0; i < TONGUE_COUNT; i++) {
      tongues.push({
        u: (i / (TONGUE_COUNT - 1)) * 1.94 - 0.97,
        phase: Math.random() * Math.PI * 2,
        speed: 0.36 + Math.random() * 0.42,
        reach: 40 + Math.random() * 35,
        curlSpeed: 0.24 + Math.random() * 0.30,
        curlAmt: 8 + Math.random() * 14,
        baseWidth: 31 + Math.random() * 14
      });
    }

    // -------------------------------------------------------------
    // VOLUMETRIC SLOW-MOTION FLAMELETS (Hyper-Realistic Gas Dynamics)
    // -------------------------------------------------------------
    const MAX_FLAMELETS = 75;
    const flamelets = [];

    class FlameParticle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        const yc = height / 2;
        const u = (Math.random() - 0.5) * 1.96;
        const pt = getArcPoint(u, yc);

        this.x = pt.x + (Math.random() - 0.5) * 6;
        this.y = pt.y + (Math.random() - 0.5) * 6;
        this.nx = pt.nx;
        this.ny = pt.ny;

        const push = 0.22 + Math.random() * 0.48;
        this.vx = pt.nx * push + (Math.random() * 0.2 - 0.1);
        this.vy = pt.ny * (push * 0.15) - (0.34 + Math.random() * 0.62);

        this.life = initial ? Math.random() : 1.0;
        this.decay = 0.0035 + Math.random() * 0.0055;
        this.baseRadius = 18 + Math.random() * 10;
        this.maxRadius = 36 + Math.random() * 20;
        this.seed = Math.random() * 100;
        this.swayFreq = 1.2 + Math.random() * 1.8;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.993;
        this.vy = this.vy * 0.993 - 0.007;

        const sway = Math.sin(this.seed + (1 - this.life) * 2.4) * 0.28 + Math.sin(this.seed * 2 + (1 - this.life) * 5.2) * 0.12;
        this.x += sway;

        this.life -= this.decay;
        if (this.life <= 0 || this.x > navW || this.y < -40 || this.y > height + 40) {
          this.reset();
        }
      }

      draw(c) {
        if (this.life <= 0) return;

        const age = 1 - this.life;
        const radius = this.baseRadius + (this.maxRadius - this.baseRadius) * age;

        const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
        const w = radius * 1.40;
        const h = w * 1.46;

        let sprite;
        let alpha = 1.0;

        if (age < 0.22) {
          sprite = spriteCore;
          alpha = 0.55;
        } else if (age < 0.54) {
          sprite = spriteGold;
          alpha = 0.45 * (1 - (age - 0.22) / 0.32 * 0.2);
        } else if (age < 0.82) {
          sprite = spriteOrange;
          alpha = 0.35 * (1 - (age - 0.54) / 0.28 * 0.35);
        } else {
          sprite = spriteCrimson;
          alpha = 0.20 * (1 - (age - 0.82) / 0.18);
        }

        c.save();
        c.translate(this.x, this.y);
        c.rotate(angle);
        c.globalAlpha = Math.max(0, alpha);
        c.drawImage(sprite, -w / 2, -h / 2, w, h);
        c.restore();
      }
    }

    for (let i = 0; i < MAX_FLAMELETS; i++) {
      flamelets.push(new FlameParticle());
    }

    // -------------------------------------------------------------
    // SLOW-FLOATING NAV INCANDESCENT EMBERS & SPARKS (32 Particles)
    // -------------------------------------------------------------
    const MAX_NAV_EMBERS = 32;
    const navEmbers = [];

    class NavEmber {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        const yc = height / 2;
        const u = (Math.random() - 0.5) * 1.95;
        const pt = getArcPoint(u, yc);

        this.x = pt.x + pt.nx * (4 + Math.random() * 20);
        this.y = pt.y + pt.ny * (4 + Math.random() * 20);
        this.prevX = this.x;
        this.prevY = this.y;

        const speed = 0.26 + Math.random() * 0.50;
        this.vx = pt.nx * speed + (Math.random() * 0.2 - 0.1);
        this.vy = pt.ny * (speed * 0.15) - (0.30 + Math.random() * 0.60);

        this.life = initial ? Math.random() : 1.0;
        this.decay = 0.0025 + Math.random() * 0.0045;
        this.size = 1.2 + Math.random() * 2.2;
        this.seed = Math.random() * 100;
        this.wobbleSpeed = 0.9 + Math.random() * 1.5;
      }

      update() {
        this.prevX = this.x;
        this.prevY = this.y;

        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.994;
        this.vy = this.vy * 0.994 - 0.006;

        this.x += Math.sin(this.seed + this.life * this.wobbleSpeed) * 0.32;

        this.life -= this.decay;
        if (this.life <= 0 || this.x > navW || this.y < -40 || this.y > height + 40) {
          this.reset();
        }
      }

      draw(c) {
        if (this.life <= 0) return;

        const progress = 1 - this.life;
        const sparkle = 0.78 + 0.22 * Math.sin(time * 6.5 + this.seed);
        let r, g, b, a;

        if (progress < 0.22) {
          r = 255;
          g = Math.floor(255 - progress * 280);
          b = Math.floor(220 - progress * 750);
          a = 0.48;
        } else if (progress < 0.65) {
          const t = (progress - 0.22) / 0.43;
          r = 255;
          g = Math.floor(190 - t * 115);
          b = 10;
          a = 0.38 * (1 - t * 0.25);
        } else {
          const t = (progress - 0.65) / 0.35;
          r = Math.floor(255 - t * 135);
          g = Math.floor(70 - t * 55);
          b = 5;
          a = 0.26 * (1 - t);
        }

        c.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a * 0.50 * sparkle})`;
        c.lineWidth = this.size * (0.6 + this.life * 0.4);
        c.beginPath();
        c.moveTo(this.prevX, this.prevY);
        c.lineTo(this.x, this.y);
        c.stroke();

        c.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * 0.70 * sparkle})`;
        c.beginPath();
        c.arc(this.x, this.y, this.size * 0.55, 0, Math.PI * 2);
        c.fill();
      }
    }

    for (let i = 0; i < MAX_NAV_EMBERS; i++) {
      navEmbers.push(new NavEmber());
    }

    // -------------------------------------------------------------
    // BACKGROUND EMBERS (GINI PUPURU - Living Atmospheric Animated Sparks)
    // -------------------------------------------------------------
    const MAX_BG_EMBERS = 80;
    const bgEmbers = [];

    class BgEmber {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        const yc = height / 2;
        const u = (Math.random() - 0.5) * 1.95;
        const pt = getArcPoint(u, yc);

        if (initial) {
          this.x = Math.random() * width;
          this.y = Math.random() * height;
        } else {
          // 65% spawn from left fire arc wafting across page, 35% spawn along bottom rising up
          if (Math.random() < 0.65) {
            this.x = pt.x + pt.nx * (6 + Math.random() * 30);
            this.y = pt.y + pt.ny * (6 + Math.random() * 30);
          } else {
            this.x = Math.random() * width;
            this.y = height + 15;
          }
        }
        this.prevX = this.x;
        this.prevY = this.y;

        const speed = 0.70 + Math.random() * 1.30;
        this.vx = (0.35 + Math.random() * 0.75) * speed;
        this.vy = (-0.50 - Math.random() * 1.15) * speed;

        this.life = initial ? (0.2 + Math.random() * 0.8) : 1.0;
        this.decay = 0.0012 + Math.random() * 0.0020;
        this.size = 1.4 + Math.random() * 2.4;
        this.seed = Math.random() * 1000;
        this.wobbleSpeed = 1.2 + Math.random() * 2.2;
        this.wobbleAmp = 0.50 + Math.random() * 0.70;
      }

      update() {
        this.prevX = this.x;
        this.prevY = this.y;

        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.995;
        this.vy = this.vy * 0.995 - 0.008;

        // Thermal wave air current wafting
        this.x += Math.sin(this.seed + (1 - this.life) * this.wobbleSpeed * 4.0) * this.wobbleAmp;

        this.life -= this.decay;
        if (this.life <= 0 || this.x > width + 60 || this.y < -50 || this.y > height + 60) {
          this.reset();
        }
      }

      draw(c) {
        if (this.life <= 0) return;

        const progress = 1 - this.life;
        const twinkle = 0.75 + 0.25 * Math.sin(this.seed + progress * 24.0);
        let r, g, b, a;

        if (progress < 0.25) {
          // Brilliant incandescent golden core
          r = 255;
          g = Math.floor(245 - progress * 220);
          b = Math.floor(180 - progress * 650);
          a = 0.52;
        } else if (progress < 0.70) {
          // Warm fiery amber
          const t = (progress - 0.25) / 0.45;
          r = 255;
          g = Math.floor(190 - t * 110);
          b = Math.floor(20 - t * 15);
          a = 0.42 * (1 - t * 0.25);
        } else {
          // Cooling smoldering crimson
          const t = (progress - 0.70) / 0.30;
          r = Math.floor(255 - t * 115);
          g = Math.floor(80 - t * 65);
          b = 5;
          a = 0.28 * (1 - t);
        }

        const currentAlpha = Math.max(0, a * twinkle);

        // Motion trail streak (gives clear sense of animation & speed)
        c.strokeStyle = `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.38})`;
        c.lineWidth = this.size * 0.80;
        c.beginPath();
        c.moveTo(this.prevX, this.prevY);
        c.lineTo(this.x, this.y);
        c.stroke();

        // Glowing spark head
        c.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlpha * 0.65})`;
        c.beginPath();
        c.arc(this.x, this.y, this.size * 0.60, 0, Math.PI * 2);
        c.fill();

        // Soft outer ambient bloom for larger sparks
        if (this.size > 2.2) {
          c.fillStyle = `rgba(255, 150, 40, ${currentAlpha * 0.12})`;
          c.beginPath();
          c.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    for (let i = 0; i < MAX_BG_EMBERS; i++) {
      bgEmbers.push(new BgEmber());
    }

    const NUM_AURORA_STEPS = 44;
    let time = 0;

    function renderFire() {
      if (!isRunning) return;
      animId = requestAnimationFrame(renderFire);
      if (document.hidden) return;

      time += 0.0016;
      const yc = height / 2;
      const navVisible = width > 991;

      // 1. NAV FIRE
      if (navCtx && navCanvas && navVisible) {
        navCtx.save();
        navCtx.scale(dpr, dpr);
        navCtx.clearRect(0, 0, navW, height);
        navCtx.globalCompositeOperation = 'lighter';

        // Luminous Plasma Aurora
        for (let i = 0; i <= NUM_AURORA_STEPS; i++) {
          const u = (i / NUM_AURORA_STEPS) * 1.96 - 0.98;
          const pt = getArcPoint(u, yc);
          const ripple = Math.sin(time * 1.6 + u * 4.5) * 0.18 + Math.cos(time * 3.2 + u * 9.2) * 0.08;
          const breath = 0.75 + ripple;

          const haloSize = 68 + 16 * breath;
          navCtx.globalAlpha = 0.24 * breath;
          navCtx.drawImage(spriteGold, pt.x - haloSize / 2, pt.y - haloSize / 2, haloSize, haloSize);

          const coreSize = 34 + 9 * breath;
          navCtx.globalAlpha = 0.36 * breath;
          navCtx.drawImage(spriteCore, pt.x - coreSize / 2, pt.y - coreSize / 2, coreSize, coreSize);
        }

        // Wispy Licking Tongues
        const TEND_STEPS = 6;
        for (let i = 0; i < tongues.length; i++) {
          const tongue = tongues[i];
          const cycle = Math.sin(time * tongue.speed + tongue.phase);
          if (cycle < -0.3) continue;

          const intensity = Math.max(0, (cycle + 0.3) / 1.3);
          const pt = getArcPoint(tongue.u, yc);

          const reach = tongue.reach * (0.68 + 0.46 * intensity);
          const curl1 = Math.sin(time * tongue.curlSpeed + tongue.phase) * tongue.curlAmt;
          const curl2 = Math.cos(time * (tongue.curlSpeed * 2.1) + tongue.phase * 1.5) * (tongue.curlAmt * 0.38);
          const totalCurl = curl1 + curl2;

          const p0x = pt.x;
          const p0y = pt.y;
          const p1x = pt.x + pt.nx * (reach * 0.45) - pt.ny * (totalCurl * 0.28);
          const p1y = pt.y + pt.ny * (reach * 0.45) + pt.nx * (totalCurl * 0.28) - (reach * 0.14);
          const p2x = pt.x + pt.nx * reach + totalCurl * 0.32;
          const p2y = pt.y + pt.ny * reach - (reach * 0.38) + totalCurl * 0.35;

          for (let s = 0; s < TEND_STEPS; s++) {
            const tVal = s / (TEND_STEPS - 1);
            const oneMinusT = 1 - tVal;

            const sx = oneMinusT * oneMinusT * p0x + 2 * oneMinusT * tVal * p1x + tVal * tVal * p2x;
            const sy = oneMinusT * oneMinusT * p0y + 2 * oneMinusT * tVal * p1y + tVal * tVal * p2y;

            const puffSize = tongue.baseWidth * (1.0 - tVal * 0.48);
            const puffAlpha = (1 - tVal * tVal * 0.85) * intensity * 0.34;

            let sprite;
            if (tVal < 0.22) {
              sprite = spriteCore;
            } else if (tVal < 0.52) {
              sprite = spriteGold;
            } else if (tVal < 0.8) {
              sprite = spriteOrange;
            } else {
              sprite = spriteCrimson;
            }

            navCtx.globalAlpha = Math.max(0, puffAlpha);
            navCtx.drawImage(sprite, sx - puffSize / 2, sy - puffSize / 2, puffSize, puffSize);
          }
        }

        // Flamelets
        for (let i = 0; i < flamelets.length; i++) {
          flamelets[i].update();
          flamelets[i].draw(navCtx);
        }

        // Nav Embers
        navCtx.globalAlpha = 0.42;
        for (let i = 0; i < navEmbers.length; i++) {
          navEmbers[i].update();
          navEmbers[i].draw(navCtx);
        }

        navCtx.restore();
      }

      // 2. BACKGROUND EMBERS (GINI PUPURU)
      if (bgCtx && bgCanvas) {
        bgCtx.clearRect(0, 0, width, height);
        bgCtx.globalCompositeOperation = 'lighter';
        bgCtx.globalAlpha = 0.65;

        for (let i = 0; i < bgEmbers.length; i++) {
          bgEmbers[i].update();
          bgEmbers[i].draw(bgCtx);
        }
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isRunning = false;
        if (animId) cancelAnimationFrame(animId);
      } else {
        if (!isRunning) {
          isRunning = true;
          animId = requestAnimationFrame(renderFire);
        }
      }
    });

    // Guarantee fire and embers never pause or drop during scroll, touch, or touchpad events
    const ensureFireRunning = () => {
      if (!isRunning && !document.hidden) {
        isRunning = true;
        animId = requestAnimationFrame(renderFire);
      }
    };
    window.addEventListener('scroll', ensureFireRunning, { passive: true });
    window.addEventListener('touchmove', ensureFireRunning, { passive: true });
    window.addEventListener('wheel', ensureFireRunning, { passive: true });
    window.addEventListener('touchstart', ensureFireRunning, { passive: true });

    animId = requestAnimationFrame(renderFire);
  }

  /* =========================================================
     APPLE / MAC INSPIRED SECTION SCROLL REVEAL ENGINE
     ========================================================= */
  function initMacScrollReveals() {
    const revealSelectors = [
      '.section-head',
      '.hero__telemetry-hud',
      '.reel-carousel',
      '.service',
      '.process__frame',
      '.process__card',
      '.contact__card-info',
      '.contact__form'
    ];

    const targets = document.querySelectorAll(revealSelectors.join(', '));
    if (!targets.length) return;

    targets.forEach(el => {
      el.classList.add('mac-reveal');
      if (el.classList.contains('reel') || 
          el.classList.contains('services__list') || 
          el.classList.contains('process__grid')) {
        el.classList.add('mac-stagger');
      }
    });

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.1
    });

    targets.forEach(t => observer.observe(t));

    let tickingReveal = false;
    function checkReveals() {
      const vh = window.innerHeight;
      targets.forEach(t => {
        if (!t.classList.contains('is-in-view')) {
          const r = t.getBoundingClientRect();
          if (r.top < vh * 0.95 && r.bottom > 0) {
            t.classList.add('is-in-view');
          }
        }
      });
      tickingReveal = false;
    }

    function onScrollRevealTick() {
      if (!tickingReveal) {
        window.requestAnimationFrame(checkReveals);
        tickingReveal = true;
      }
    }

    window.addEventListener('scroll', onScrollRevealTick, { passive: true });
    window.addEventListener('resize', onScrollRevealTick, { passive: true });

    // Initial view fallback
    setTimeout(checkReveals, 150);
  }

  /* =========================================================
     13. SHOWREEL SINGLE-LINE AUTO-PLAY CENTERING CAROUSEL
     ========================================================= */
  function initReelCarousel() {
    const carousel = document.getElementById('reelCarousel');
    const viewport = document.getElementById('reelViewport');
    const track = document.getElementById('reelTrack');
    const prevBtn = document.getElementById('reelPrev');
    const nextBtn = document.getElementById('reelNext');
    const indicatorsContainer = document.getElementById('reelIndicators');

    if (!carousel || !viewport || !track) return;

    let currentIndex = 0;
    let autoplayInterval = null;
    let isUserInteracting = false;
    let isVisibleInView = true;

    function getVisibleCards() {
      return Array.from(track.querySelectorAll('.reel__card')).filter(card => {
        return !card.classList.contains('is-hidden') && window.getComputedStyle(card).display !== 'none';
      });
    }

    function renderIndicators(cards) {
      if (!indicatorsContainer) return;
      indicatorsContainer.innerHTML = '';
      if (cards.length <= 1) return;

      cards.forEach((card, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'reel-carousel__dot' + (idx === currentIndex ? ' is-active' : '');
        dot.setAttribute('aria-label', `Go to reel ${idx + 1}: ${card.dataset.title || ''}`);
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          goToIndex(idx);
          restartAutoplay();
        });
        indicatorsContainer.appendChild(dot);
      });
    }

    function updateActiveStates(cards) {
      cards.forEach((card, idx) => {
        if (idx === currentIndex) {
          card.classList.add('is-center');
          card.setAttribute('aria-current', 'true');
        } else {
          card.classList.remove('is-center');
          card.removeAttribute('aria-current');
        }
      });

      if (indicatorsContainer) {
        const dots = indicatorsContainer.querySelectorAll('.reel-carousel__dot');
        dots.forEach((dot, idx) => {
          if (idx === currentIndex) {
            dot.classList.add('is-active');
          } else {
            dot.classList.remove('is-active');
          }
        });
      }
    }

    function centerCurrentCard(smooth = true) {
      if (carousel.classList.contains('is-filtered')) return;
      const cards = getVisibleCards();
      if (!cards.length) return;

      if (currentIndex >= cards.length) currentIndex = 0;
      if (currentIndex < 0) currentIndex = cards.length - 1;

      const card = cards[currentIndex];
      if (!card) return;

      const viewportWidth = viewport.clientWidth;
      const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
      const targetOffset = cardCenter - (viewportWidth / 2);

      if (!smooth) {
        track.style.transition = 'none';
      } else {
        track.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      track.style.transform = `translateX(-${targetOffset}px)`;

      if (!smooth) {
        void track.offsetWidth;
        track.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      updateActiveStates(cards);
    }

    function goToIndex(idx, smooth = true) {
      if (carousel.classList.contains('is-filtered')) return;
      const cards = getVisibleCards();
      if (!cards.length) return;
      currentIndex = (idx + cards.length) % cards.length;
      centerCurrentCard(smooth);
    }

    function nextSlide() {
      goToIndex(currentIndex + 1);
    }

    function prevSlide() {
      goToIndex(currentIndex - 1);
    }

    function startAutoplay() {
      if (carousel.classList.contains('is-filtered')) return;
      stopAutoplay();
      autoplayInterval = setInterval(() => {
        if (!isUserInteracting && isVisibleInView && document.visibilityState === 'visible' && !carousel.classList.contains('is-filtered')) {
          nextSlide();
        }
      }, 3500);
    }

    function stopAutoplay() {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    window.reelCarouselGoToCard = function(targetCard) {
      if (carousel.classList.contains('is-filtered')) return;
      const cards = getVisibleCards();
      const idx = cards.indexOf(targetCard);
      if (idx !== -1) {
        goToIndex(idx);
        restartAutoplay();
      }
    };

    window.refreshReelCarousel = function(currentFilter = 'all') {
      const isFiltered = currentFilter !== 'all';
      const cards = getVisibleCards();

      if (isFiltered) {
        carousel.classList.add('is-filtered');
        track.dataset.cardCount = String(cards.length);
        track.style.transform = '';
        track.style.transition = '';
        stopAutoplay();

        cards.forEach(c => {
          c.classList.remove('is-center');
          c.removeAttribute('aria-current');
        });
      } else {
        carousel.classList.remove('is-filtered');
        track.dataset.cardCount = String(cards.length);
        track.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
        currentIndex = 0;
        renderIndicators(cards);
        centerCurrentCard(false);
        restartAutoplay();
      }
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        prevSlide();
        restartAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nextSlide();
        restartAutoplay();
      });
    }

    carousel.addEventListener('mouseenter', () => {
      isUserInteracting = true;
    });
    carousel.addEventListener('mouseleave', () => {
      isUserInteracting = false;
    });

    track.querySelectorAll('.reel__card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (!carousel.classList.contains('is-filtered')) {
          const cards = getVisibleCards();
          const idx = cards.indexOf(card);
          if (idx !== -1) {
            goToIndex(idx);
          }
        }
      });
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    viewport.addEventListener('touchstart', (e) => {
      isUserInteracting = true;
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (!isSwiping || e.touches.length !== 1) return;
      const diffY = Math.abs(e.touches[0].clientY - touchStartY);
      const diffX = Math.abs(e.touches[0].clientX - touchStartX);
      if (diffY > diffX && diffY > 15) {
        isSwiping = false;
      }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      isUserInteracting = false;
      if (!isSwiping) return;
      isSwiping = false;
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 45) {
          if (diff > 0) {
            nextSlide();
          } else {
            prevSlide();
          }
          restartAutoplay();
        }
      }
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisibleInView = entry.isIntersecting;
        });
      }, { threshold: 0.15 });
      io.observe(carousel);
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!carousel.classList.contains('is-filtered')) {
          centerCurrentCard(false);
        }
      }, 80);
    }, { passive: true });

    const initialCards = getVisibleCards();
    renderIndicators(initialCards);
    setTimeout(() => {
      centerCurrentCard(false);
      startAutoplay();
    }, 120);
  }

  /* =========================================================
     14. SERVICES SECTION AUTOMATIC SEQUENTIAL HIGHLIGHT
     ========================================================= */
  function initServicesAutoHighlight() {
    const services = Array.from(document.querySelectorAll('.services .service'));
    if (!services.length) return;

    let activeIndex = 0;
    let timer = null;
    let isPaused = false;
    let isInView = false;

    function highlightIndex(idx) {
      services.forEach((card, i) => {
        if (i === idx) {
          card.classList.add('is-auto-highlighted');
        } else {
          card.classList.remove('is-auto-highlighted');
        }
      });
    }

    function advance() {
      if (!isPaused && isInView && document.visibilityState === 'visible') {
        activeIndex = (activeIndex + 1) % services.length;
        highlightIndex(activeIndex);
      }
    }

    function startTimer() {
      stopTimer();
      timer = setInterval(advance, 2800);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    services.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => {
        isPaused = true;
        stopTimer();
        activeIndex = idx;
        highlightIndex(idx);
      });

      card.addEventListener('mouseleave', () => {
        isPaused = false;
        startTimer();
      });

      card.addEventListener('touchstart', () => {
        isPaused = true;
        stopTimer();
        activeIndex = idx;
        highlightIndex(idx);
      }, { passive: true });

      card.addEventListener('touchend', () => {
        isPaused = false;
        startTimer();
      }, { passive: true });
    });

    const section = document.querySelector('.services');
    if (section && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isInView = entry.isIntersecting;
          if (isInView) {
            highlightIndex(activeIndex);
            startTimer();
          } else {
            stopTimer();
          }
        });
      }, { threshold: 0.15 });
      io.observe(section);
    } else {
      isInView = true;
      highlightIndex(activeIndex);
      startTimer();
    }
  }

  /* =========================================================
     15. PROCESS SECTION AUTOMATIC PIPELINE HIGHLIGHT
     ========================================================= */
  function initProcessAutoHighlight() {
    const processCards = Array.from(document.querySelectorAll('.process__console .process__card, .process .process__card'));
    if (!processCards.length) return;

    let activeIndex = 0;
    let timer = null;
    let isPaused = false;
    let isInView = false;

    function highlightIndex(idx) {
      processCards.forEach((card, i) => {
        if (i === idx) {
          card.classList.add('is-auto-highlighted');
        } else {
          card.classList.remove('is-auto-highlighted');
        }
      });
    }

    function advance() {
      if (!isPaused && isInView && document.visibilityState === 'visible') {
        activeIndex = (activeIndex + 1) % processCards.length;
        highlightIndex(activeIndex);
      }
    }

    function startTimer() {
      stopTimer();
      timer = setInterval(advance, 2500);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    processCards.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => {
        isPaused = true;
        stopTimer();
        activeIndex = idx;
        highlightIndex(idx);
      });

      card.addEventListener('mouseleave', () => {
        isPaused = false;
        startTimer();
      });

      card.addEventListener('touchstart', () => {
        isPaused = true;
        stopTimer();
        activeIndex = idx;
        highlightIndex(idx);
      }, { passive: true });

      card.addEventListener('touchend', () => {
        isPaused = false;
        startTimer();
      }, { passive: true });
    });

    const section = document.querySelector('.process');
    if (section && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isInView = entry.isIntersecting;
          if (isInView) {
            highlightIndex(activeIndex);
            startTimer();
          } else {
            stopTimer();
          }
        });
      }, { threshold: 0.15 });
      io.observe(section);
    } else {
      isInView = true;
      highlightIndex(activeIndex);
      startTimer();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageEnhancements);
  } else {
    initPageEnhancements();
  }
})();
