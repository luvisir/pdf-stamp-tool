import './styles.css';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

import { getEdgeStampPlacement, pdfRectToScreenRect, screenRectToPdfRect } from './stampGeometry.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const app = document.querySelector('#app');

const state = {
  pdfBytes: null,
  pdfDoc: null,
  pdfName: '',
  pageCount: 0,
  currentPage: 1,
  pageSize: null,
  viewportSize: null,
  sealBytes: null,
  sealUrl: '',
  sealImage: null,
  normalEnabled: true,
  edgeEnabled: false,
  normalStamps: new Map(),
  hiddenNormalPages: new Set(),
  selectedLayer: 'normal',
  edgeStamp: {
    edge: 'right',
    pageStart: 1,
    pageEnd: 1,
    top: 180,
    pushIn: 85,
    height: 110,
    rotation: 0,
    opacity: 0.9,
  },
  dragging: null,
};

app.innerHTML = `
  <main class="app-shell">
    <aside class="sidebar">
      <section class="panel">
        <h1>PDF 合同盖章</h1>
        <p class="muted">本地处理，不上传合同和章图。</p>
      </section>

      <section class="panel">
        <h2>文件</h2>
        <label class="file-button">
          <input id="pdfInput" type="file" accept="application/pdf" />
          <span>上传合同 PDF</span>
        </label>
        <label class="file-button">
          <input id="sealInput" type="file" accept="image/png" />
          <span>上传章 PNG</span>
        </label>
        <p id="fileStatus" class="status">请选择 PDF 和 PNG 章图。</p>
      </section>

      <section class="panel">
        <h2>盖章类型</h2>
        <label class="check-row">
          <input id="normalToggle" type="checkbox" checked />
          <span>普通章</span>
        </label>
        <label class="check-row">
          <input id="edgeToggle" type="checkbox" />
          <span>骑缝章</span>
        </label>
      </section>

      <section class="panel page-panel">
        <h2>页面</h2>
        <div id="pageList" class="page-list"></div>
      </section>
    </aside>

    <section class="workspace">
      <div class="toolbar">
        <button id="prevPage" type="button">上一页</button>
        <span id="pageIndicator">未加载 PDF</span>
        <button id="nextPage" type="button">下一页</button>
      </div>
      <div id="previewWrap" class="preview-wrap">
        <div id="emptyState" class="empty-state">
          <strong>上传 PDF 后开始盖章</strong>
          <span>支持普通章、骑缝章，或两者同时使用。</span>
        </div>
        <div id="pageStage" class="page-stage hidden">
          <canvas id="pdfCanvas"></canvas>
          <div id="overlayLayer" class="overlay-layer"></div>
        </div>
      </div>
    </section>

    <aside class="sidebar rightbar">
      <section class="panel">
        <h2>当前图层</h2>
        <div class="segmented">
          <button id="selectNormal" class="active" type="button">普通章</button>
          <button id="selectEdge" type="button">骑缝章</button>
        </div>
      </section>

      <section id="normalPanel" class="panel">
        <h2>普通章设置</h2>
        <label>宽度（mm）<input id="normalWidth" type="number" min="10" max="200" value="42" /></label>
        <label>旋转（度）<input id="normalRotation" type="number" min="-180" max="180" value="0" /></label>
        <label>透明度（%）<input id="normalOpacity" type="number" min="10" max="100" value="90" /></label>
        <button id="centerNormal" type="button">放到当前页中间</button>
        <button id="deleteNormal" class="danger" type="button">删除当前页公章</button>
      </section>

      <section id="edgePanel" class="panel hidden">
        <h2>骑缝章设置</h2>
        <label>页码开始<input id="edgeStart" type="number" min="1" value="1" /></label>
        <label>页码结束<input id="edgeEnd" type="number" min="1" value="1" /></label>
        <label>距页面顶部（mm）<input id="edgeTop" type="number" min="0" value="60" /></label>
        <label>压入页面（mm）<input id="edgePushIn" type="number" min="0" max="160" value="30" /></label>
        <label>高度（mm）<input id="edgeHeight" type="number" min="10" max="220" value="42" /></label>
        <label>旋转（度）<input id="edgeRotation" type="number" min="-180" max="180" value="0" /></label>
        <label>透明度（%）<input id="edgeOpacity" type="number" min="10" max="100" value="90" /></label>
      </section>

      <section class="panel">
        <button id="exportPdf" class="primary" type="button">导出盖章 PDF</button>
        <p id="message" class="status"></p>
      </section>
    </aside>
  </main>
`;

