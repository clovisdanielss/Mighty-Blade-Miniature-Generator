(() => {
  'use strict';

  const MM_TO_PREVIEW = 3;
  const PAGE = { portrait: [210, 297], landscape: [297, 210] };
  const PRESETS = {
    tiny: { height: 16, base: 18 },
    small: { height: 24, base: 22 },
    medium: { height: 32, base: 28 },
    large: { height: 50, base: 40 },
    colossal: { height: 75, base: 55 }
  };

  const state = { creatures: [], layout: null };
  const $ = (selector, root = document) => root.querySelector(selector);
  const els = {
    input: $('#image-input'), list: $('#creature-list'), empty: $('#empty-state'),
    orientation: $('#orientation'), margin: $('#margin'), gap: $('#gap'),
    slotWidth: $('#slot-width'), canvas: $('#preview-canvas'), status: $('#status'),
    usage: $('#usage-label'), generate: $('#generate-pdf'), template: $('#creature-template')
  };

  const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };

  async function loadImage(file) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    const trimmed = trimTransparentPixels(image);
    URL.revokeObjectURL(url);
    return trimmed;
  }

  function trimTransparentPixels(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (data.data[(y * canvas.width + x) * 4 + 3] > 8) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX < 0) return canvas;
    const output = document.createElement('canvas');
    output.width = maxX - minX + 1;
    output.height = maxY - minY + 1;
    output.getContext('2d').drawImage(canvas, minX, minY, output.width, output.height, 0, 0, output.width, output.height);
    return output;
  }

  function addCreature(file, image) {
    const id = crypto.randomUUID();
    const creature = {
      id, name: file.name.replace(/\.[^.]+$/, ''), image,
      size: 'medium', height: PRESETS.medium.height, quantity: 1
    };
    state.creatures.push(creature);

    const card = els.template.content.firstElementChild.cloneNode(true);
    card.dataset.id = id;
    $('.thumb', card).src = image.toDataURL('image/png');
    $('.thumb', card).alt = `Imagem de ${creature.name}`;
    $('.name', card).value = creature.name;
    $('.height', card).value = creature.height;

    $('.name', card).addEventListener('input', event => { creature.name = event.target.value.trim() || 'Criatura'; refresh(); });
    $('.size', card).addEventListener('change', event => {
      creature.size = event.target.value;
      if (PRESETS[creature.size]) {
        creature.height = PRESETS[creature.size].height;
        $('.height', card).value = creature.height;
      }
      refresh();
    });
    $('.height', card).addEventListener('input', event => {
      creature.height = clampNumber(event.target.value, 8, 120, 32);
      creature.size = 'custom';
      $('.size', card).value = 'custom';
      refresh();
    });
    $('.quantity', card).addEventListener('input', event => { creature.quantity = Math.round(clampNumber(event.target.value, 1, 30, 1)); refresh(); });
    $('.remove', card).addEventListener('click', () => {
      state.creatures = state.creatures.filter(item => item.id !== id);
      card.remove();
      refresh();
    });
    els.list.appendChild(card);
  }

  function baseDiameter(creature) {
    if (PRESETS[creature.size]) return PRESETS[creature.size].base;
    return Math.min(70, Math.max(18, creature.height * .75));
  }

  function rotatedImageData(canvas) {
    const rotated = document.createElement('canvas');
    rotated.width = canvas.width;
    rotated.height = canvas.height;
    const ctx = rotated.getContext('2d');
    ctx.translate(rotated.width, rotated.height);
    ctx.rotate(Math.PI);
    ctx.drawImage(canvas, 0, 0);
    return rotated.toDataURL('image/png');
  }

  function buildItems() {
    const gap = clampNumber(els.gap.value, 1, 10, 2);
    const items = [];
    state.creatures.forEach(creature => {
      const aspect = creature.image.width / creature.image.height;
      const artworkWidth = creature.height * aspect;
      const base = baseDiameter(creature);
      const tabHeight = base / 2;
      const standeeWidth = Math.max(artworkWidth, base) + gap;
      const standeeHeight = creature.height * 2 + tabHeight * 2 + gap;
      for (let copy = 1; copy <= creature.quantity; copy += 1) {
        items.push({ type: 'standee', creature, copy, w: standeeWidth, h: standeeHeight, artworkWidth, base, tabHeight });
        items.push({ type: 'base', creature, copy, w: base + gap, h: base + gap, base });
      }
    });
    return items.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  }

  function pack(items, pageW, pageH, margin, gap) {
    const free = [{ x: margin, y: margin, w: pageW - margin * 2, h: pageH - margin * 2 }];
    const placed = [];
    for (const item of items) {
      let best = null;
      free.forEach((rect, index) => {
        if (item.w <= rect.w && item.h <= rect.h) {
          const score = Math.min(rect.w - item.w, rect.h - item.h) * 1000 + (rect.w * rect.h - item.w * item.h);
          if (!best || score < best.score) best = { rect, index, score };
        }
      });
      if (!best) return { placed, unplaced: items.slice(placed.length) };
      const box = { ...item, x: best.rect.x, y: best.rect.y };
      placed.push(box);
      const old = free.splice(best.index, 1)[0];
      const right = { x: old.x + item.w + gap, y: old.y, w: old.w - item.w - gap, h: item.h };
      const below = { x: old.x, y: old.y + item.h + gap, w: old.w, h: old.h - item.h - gap };
      if (right.w > 1 && right.h > 1) free.push(right);
      if (below.w > 1 && below.h > 1) free.push(below);
      free.sort((a, b) => a.y - b.y || a.x - b.x);
    }
    return { placed, unplaced: [] };
  }

  function calculateLayout() {
    const [pageW, pageH] = PAGE[els.orientation.value];
    const margin = clampNumber(els.margin.value, 3, 20, 7);
    const gap = clampNumber(els.gap.value, 1, 10, 2);
    const items = buildItems();
    const result = pack(items, pageW, pageH, margin, gap);
    return { pageW, pageH, margin, gap, items, ...result };
  }

  function drawMiniature(target, item, scale, pdf = false) {
    const { creature, x, y, w, h, base, tabHeight } = item;
    const artW = item.artworkWidth;
    const artH = creature.height;
    const bodyX = x + (w - artW) / 2;
    const centerY = y + h / 2;
    const centerX = x + w / 2;
    const tabR = base / 2;

    if (pdf) {
      const imageData = creature.image.toDataURL('image/png');
      const invertedImageData = rotatedImageData(creature.image);
      target.setDrawColor(110); target.setLineWidth(.2);
      target.line(x, centerY, x + w, centerY);
      target.line(centerX - tabR, y + tabHeight, centerX - tabR, centerY - artH);
      target.line(centerX + tabR, y + tabHeight, centerX + tabR, centerY - artH);
      target.ellipse(centerX, y + tabHeight, tabR, tabHeight, 'S');
      target.addImage(invertedImageData, 'PNG', bodyX, centerY - artH, artW, artH, undefined, 'FAST');
      target.addImage(imageData, 'PNG', bodyX, centerY, artW, artH, undefined, 'FAST');
      target.line(centerX - tabR, centerY + artH, centerX - tabR, y + h - tabHeight);
      target.line(centerX + tabR, centerY + artH, centerX + tabR, y + h - tabHeight);
      target.ellipse(centerX, y + h - tabHeight, tabR, tabHeight, 'S');
      target.setLineDashPattern([1.5, 1.2], 0); target.line(x, centerY, x + w, centerY); target.setLineDashPattern([], 0);
      return;
    }

    const ctx = target;
    ctx.save(); ctx.scale(scale, scale); ctx.strokeStyle = '#888'; ctx.lineWidth = .25;
    ctx.beginPath(); ctx.moveTo(x, centerY); ctx.lineTo(x + w, centerY); ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, y + tabHeight, tabR, Math.PI, 0); ctx.lineTo(centerX + tabR, centerY - artH); ctx.stroke();
    ctx.save(); ctx.translate(bodyX + artW, centerY); ctx.rotate(Math.PI); ctx.drawImage(creature.image, 0, 0, artW, artH); ctx.restore();
    ctx.drawImage(creature.image, bodyX, centerY, artW, artH);
    ctx.beginPath(); ctx.moveTo(centerX - tabR, centerY + artH); ctx.lineTo(centerX - tabR, y + h - tabHeight); ctx.arc(centerX, y + h - tabHeight, tabR, Math.PI, 0, true); ctx.lineTo(centerX + tabR, centerY + artH); ctx.stroke();
    ctx.setLineDash([1.5, 1.2]); ctx.beginPath(); ctx.moveTo(x, centerY); ctx.lineTo(x + w, centerY); ctx.stroke(); ctx.restore();
  }

  function drawBase(target, item, scale, pdf = false) {
    const d = item.base, cx = item.x + item.w / 2, cy = item.y + item.h / 2;
    const slot = clampNumber(els.slotWidth.value, .5, 5, 1.2);
    const slotLength = d * .55;
    if (pdf) {
      target.setDrawColor(110); target.setLineWidth(.2);
      target.circle(cx, cy, d / 2, 'S');
      target.rect(cx - slotLength / 2, cy - slot / 2, slotLength, slot, 'S');
      return;
    }
    const ctx = target; ctx.save(); ctx.scale(scale, scale); ctx.strokeStyle = '#888'; ctx.lineWidth = .25;
    ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(cx - slotLength / 2, cy - slot / 2, slotLength, slot); ctx.restore();
  }

  function renderPreview() {
    const layout = state.layout = calculateLayout();
    const canvas = els.canvas;
    canvas.width = Math.round(layout.pageW * MM_TO_PREVIEW);
    canvas.height = Math.round(layout.pageH * MM_TO_PREVIEW);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    layout.placed.forEach(item => item.type === 'standee' ? drawMiniature(ctx, item, MM_TO_PREVIEW) : drawBase(ctx, item, MM_TO_PREVIEW));

    const total = layout.items.length;
    const used = layout.placed.reduce((sum, item) => sum + item.w * item.h, 0);
    const printable = (layout.pageW - layout.margin * 2) * (layout.pageH - layout.margin * 2);
    els.usage.textContent = total ? `${layout.placed.length} de ${total} peças · ${Math.round(used / printable * 100)}% da área útil` : 'Folha vazia';

    if (!state.creatures.length) setStatus('neutral', 'Adicione pelo menos uma criatura.', false);
    else if (layout.unplaced.length) {
      const failed = layout.unplaced[0];
      setStatus('error', `${failed.creature.name} não cabe na folha A4. A peça precisa de ${failed.w.toFixed(0)} × ${failed.h.toFixed(0)} mm.`, false);
    } else setStatus('success', 'Todas as miniaturas e bases cabem na folha A4.', true);
  }

  function setStatus(type, message, enabled) {
    els.status.className = `status ${type}`;
    els.status.textContent = message;
    els.generate.disabled = !enabled;
  }

  function refresh() {
    els.empty.hidden = state.creatures.length > 0;
    renderPreview();
  }

  async function generatePdf() {
    if (!state.layout || state.layout.unplaced.length || !state.creatures.length) return;
    if (!window.jspdf) {
      setStatus('error', 'Não foi possível carregar o gerador de PDF. Verifique sua conexão e tente novamente.', false);
      return;
    }
    const { jsPDF } = window.jspdf;
    const layout = state.layout;
    const pdf = new jsPDF({ orientation: els.orientation.value, unit: 'mm', format: 'a4', compress: true });
    layout.placed.forEach(item => item.type === 'standee' ? drawMiniature(pdf, item, 1, true) : drawBase(pdf, item, 1, true));
    pdf.save('mighty-blade-miniaturas.pdf');
  }

  els.input.addEventListener('change', async event => {
    const files = [...event.target.files];
    for (const file of files) {
      try { addCreature(file, await loadImage(file)); }
      catch { setStatus('error', `Não foi possível abrir ${file.name}.`, false); }
    }
    event.target.value = '';
    refresh();
  });
  [els.orientation, els.margin, els.gap, els.slotWidth].forEach(element => element.addEventListener('input', refresh));
  els.generate.addEventListener('click', generatePdf);
  refresh();
})();
