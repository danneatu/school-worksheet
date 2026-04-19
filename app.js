const LETTER_RULES = {
  ascenders: new Set(["b", "d", "h", "k", "l", "t"]),
  descenders: new Set(["f", "g", "j", "p", "q", "y"]),
};

const DIM = {
  unit: 4,
  letterWidth: 32.2,
  lowHeight: 44.275,
  highHeight: 88.55,
  descHeight: 72,
  gDescHeight: 86,
  dotHeight: 16.1,
  dotGap: 7,
  dotDoubleGap: 5,
  stroke: 1.495,
  radius: 2.875,
  letterGap: 3.45,
  wordGap: 62.1,
  rowGap: 13.8,
  pageWidth: 595.28,
  pageHeight: 841.89,
  margin: 40,
  titleFontSize: 24,
  titleGap: 18,
};

const state = {
  words: [],
  title: "",
};

const STORAGE_KEY = "kaestchen_woerter_words";
const STORAGE_KEY_TITLE = "kaestchen_woerter_title";

const titleInput = document.getElementById("titleInput");
const wordInput = document.getElementById("wordInput");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const wordList = document.getElementById("wordList");
const pageEls = [document.getElementById("page1"), document.getElementById("page2")];

function getPreviewScale() {
  const pageWidth = pageEls[0]?.clientWidth || DIM.pageWidth;
  return pageWidth / DIM.pageWidth;
}

const usableWidth = DIM.pageWidth - DIM.margin * 2;
const usableHeight = DIM.pageHeight - DIM.margin * 2;

function saveWords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.words));
    localStorage.setItem(STORAGE_KEY_TITLE, state.title);
  } catch {
  }
}

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.words = parsed
        .map((word) => String(word))
        .map((word) => normalizeWord(word))
        .filter((word) => word.length > 0);
    }

    const rawTitle = localStorage.getItem(STORAGE_KEY_TITLE);
    state.title = rawTitle ? String(rawTitle).trim() : "";
    if (titleInput) {
      titleInput.value = state.title;
    }
  } catch {
  }
}

function normalizeWord(text) {
  return text.trim().replace(/\s+/g, "");
}

const UPPERCASE = new Set(["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","Ä","Ö","Ü"]);

function getLetterType(char) {
  const lower = char.toLowerCase();
  if (UPPERCASE.has(char)) return "ascender";
  if (LETTER_RULES.ascenders.has(lower)) return "ascender";
  if (LETTER_RULES.descenders.has(lower)) return "descender";
  return "low";
}

function hasDot(char) {
  return char === "i" || char === "j";
}

function hasDoubleDot(char) {
  return char === "ä" || char === "ö" || char === "ü";
}

function isTallDescender(char) {
  return char === "f";
}

function getDescenderHeight(char) {
  return char.toLowerCase() === "g" ? DIM.gDescHeight : DIM.descHeight;
}

function getVerticalModel() {
  const mainTop = DIM.dotHeight;
  const lowTop = mainTop + (DIM.highHeight - DIM.lowHeight);
  const descExtra = Math.max(0, DIM.gDescHeight - DIM.lowHeight);
  const wordHeight = mainTop + DIM.highHeight + descExtra;

  return {
    mainTop,
    lowTop,
    wordHeight,
  };
}

function getWordMetrics(word) {
  const letterCount = word.length;
  const baseWidth = letterCount * DIM.letterWidth + Math.max(0, letterCount - 1) * DIM.letterGap;
  const vm = getVerticalModel();
  return {
    width: baseWidth,
    height: vm.wordHeight,
  };
}

function layoutWords(words, titleText = "") {
  const hasTitle = titleText.trim().length > 0;
  const titleBlockHeight = hasTitle ? DIM.titleFontSize + DIM.titleGap : 0;
  const placed = [];
  let page = 0;
  let x = DIM.margin;
  let y = DIM.margin + titleBlockHeight;
  let rowHeight = 0;

  for (const word of words) {
    const metrics = getWordMetrics(word);
    const neededW = metrics.width;
    const neededH = metrics.height;

    if (x + neededW > DIM.margin + usableWidth) {
      x = DIM.margin;
      y += rowHeight + DIM.rowGap;
      rowHeight = 0;
    }

    if (y + neededH > DIM.margin + usableHeight) {
      page += 1;
      x = DIM.margin;
      y = DIM.margin;
      rowHeight = 0;
    }

    placed.push({ word, page, x, y, metrics });

    x += neededW + DIM.wordGap;
    rowHeight = Math.max(rowHeight, neededH);
  }

  return placed;
}