const els = {
  pdfInput: document.querySelector('#pdfInput'),
  sealInput: document.querySelector('#sealInput'),
  fileStatus: document.querySelector('#fileStatus'),
  normalToggle: document.querySelector('#normalToggle'),
  edgeToggle: document.querySelector('#edgeToggle'),
  pageList: document.querySelector('#pageList'),
  prevPage: document.querySelector('#prevPage'),
  nextPage: document.querySelector('#nextPage'),
  pageIndicator: document.querySelector('#pageIndicator'),
  emptyState: document.querySelector('#emptyState'),
  pageStage: document.querySelector('#pageStage'),
  pdfCanvas: document.querySelector('#pdfCanvas'),
  overlayLayer: document.querySelector('#overlayLayer'),
  selectNormal: document.querySelector('#selectNormal'),
  selectEdge: document.querySelector('#selectEdge'),
  normalPanel: document.querySelector('#normalPanel'),
  edgePanel: document.querySelector('#edgePanel'),
  normalWidth: document.querySelector('#normalWidth'),
  normalRotation: document.querySelector('#normalRotation'),
  normalOpacity: document.querySelector('#normalOpacity'),
  centerNormal: document.querySelector('#centerNormal'),
  deleteNormal: document.querySelector('#deleteNormal'),
  edgeStart: document.querySelector('#edgeStart'),
  edgeEnd: document.querySelector('#edgeEnd'),
  edgeTop: document.querySelector('#edgeTop'),
  edgePushIn: document.querySelector('#edgePushIn'),
  edgeHeight: document.querySelector('#edgeHeight'),
  edgeRotation: document.querySelector('#edgeRotation'),
  edgeOpacity: document.querySelector('#edgeOpacity'),
  exportPdf: document.querySelector('#exportPdf'),
  message: document.querySelector('#message'),
};

const mmToPt = (mm) => (Number(mm) * 72) / 25.4;
const ptToMm = (pt) => (Number(pt) * 25.4) / 72;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function setMessage(text, type = '') {
  els.message.textContent = text;
  els.message.dataset.type = type;
}

function updateFileStatus() {
  const pdf = state.pdfName || '未选择 PDF';
  const seal = state.sealImage ? `章图 ${state.sealImage.naturalWidth}×${state.sealImage.naturalHeight}` : '未选择 PNG';
  els.fileStatus.textContent = `${pdf}；${seal}`;
}

async function readFileBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('章图读取失败，请确认是 PNG 图片。'));
    image.src = url;
  });
}

function defaultNormalStamp(pageSize) {
  const width = mmToPt(Number(els.normalWidth.value));
  const aspect = state.sealImage ? state.sealImage.naturalHeight / state.sealImage.naturalWidth : 1;
  const height = width * aspect;

  return {
    x: pageSize.width - width - mmToPt(30),
    y: mmToPt(35),
    width,
    height,
    rotation: Number(els.normalRotation.value) || 0,
    opacity: Number(els.normalOpacity.value) / 100,
  };
}

function getCurrentNormalStamp() {
  if (state.hiddenNormalPages.has(state.currentPage)) {
    return null;
  }

  if (!state.normalStamps.has(state.currentPage) && state.pageSize && state.sealImage) {
    state.normalStamps.set(state.currentPage, defaultNormalStamp(state.pageSize));
  }

  return state.normalStamps.get(state.currentPage);
}

