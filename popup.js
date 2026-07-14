/* global chrome, WechatHtmlConverter */
(function () {
  "use strict";

  const source = document.getElementById("source");
  const fileInput = document.getElementById("fileInput");
  const titleInput = document.getElementById("articleTitle");
  const authorInput = document.getElementById("articleAuthor");
  const metadataHint = document.getElementById("metadataHint");
  const status = document.getElementById("status");
  const report = document.getElementById("report");
  let converted = null;
  let titleEdited = false;
  let authorEdited = false;
  let scanTimer = null;

  function setStatus(text, type) {
    status.textContent = text;
    status.className = `status ${type || ""}`;
  }

  async function sendToEditor(tabId, payload) {
    try {
      return await chrome.tabs.sendMessage(tabId, payload);
    } catch (error) {
      // 已打开的后台页可能早于扩展更新，按需加载一次页面脚本。
      if (!/Receiving end does not exist|Could not establish connection/i.test(error.message || "")) throw error;
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      return chrome.tabs.sendMessage(tabId, payload);
    }
  }

  function updateMetadata(force) {
    const value = source.value.trim();
    if (!value) {
      metadataHint.textContent = "等待读取 HTML";
      return null;
    }
    const metadata = WechatHtmlConverter.extractMetadata(value);
    if (force || !titleEdited) titleInput.value = metadata.title || "";
    if (force || !authorEdited) authorInput.value = metadata.author || "";
    metadataHint.textContent = metadata.sources.length
      ? `已识别：${metadata.sources.join(" · ")}`
      : "未找到明确标题或作者，可手动补充";
    return metadata;
  }

  function convert() {
    try {
      const metadata = updateMetadata(false);
      converted = WechatHtmlConverter.convertHtml(source.value);
      report.textContent = converted.report;
      const information = [
        titleInput.value.trim() ? "标题已就绪" : "未识别标题",
        authorInput.value.trim() ? "作者已就绪" : "未识别作者"
      ].join("；");
      setStatus(`直通内容已准备完成（${converted.html.length.toLocaleString()} 字符）。${information}。`, "success");
      return { ...converted, metadata };
    } catch (error) {
      setStatus(error.message, "error");
      throw error;
    }
  }

  function scheduleMetadataScan() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => {
      try { updateMetadata(false); } catch (_) { /* 粘贴过程中的不完整 HTML 可忽略。 */ }
    }, 180);
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    source.value = await file.text();
    titleEdited = false;
    authorEdited = false;
    updateMetadata(true);
    converted = null;
    setStatus(`已读取：${file.name}。请切到公众号“新建图文”页面后导入。`);
  });
  source.addEventListener("input", () => {
    converted = null;
    scheduleMetadataScan();
  });
  titleInput.addEventListener("input", () => { titleEdited = true; });
  authorInput.addEventListener("input", () => { authorEdited = true; });

  document.getElementById("convert").addEventListener("click", () => { try { convert(); } catch (_) {} });
  document.getElementById("copy").addEventListener("click", async () => {
    try {
      const result = converted || convert();
      await navigator.clipboard.writeText(result.html);
      setStatus("兼容 HTML 已复制。可直接粘贴到公众号正文编辑区。", "success");
    } catch (error) {
      setStatus(`复制失败：${error.message}`, "error");
    }
  });
  document.getElementById("insert").addEventListener("click", async () => {
    try {
      const result = converted || convert();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !/^https:\/\/mp\.weixin\.qq\.com\//.test(tab.url || "")) {
        await navigator.clipboard.writeText(result.html);
        setStatus("当前不是公众号后台，直通 HTML 已复制。请切回新建图文页后重试。", "error");
        return;
      }
      const response = await sendToEditor(tab.id, {
        action: "WECHAT_IMPORT_HTML",
        html: result.html,
        title: titleInput.value.trim(),
        author: authorInput.value.trim(),
        preferSource: false
      });
      if (!response || !response.ok) throw new Error((response && response.error) || "未找到公众号正文编辑区。");
      const metadataResult = [];
      if (titleInput.value.trim()) metadataResult.push(response.titleWritten ? "标题已写入" : "未找到标题栏");
      if (authorInput.value.trim()) metadataResult.push(response.authorWritten ? "作者已写入" : "作者栏未显示");
      const visualWarning = response.visualWarning ? ` ${response.visualWarning}` : "";
      setStatus(`正文已写入（${response.insertMethod || "编辑器写入"}）。${metadataResult.join("；")}。请在手机预览中核对效果。${visualWarning}`, response.visualWarning ? "error" : "success");
      if (response.visualWarning) report.textContent = `${response.visualWarning}\n\n${report.textContent || ""}`;
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
})();