function createSvgEl(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function renderWordSvg(word, metrics, scale = 1) {
  const svg = createSvgEl("svg");
  svg.classList.add("word-svg");
  const strokePad = DIM.stroke / 2 + 1;
  svg.setAttribute("viewBox", `0 0 ${metrics.width + strokePad * 2} ${metrics.height + strokePad * 2}`);
  svg.setAttribute("width", String(metrics.width * scale));
  svg.setAttribute("height", String(metrics.height * scale));
  const vm = getVerticalModel();

  let cursorX = 0;
  for (const char of word) {
    const type = getLetterType(char);
    const isDot = hasDot(char);
    const isDoubleDot = hasDoubleDot(char);

    let rectHeight = DIM.lowHeight;
    let rectY = vm.lowTop;

    if (isTallDescender(char)) {
      rectHeight = (DIM.highHeight - DIM.lowHeight) + DIM.descHeight;
      rectY = vm.mainTop;
    } else if (type === "ascender") {
      rectHeight = DIM.highHeight;
      rectY = vm.mainTop;
    } else if (type === "descender") {
      rectHeight = getDescenderHeight(char);
      rectY = vm.lowTop;
    }

    const rect = createSvgEl("rect");
    rect.setAttribute("x", String(cursorX + strokePad));
    rect.setAttribute("y", String(rectY + strokePad));
    rect.setAttribute("width", String(DIM.letterWidth));
    rect.setAttribute("height", String(rectHeight));
    rect.setAttribute("rx", String(DIM.radius));
    rect.setAttribute("ry", String(DIM.radius));
    rect.setAttribute("fill", "white");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", String(DIM.stroke));
    svg.appendChild(rect);

    if (isDot) {
      const dotY = rectY - DIM.dotHeight - DIM.dotGap;
      const dot = createSvgEl("rect");
      dot.setAttribute("x", String(cursorX + strokePad));
      dot.setAttribute("y", String(dotY + strokePad));
      dot.setAttribute("width", String(DIM.letterWidth));
      dot.setAttribute("height", String(DIM.dotHeight));
      dot.setAttribute("rx", String(DIM.radius));
      dot.setAttribute("ry", String(DIM.radius));
      dot.setAttribute("fill", "white");
      dot.setAttribute("stroke", "black");
      dot.setAttribute("stroke-width", String(DIM.stroke));
      svg.appendChild(dot);
    }

    if (isDoubleDot) {
      const dotY = rectY - DIM.dotHeight - DIM.dotGap;
      const dotW = (DIM.letterWidth - DIM.dotDoubleGap) / 2;
      for (let d = 0; d < 2; d++) {
        const dotX = cursorX + d * (dotW + DIM.dotDoubleGap);
        const dot = createSvgEl("rect");
        dot.setAttribute("x", String(dotX + strokePad));
        dot.setAttribute("y", String(dotY + strokePad));
        dot.setAttribute("width", String(dotW));
        dot.setAttribute("height", String(DIM.dotHeight));
        dot.setAttribute("rx", String(DIM.radius));
        dot.setAttribute("ry", String(DIM.radius));
        dot.setAttribute("fill", "white");
        dot.setAttribute("stroke", "black");
        dot.setAttribute("stroke-width", String(DIM.stroke));
        svg.appendChild(dot);
      }
    }

    cursorX += DIM.letterWidth + DIM.letterGap;
  }

  return svg;
}

function renderWordList() {
  wordList.innerHTML = "";

  state.words.forEach((word, index) => {
    const chip = document.createElement("div");
    chip.className = "word-chip";
    const text = document.createElement("span");
    text.textContent = word;
    const del = document.createElement("button");
    del.className = "chip-del";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => {
      state.words.splice(index, 1);
      saveWords();
      render();
    });

    chip.appendChild(text);
    chip.appendChild(del);
    wordList.appendChild(chip);
  });
}

function clearPages() {
  for (const page of pageEls) {
    page.innerHTML = "";
  }
}

function renderPreviewTitle(scale) {
  if (!state.title) return;

  const titleEl = document.createElement("div");
  titleEl.className = "page-title";
  titleEl.textContent = state.title;
  titleEl.style.left = "50%";
  titleEl.style.transform = "translateX(-50%)";
  titleEl.style.top = `${DIM.margin * scale}px`;
  titleEl.style.fontSize = `${DIM.titleFontSize * scale}px`;
  pageEls[0].appendChild(titleEl);
}