function syncNormalInputsFromStamp() {
  const stamp = state.normalStamps.get(state.currentPage);
  if (!stamp) return;

  els.normalWidth.value = Math.round(ptToMm(stamp.width));
  els.normalRotation.value = Math.round(stamp.rotation);
  els.normalOpacity.value = Math.round(stamp.opacity * 100);
}

async function renderCurrentPage() {
  if (!state.pdfDoc) return;

  const page = await state.pdfDoc.getPage(state.currentPage);
  const baseViewport = page.getViewport({ scale: 1 });
  const maxWidth = Math.min(760, document.querySelector('.workspace').clientWidth - 56);
  const scale = maxWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });
  const context = els.pdfCanvas.getContext('2d');

  els.pdfCanvas.width = Math.floor(viewport.width);
  els.pdfCanvas.height = Math.floor(viewport.height);
  els.pdfCanvas.style.width = `${Math.floor(viewport.width)}px`;
  els.pdfCanvas.style.height = `${Math.floor(viewport.height)}px`;
  els.overlayLayer.style.width = `${Math.floor(viewport.width)}px`;
  els.overlayLayer.style.height = `${Math.floor(viewport.height)}px`;
  els.pageStage.style.width = `${Math.floor(viewport.width)}px`;
  els.pageStage.style.height = `${Math.floor(viewport.height)}px`;

  await page.render({ canvasContext: context, viewport }).promise;

  state.pageSize = { width: baseViewport.width, height: baseViewport.height };
  state.viewportSize = { width: viewport.width, height: viewport.height };
  els.pageIndicator.textContent = `第 ${state.currentPage} / ${state.pageCount} 页`;
  renderPageList();
  renderOverlays();
}

function renderPageList() {
  els.pageList.innerHTML = '';

  for (let page = 1; page <= state.pageCount; page += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `第 ${page} 页`;
    button.className = page === state.currentPage ? 'active' : '';
    button.addEventListener('click', async () => {
      state.currentPage = page;
      await renderCurrentPage();
    });
    els.pageList.append(button);
  }
}

function renderOverlays() {
  els.overlayLayer.innerHTML = '';

  if (!state.sealImage || !state.viewportSize || !state.pageSize) return;

  if (state.normalEnabled) {
    const stamp = getCurrentNormalStamp();
    if (stamp) {
      const rect = pdfRectToScreenRect({
        pdfRect: stamp,
        viewport: state.viewportSize,
        page: state.pageSize,
      });
      const image = document.createElement('img');
      image.src = state.sealUrl;
      image.className = `stamp-overlay ${state.selectedLayer === 'normal' ? 'selected' : ''}`;
      image.style.left = `${rect.x}px`;
      image.style.top = `${rect.y}px`;
      image.style.width = `${rect.width}px`;
      image.style.height = `${rect.height}px`;
      image.style.opacity = String(stamp.opacity);
      image.style.transform = `rotate(${stamp.rotation}deg)`;
      image.draggable = false;
      image.title = '拖拽移动普通章';
      image.addEventListener('pointerdown', (event) => startNormalDrag(event, rect));
      els.overlayLayer.append(image);
    }
  }

  if (state.edgeEnabled) {
    renderEdgeOverlay();
  }
}

