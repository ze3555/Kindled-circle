// nav.js — smooth scroll + active section highlight
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".navlink");
  if (!links.length) return;

  const sections = Array.from(links)
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  // === Smooth scroll ===
  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      const offset = target.getBoundingClientRect().top + window.scrollY - 60; // adjust for header height
      window.scrollTo({ top: offset, behavior: "smooth" });
    });
  });

  // === Active highlight on scroll ===
  function updateActiveLink() {
    let current = "";
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 100) {
        current = sec.getAttribute("id");
      }
    });
    links.forEach(link => {
      const match = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("active", match);
    });
  }

  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();

  // === Theme-awareness (optional aesthetic tweak) ===
  const observer = new MutationObserver(() => {
    document.documentElement.dataset.theme === "dark"
      ? links.forEach(l => (l.style.color = ""))
      : links.forEach(l => (l.style.color = ""));
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
});
