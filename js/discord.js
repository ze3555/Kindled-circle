// discord.js — small UX helpers for the Discord button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('discordBtn');
  if (!btn) return;

  // long-press to copy invite link (mobile-friendly)
  let pressTimer = null;
  const invite = btn.href;

  function copyInvite() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(invite).then(() => {
        showTempTip(btn, 'Invite copied');
      }).catch(() => {
        showTempTip(btn, 'Copy failed');
      });
    } else {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = invite;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showTempTip(btn, 'Invite copied'); } catch(e) { showTempTip(btn, 'Copy failed'); }
      ta.remove();
    }
  }

  // long press events
  btn.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(copyInvite, 700);
  });
  btn.addEventListener('touchend', (e) => {
    clearTimeout(pressTimer);
  });

  // keyboard: Ctrl/Cmd+Enter opens in new tab but also allow space to click
  btn.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      window.open(invite, '_blank', 'noopener');
    }
  });

  // small helper to show temporary tooltip text (overrides .discord-tip)
  function showTempTip(el, text) {
    const tip = el.querySelector('.discord-tip');
    if (!tip) return;
    const prev = tip.textContent;
    tip.textContent = text;
    tip.style.opacity = '1';
    tip.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
      tip.textContent = prev;
      tip.style.opacity = '';
      tip.style.transform = '';
    }, 1400);
  }

  // optional: attention pulse when window receives focus after blur (example UX)
  let blurred = false;
  window.addEventListener('blur', () => blurred = true);
  window.addEventListener('focus', () => {
    if (blurred) {
      btn.classList.add('attention');
      setTimeout(() => btn.classList.remove('attention'), 2200);
      blurred = false;
    }
  });
});