function renderEdgeOverlay() {
  const { pageStart, pageEnd, height, opacity, rotation } = state.edgeStamp;
  if (state.currentPage < pageStart || state.currentPage > pageEnd) return;

  const coveredPages = pageEnd - pageStart + 1;
  const pageOffset = state.currentPage - pageStart;
  const placement = getEdgeStampPlacement({
    page: state.pageSize,
    settings: state.edgeStamp,
    image: { width: state.sealImage.naturalWidth, height: state.sealImage.naturalHeight },
    pageCount: coveredPages,
    pageOffset,
  });
  const rect = pdfRectToScreenRect({
    pdfRect: placement,
    viewport: state.viewportSize,
    page: state.pageSize,
  });

  const edge = document.createElement('div');
  edge.className = `edge-stamp-overlay ${state.selectedLayer === 'edge' ? 'selected' : ''}`;
  edge.style.left = `${rect.x}px`;
  edge.style.top = `${rect.y}px`;
  edge.style.width = `${rect.width}px`;
  edge.style.height = `${rect.height}px`;
  edge.style.opacity = String(opacity);
  edge.style.transform = `rotate(${rotation}deg)`;

  const image = document.createElement('img');
  image.src = state.sealUrl;
  image.draggable = false;
  image.style.height = `${rect.height}px`;
  image.style.width = `${rect.width * coveredPages}px`;
  image.style.transform = `translateX(${-pageOffset * rect.width}px)`;

  edge.append(image);
  edge.addEventListener('pointerdown', (event) => startEdgeDrag(event));
  els.overlayLayer.append(edge);
}

function startNormalDrag(event, rect) {
  event.preventDefault();
  state.selectedLayer = 'normal';
  updateLayerPanels();
  state.dragging = {
    type: 'normal',
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    rect,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function startEdgeDrag(event) {
  event.preventDefault();
  state.selectedLayer = 'edge';
  updateLayerPanels();
  state.dragging = {
    type: 'edge',
    pointerId: event.pointerId,
    startY: event.clientY,
    top: state.edgeStamp.top,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (!state.dragging || !state.viewportSize || !state.pageSize) return;

  if (state.dragging.type === 'normal') {
    const nextRect = {
      ...state.dragging.rect,
      x: state.dragging.rect.x + event.clientX - state.dragging.startX,
      y: state.dragging.rect.y + event.clientY - state.dragging.startY,
    };

    const pdfRect = screenRectToPdfRect({
      screenRect: nextRect,
      viewport: state.viewportSize,
      page: state.pageSize,
    });

    pdfRect.x = clamp(pdfRect.x, 0, state.pageSize.width - pdfRect.width);
    pdfRect.y = clamp(pdfRect.y, 0, state.pageSize.height - pdfRect.height);
    pdfRect.rotation = Number(els.normalRotation.value) || 0;
    pdfRect.opacity = Number(els.normalOpacity.value) / 100;
    state.normalStamps.set(state.currentPage, pdfRect);
  }

  if (state.dragging.type === 'edge') {
    const deltaScreen = event.clientY - state.dragging.startY;
    const deltaPdf = deltaScreen * (state.pageSize.height / state.viewportSize.height);
    state.edgeStamp.top = clamp(state.dragging.top + deltaPdf, 0, state.pageSize.height - state.edgeStamp.height);
    els.edgeTop.value = Math.round(ptToMm(state.edgeStamp.top));
  }

  renderOverlays();
}

function onPointerUp() {
  state.dragging = null;
}

function updateLayerPanels() {
  els.selectNormal.classList.toggle('active', state.selectedLayer === 'normal');
  els.selectEdge.classList.toggle('active', state.selectedLayer === 'edge');
  els.normalPanel.classList.toggle('hidden', state.selectedLayer !== 'normal');
  els.edgePanel.classList.toggle('hidden', state.selectedLayer !== 'edge');
  renderOverlays();
}

function updateStampFromInputs() {
  const stamp = getCurrentNormalStamp();
  if (!stamp || !state.sealImage) return;

  const width = mmToPt(els.normalWidth.value);
  const aspect = state.sealImage.naturalHeight / state.sealImage.naturalWidth;
  stamp.width = width;
  stamp.height = width * aspect;
  stamp.rotation = Number(els.normalRotation.value) || 0;
  stamp.opacity = Number(els.normalOpacity.value) / 100;
  state.normalStamps.set(state.currentPage, stamp);
  renderOverlays();
}

function updateEdgeFromInputs() {
  state.edgeStamp.pageStart = clamp(Number(els.edgeStart.value) || 1, 1, state.pageCount || 1);
  state.edgeStamp.pageEnd = clamp(Number(els.edgeEnd.value) || state.pageCount || 1, state.edgeStamp.pageStart, state.pageCount || 1);
  state.edgeStamp.top = mmToPt(els.edgeTop.value);
  state.edgeStamp.pushIn = mmToPt(els.edgePushIn.value);
  state.edgeStamp.height = mmToPt(els.edgeHeight.value);
  state.edgeStamp.rotation = Number(els.edgeRotation.value) || 0;
  state.edgeStamp.opacity = Number(els.edgeOpacity.value) / 100;
  els.edgeStart.value = state.edgeStamp.pageStart;
  els.edgeEnd.value = state.edgeStamp.pageEnd;
  renderOverlays();
}

async function handlePdfUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    state.pdfBytes = await readFileBytes(file);
    state.pdfName = file.name;
    state.pdfDoc = await pdfjsLib.getDocument({ data: state.pdfBytes.slice() }).promise;
    state.pageCount = state.pdfDoc.numPages;
    state.currentPage = 1;
    state.edgeStamp.pageStart = 1;
    state.edgeStamp.pageEnd = state.pageCount;
    els.edgeStart.max = state.pageCount;
    els.edgeEnd.max = state.pageCount;
    els.edgeEnd.value = state.pageCount;
    els.emptyState.classList.add('hidden');
    els.pageStage.classList.remove('hidden');
    updateFileStatus();
    await renderCurrentPage();
    setMessage('PDF 已加载。', 'success');
  } catch (error) {
    console.error(error);
    setMessage('PDF 读取失败，请确认不是加密或损坏文件。', 'error');
  }
}

async function handleSealUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    state.sealBytes = await readFileBytes(file);
    if (state.sealUrl) URL.revokeObjectURL(state.sealUrl);
    state.sealUrl = URL.createObjectURL(file);
    state.sealImage = await loadImageFromUrl(state.sealUrl);
    updateFileStatus();
    renderOverlays();
    setMessage('章图已加载。', 'success');
  } catch (error) {
    console.error(error);
    setMessage(error.message, 'error');
  }
}

