import VanillaTilt from 'vanilla-tilt';

const SPECIALIZATIONS = {
  business: ['Accounting', 'Business Administration', 'Human Resource Management', 'Marketing'],
  counseling: ['Clinical Mental Health Counseling', 'School Counseling'],
  education: ['Curriculum and Instruction', 'Educational Leadership', 'Special Education'],
  'health-sciences': ['Health Administration', 'Public Health'],
  nursing: ['RN-to-BSN', 'MSN', 'Doctor of Nursing Practice'],
  psychology: ['Applied Behavior Analysis', 'Clinical Psychology', 'Industrial/Organizational Psychology'],
  technology: ['Information Assurance', 'Information Technology', 'Software Development'],
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initCarousel() {
  const track = document.querySelector('.carousel__track');
  const viewport = document.querySelector('.carousel__viewport');
  const slides = document.querySelectorAll('.carousel__slide');
  const dots = document.querySelectorAll('.carousel__dot');

  if (!track || !viewport || !slides.length || !dots.length) return;

  let activeIndex = 0;

  function getStep() {
    const slide = slides[0];
    if (!slide) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    return slide.offsetWidth + gap;
  }

  function goTo(index) {
    activeIndex = Math.max(0, Math.min(index, slides.length - 1));
    track.style.transform = `translateX(-${activeIndex * getStep()}px)`;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('carousel__slide--active', slideIndex === activeIndex);
    });

    dots.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeIndex;
      button.classList.toggle('carousel__dot--active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => goTo(index));
  });

  window.addEventListener('resize', () => goTo(activeIndex));

  goTo(0);
}

function initProgramFinder() {
  const section = document.querySelector('.program-finder');
  const chips = document.querySelectorAll('.program-finder__chips .chip');
  const panel = document.getElementById('program-finder-panel');
  const areaSelect = document.getElementById('area-of-study');
  const specSelect = document.getElementById('specialization');

  if (!section || !chips.length || !panel || !areaSelect || !specSelect) return;

  function resetSpecialization() {
    specSelect.innerHTML = '<option value="">Specialization</option>';
    specSelect.disabled = true;
    specSelect.value = '';
  }

  function populateSpecializations(area) {
    resetSpecialization();
    const options = SPECIALIZATIONS[area];
    if (!options) return;

    options.forEach((label) => {
      const option = document.createElement('option');
      option.value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      option.textContent = label;
      specSelect.appendChild(option);
    });
    specSelect.disabled = false;
  }

  function openPanel(chip) {
    chips.forEach((button) => {
      const isActive = button === chip;
      button.classList.toggle('chip--active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    panel.hidden = false;
    section.classList.add('program-finder--expanded');
    areaSelect.focus();
  }

  function closePanel() {
    chips.forEach((button) => {
      button.classList.remove('chip--active');
      button.setAttribute('aria-selected', 'false');
    });
    panel.hidden = true;
    section.classList.remove('program-finder--expanded');
    areaSelect.value = '';
    resetSpecialization();
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const isActive = chip.classList.contains('chip--active');
      const isExpanded = !panel.hidden;

      if (isActive && isExpanded) {
        closePanel();
        return;
      }

      openPanel(chip);
    });
  });

  areaSelect.addEventListener('change', () => {
    if (areaSelect.value) {
      populateSpecializations(areaSelect.value);
      return;
    }
    resetSpecialization();
  });
}

function initRevealAnimations() {
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const delay = Number(entry.target.dataset.revealDelay || 0) * 80;
        window.setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, delay);

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));
}

function initNavScroll() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('main-nav--scrolled', window.scrollY > 24);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initMobileNav() {
  const button = document.querySelector('.main-nav__menu-btn');
  const panel = document.getElementById('mobile-nav-panel');
  if (!button || !panel) return;

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    panel.hidden = isOpen;
  });

  panel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open menu');
      panel.hidden = true;
    });
  });
}

function initTilt() {
  if (prefersReducedMotion) return;

  const cards = document.querySelectorAll('.stats-section__program');
  if (!cards.length) return;

  VanillaTilt.init(cards, {
    max: 8,
    speed: 400,
    scale: 1.02,
    glare: true,
    'max-glare': 0.18,
    perspective: 1000,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initProgramFinder();
  initRevealAnimations();
  initNavScroll();
  initMobileNav();
  initTilt();
});