function renderPages() {
  clearPages();

  const layout = layoutWords(state.words, state.title);
  const scale = getPreviewScale();
  const hasSecondPreviewPage = layout.some((entry) => entry.page === 1);
  pageEls[1].style.display = hasSecondPreviewPage ? "block" : "none";
  renderPreviewTitle(scale);

  layout.forEach((entry) => {
    if (entry.page > 1) return;
    const svg = renderWordSvg(entry.word, entry.metrics, scale);
    svg.style.left = `${entry.x * scale}px`;
    svg.style.top = `${entry.y * scale}px`;
    pageEls[entry.page].appendChild(svg);
  });
}

function render() {
  renderWordList();
  renderPages();
}

function addCurrentWord() {
  const cleaned = normalizeWord(wordInput.value);
  if (!cleaned) return;
  state.words.push(cleaned);
  saveWords();
  wordInput.value = "";
  render();
}

function drawWordPdf(pdf, entry) {
  const { word, x, y } = entry;
  const vm = getVerticalModel();
  let cursorX = x;

  for (const char of word) {
    const type = getLetterType(char);
    const isDot = hasDot(char);
    const isDoubleDot = hasDoubleDot(char);

    let rectHeight = DIM.lowHeight;
    let rectY = y + vm.lowTop;

    if (isTallDescender(char)) {
      rectHeight = (DIM.highHeight - DIM.lowHeight) + DIM.descHeight;
      rectY = y + vm.mainTop;
    } else if (type === "ascender") {
      rectHeight = DIM.highHeight;
      rectY = y + vm.mainTop;
    } else if (type === "descender") {
      rectHeight = getDescenderHeight(char);
      rectY = y + vm.lowTop;
    }

    pdf.roundedRect(cursorX, rectY, DIM.letterWidth, rectHeight, DIM.radius, DIM.radius, "S");

    if (isDot) {
      const dotY = rectY - DIM.dotHeight - DIM.dotGap;
      pdf.roundedRect(cursorX, dotY, DIM.letterWidth, DIM.dotHeight, DIM.radius, DIM.radius, "S");
    }

    if (isDoubleDot) {
      const dotY = rectY - DIM.dotHeight - DIM.dotGap;
      const dotW = (DIM.letterWidth - DIM.dotDoubleGap) / 2;
      for (let d = 0; d < 2; d++) {
        const dotX = cursorX + d * (dotW + DIM.dotDoubleGap);
        pdf.roundedRect(dotX, dotY, dotW, DIM.dotHeight, DIM.radius, DIM.radius, "S");
      }
    }

    cursorX += DIM.letterWidth + DIM.letterGap;
  }
}

function getExportFileName() {
  return "fach dokument.pdf";
}

async function exportPdf() {
  const jsPdfApi = window.jspdf && window.jspdf.jsPDF;
  if (!jsPdfApi) {
    alert("PDF-Export ist nicht verfügbar. Bitte Seite neu laden.");
    return;
  }

  if (exportBtn.disabled) return;
  exportBtn.disabled = true;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(DIM.stroke);

  const layout = layoutWords(state.words, state.title);

  const pagesWithEntries = [...new Set(layout.map((entry) => entry.page))]
    .sort((a, b) => a - b)
    .map((pageIndex) => layout.filter((entry) => entry.page === pageIndex))
    .filter((entries) => entries.length > 0);

  if (pagesWithEntries.length === 0) {
    if (state.title) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(DIM.titleFontSize);
      pdf.text(state.title, DIM.pageWidth / 2, DIM.margin + DIM.titleFontSize, { align: "center" });
    }
    try {
      await pdf.save(getExportFileName(), { returnPromise: true });
    } finally {
      exportBtn.disabled = false;
    }
    return;
  }

  pagesWithEntries.forEach((entries, index) => {
    if (index > 0) pdf.addPage("a4", "portrait");
    if (index === 0 && state.title) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(DIM.titleFontSize);
      pdf.text(state.title, DIM.pageWidth / 2, DIM.margin + DIM.titleFontSize, { align: "center" });
    }
    entries.forEach((entry) => {
      drawWordPdf(pdf, entry);
    });
  });

  try {
    await pdf.save(getExportFileName(), { returnPromise: true });
  } catch {
    pdf.save(getExportFileName());
  } finally {
    exportBtn.disabled = false;
  }
}

function initializePreviewPageVisibility() {
  pageEls[0].style.display = "block";
  pageEls[1].style.display = "none";
}

addBtn.addEventListener("click", addCurrentWord);
titleInput.addEventListener("input", () => {
  state.title = titleInput.value.trim();
  saveWords();
  render();
});
clearBtn.addEventListener("click", () => {
  state.words = [];
  saveWords();
  render();
});
exportBtn.addEventListener("click", exportPdf);

wordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCurrentWord();
  }
});

window.addEventListener("resize", renderPages);

initializePreviewPageVisibility();
loadWords();
render();