async function cropSealSlice(pageOffset, pageCount) {
  const source = await createImageBitmap(new Blob([state.sealBytes], { type: 'image/png' }));
  const sliceWidth = source.width / pageCount;
  const sx = sliceWidth * pageOffset;
  const sw = pageOffset === pageCount - 1 ? source.width - sx : sliceWidth;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(sw);
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  context.drawImage(source, sx, 0, sw, source.height, 0, 0, canvas.width, canvas.height);

  return new Uint8Array(await new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('骑缝章切片失败。'));
        return;
      }
      resolve(await blob.arrayBuffer());
    }, 'image/png');
  }));
}

async function exportPdf() {
  if (!state.pdfBytes) {
    setMessage('请先上传 PDF。', 'error');
    return;
  }

  if (!state.sealBytes) {
    setMessage('请先上传 PNG 章图。', 'error');
    return;
  }

  if (!state.normalEnabled && !state.edgeEnabled) {
    setMessage('请至少选择普通章或骑缝章。', 'error');
    return;
  }

  try {
    setMessage('正在导出 PDF...', '');
    const pdfDoc = await PDFDocument.load(state.pdfBytes.slice());
    const pages = pdfDoc.getPages();
    const sealPng = await pdfDoc.embedPng(state.sealBytes);

    if (state.normalEnabled) {
      for (const [pageNumber, stamp] of state.normalStamps) {
        const page = pages[pageNumber - 1];
        if (!page) continue;
        page.drawImage(sealPng, {
          x: stamp.x,
          y: stamp.y,
          width: stamp.width,
          height: stamp.height,
          rotate: degrees(stamp.rotation || 0),
          opacity: stamp.opacity,
        });
      }
    }

    if (state.edgeEnabled) {
      const pageStart = state.edgeStamp.pageStart;
      const pageEnd = state.edgeStamp.pageEnd;
      const pageCount = pageEnd - pageStart + 1;

      for (let pageNumber = pageStart; pageNumber <= pageEnd; pageNumber += 1) {
        const page = pages[pageNumber - 1];
        const sliceBytes = await cropSealSlice(pageNumber - pageStart, pageCount);
        const slicePng = await pdfDoc.embedPng(sliceBytes);
        const { width, height } = page.getSize();
        const placement = getEdgeStampPlacement({
          page: { width, height },
          settings: state.edgeStamp,
          image: { width: state.sealImage.naturalWidth, height: state.sealImage.naturalHeight },
          pageCount,
          pageOffset: pageNumber - pageStart,
        });

        page.drawImage(slicePng, {
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          rotate: degrees(state.edgeStamp.rotation || 0),
          opacity: state.edgeStamp.opacity,
        });
      }
    }

    const stampedBytes = await pdfDoc.save();
    const blob = new Blob([stampedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = state.pdfName.replace(/\.pdf$/i, '') || 'contract';
    link.href = url;
    link.download = `${baseName}-盖章.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('导出完成。', 'success');
  } catch (error) {
    console.error(error);
    setMessage('导出失败，请换一个 PDF 或章图再试。', 'error');
  }
}

els.pdfInput.addEventListener('change', handlePdfUpload);
els.sealInput.addEventListener('change', handleSealUpload);
els.normalToggle.addEventListener('change', () => {
  state.normalEnabled = els.normalToggle.checked;
  renderOverlays();
});
els.edgeToggle.addEventListener('change', () => {
  state.edgeEnabled = els.edgeToggle.checked;
  renderOverlays();
});
els.prevPage.addEventListener('click', async () => {
  state.currentPage = clamp(state.currentPage - 1, 1, state.pageCount || 1);
  await renderCurrentPage();
  syncNormalInputsFromStamp();
});
els.nextPage.addEventListener('click', async () => {
  state.currentPage = clamp(state.currentPage + 1, 1, state.pageCount || 1);
  await renderCurrentPage();
  syncNormalInputsFromStamp();
});
els.selectNormal.addEventListener('click', () => {
  state.selectedLayer = 'normal';
  updateLayerPanels();
});
els.selectEdge.addEventListener('click', () => {
  state.selectedLayer = 'edge';
  updateLayerPanels();
});
els.centerNormal.addEventListener('click', () => {
  if (!state.pageSize || !state.sealImage) return;
  state.hiddenNormalPages.delete(state.currentPage);
  const stamp = defaultNormalStamp(state.pageSize);
  stamp.x = (state.pageSize.width - stamp.width) / 2;
  stamp.y = (state.pageSize.height - stamp.height) / 2;
  state.normalStamps.set(state.currentPage, stamp);
  syncNormalInputsFromStamp();
  renderOverlays();
});
els.deleteNormal.addEventListener('click', () => {
  state.normalStamps.delete(state.currentPage);
  state.hiddenNormalPages.add(state.currentPage);
  renderOverlays();
  setMessage(`已删除第 ${state.currentPage} 页的普通章。`, 'success');
});
[els.normalWidth, els.normalRotation, els.normalOpacity].forEach((input) => {
  input.addEventListener('input', updateStampFromInputs);
});
[els.edgeStart, els.edgeEnd, els.edgeTop, els.edgePushIn, els.edgeHeight, els.edgeRotation, els.edgeOpacity].forEach((input) => {
  input.addEventListener('input', updateEdgeFromInputs);
});
els.exportPdf.addEventListener('click', exportPdf);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('resize', () => {
  if (state.pdfDoc) renderCurrentPage();
});
