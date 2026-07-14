/* global chrome */
(function () {
  "use strict";

  function isVisible(node) {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 20 && rect.height > 12 && style.visibility !== "hidden" && style.display !== "none";
  }

  function nodeSignature(node) {
    const parts = [];
    let current = node;
    for (let depth = 0; current && depth < 7; depth += 1, current = current.parentElement) {
      parts.push(
        current.id || "",
        typeof current.className === "string" ? current.className : "",
        current.getAttribute?.("name") || "",
        current.getAttribute?.("role") || "",
        current.getAttribute?.("title") || "",
        current.getAttribute?.("placeholder") || "",
        current.getAttribute?.("aria-label") || "",
        current.getAttribute?.("data-placeholder") || "",
        current.getAttribute?.("data-testid") || ""
      );
    }
    return parts.join(" ");
  }

  function isNonBodyEditor(node) {
    const signature = nodeSignature(node);
    return /(^|[\s_-])(title|digest|summary|cover|author|nickname|copyright|share)([\s_-]|$)|标题|摘要|封面|作者|原文链接|转载|声明/i.test(signature);
  }

  function editorCandidates(documentRef) {
    const candidates = [];
    for (const node of documentRef.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]')) {
      const rect = node.getBoundingClientRect();
      if (isVisible(node) && rect.height > 80 && !isNonBodyEditor(node)) {
        candidates.push({ node, documentRef, host: node, label: node.id || node.className || "正文编辑器" });
      }
    }
    for (const frame of documentRef.querySelectorAll("iframe")) {
      try {
        const frameDocument = frame.contentDocument;
        const body = frameDocument?.body;
        if (body && (body.isContentEditable || body.getAttribute("contenteditable") === "true") && isVisible(frame) && !isNonBodyEditor(body)) {
          candidates.push({ node: body, documentRef: frameDocument, host: frame, label: `iframe#${frame.id || "正文编辑器"}` });
        }
      } catch (_) { /* 跨域 iframe 无法安全写入。 */ }
    }
    return candidates;
  }

  function findEditor() {
    const candidates = editorCandidates(document);
    candidates.sort((a, b) => {
      const aRect = a.host.getBoundingClientRect();
      const bRect = b.host.getBoundingClientRect();
      const aLabel = `${a.label || ""} ${nodeSignature(a.node)}`;
      const bLabel = `${b.label || ""} ${nodeSignature(b.node)}`;
      const aScore = (/appmsg|rich_media|editor|ueditor|content/i.test(aLabel) ? 1000000 : 0) + aRect.width * aRect.height;
      const bScore = (/appmsg|rich_media|editor|ueditor|content/i.test(bLabel) ? 1000000 : 0) + bRect.width * bRect.height;
      return bScore - aScore || (b.node.textContent || "").length - (a.node.textContent || "").length;
    });
    return candidates[0] || null;
  }

  function dispatchInput(node, inputType) {
    try {
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType, data: null }));
    } catch (_) {
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }
    node.dispatchEvent(new Event("change", { bubbles: true }));
    node.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
    node.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function htmlFeatures(documentRef, html) {
    const probe = documentRef.createElement("div");
    probe.innerHTML = html || "";
    return {
      svg: probe.querySelectorAll("svg").length,
      styled: probe.querySelectorAll("[style]").length,
      text: (probe.textContent || "").replace(/\s+/g, " ").trim().length
    };
  }

  function editorFeatures(node) {
    return {
      svg: node.querySelectorAll("svg").length,
      styled: node.querySelectorAll("[style]").length,
      text: (node.textContent || "").replace(/\s+/g, " ").trim().length
    };
  }

  function insertInto(editor, html) {
    const { node, documentRef } = editor;
    node.focus();
    const expected = htmlFeatures(documentRef, html);
    let method = "DOM 高保真写入";
    try {
      // 直接恢复已转换好的 DOM，避免 execCommand 的“粘贴过滤”提前剥离 style 与 SVG。
      node.innerHTML = html;
    } catch (_) {
      method = "编辑器原生 HTML 回退";
      const selection = documentRef.defaultView?.getSelection();
      const range = documentRef.createRange();
      range.selectNodeContents(node);
      selection?.removeAllRanges();
      selection?.addRange(range);
      documentRef.execCommand("insertHTML", false, html);
    }
    if (!node.innerHTML.trim()) throw new Error("正文编辑器未接受导入内容。");
    dispatchInput(node, "insertFromPaste");
    const actual = editorFeatures(node);
    const missing = [];
    if (expected.svg && actual.svg < expected.svg) missing.push(`SVG ${actual.svg}/${expected.svg}`);
    if (expected.styled && actual.styled < expected.styled) missing.push(`内联样式 ${actual.styled}/${expected.styled}`);
    return {
      method,
      length: node.innerHTML.length,
      expected,
      actual,
      visualWarning: missing.length ? `编辑器已在写入时清理：${missing.join("，")}。请勿保存，并把当前页面截图发给我。` : ""
    };
  }

  function candidateForField(kind) {
    const signals = kind === "title"
      ? /(^|[\s_-])(title|article_title|appmsg_title)([\s_-]|$)|标题/i
      : /(^|[\s_-])(author|author_name|nickname)([\s_-]|$)|作者/i;
    const exclude = /source|html|code|源码|源代码|摘要|digest|summary|封面|cover/i;
    const candidates = [];
    for (const node of document.querySelectorAll("input, textarea, [contenteditable='true'], [contenteditable='plaintext-only']")) {
      if (!isVisible(node)) continue;
      const marker = nodeSignature(node);
      if (!signals.test(marker) || exclude.test(marker)) continue;
      const rect = node.getBoundingClientRect();
      let score = rect.width * rect.height;
      if (kind === "title" && /(^|[\s_-])title([\s_-]|$)|标题/i.test(marker)) score += 1000000;
      if (kind === "author" && /(^|[\s_-])author([\s_-]|$)|作者/i.test(marker)) score += 1000000;
      candidates.push({ node, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.node || null;
  }

  function writeField(kind, value) {
    if (!value) return false;
    const node = candidateForField(kind);
    if (!node) return false;
    node.focus();
    if (node instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(node, value);
      else node.value = value;
    } else if (node instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(node, value);
      else node.value = value;
    } else {
      node.textContent = value;
    }
    dispatchInput(node, "insertText");
    return true;
  }

  function showToast(message, error) {
    const id = "codex-wechat-html-importer-toast";
    document.getElementById(id)?.remove();
    const toast = document.createElement("div");
    toast.id = id;
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:24px;bottom:24px;z-index:2147483647;max-width:360px;padding:12px 14px;border-radius:8px;box-shadow:0 8px 26px rgba(0,0,0,.18);background:${error ? "#fff1f0" : "#e6f6ee"};color:${error ? "#a61b1b" : "#1f6a47"};font:14px/1.5 -apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;`;
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 5500);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== "WECHAT_IMPORT_HTML") return;
    try {
      const editor = findEditor();
      if (!editor) {
        const error = "未找到正文编辑区。请先进入“新建图文”，再点击一次正文空白区域后重试。";
        showToast(error, true);
        sendResponse({ ok: false, error });
        return;
      }
      const titleWritten = writeField("title", message.title || "");
      const authorWritten = writeField("author", message.author || "");
      const result = insertInto(editor, message.html || "");
      showToast("正文已写入公众号编辑器。请预览并手动保存草稿。", false);
      sendResponse({ ok: true, editor: editor.label, insertMethod: result.method, bodyLength: result.length, titleWritten, authorWritten });
    } catch (error) {
      const text = `写入失败：${error.message}`;
      showToast(text, true);
      sendResponse({ ok: false, error: text });
    }
  });
})();
