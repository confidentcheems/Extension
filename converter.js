/* global DOMParser */
(function () {
  "use strict";

  const DROP_TAGS = new Set(["SCRIPT", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "VIDEO", "AUDIO", "CANVAS", "META", "BASE", "LINK"]);
  const RENAME_TAGS = { ARTICLE: "section", MAIN: "section", HEADER: "section", FOOTER: "section", ASIDE: "section", FIGURE: "section", FIGCAPTION: "p", MARK: "span" };
  const SAFE_TAGS = new Set(["DIV", "SECTION", "P", "SPAN", "STRONG", "B", "EM", "I", "U", "S", "DEL", "BR", "HR", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "A", "IMG", "PRE", "CODE", "SUB", "SUP"]);
  // 这些不是任意网页自定义标签，而是从公众号后台复制出来的原生组件代码。
  // 仅在已有完整代码时保留；插件不会伪造媒体或小程序的资源标识。
  const WECHAT_COMPONENT_TAGS = new Set(["MPVOICE", "MPVIDEO", "MP-MINIPROGRAM", "MP-COMMON-PROFILE", "MP-ARTICLE", "MP-LIVE", "MP-SHOP", "MP-PRODUCT", "MP-RED-PACKET", "MP-COVER"]);
  const WECHAT_COMPONENT_ATTRS = new Set(["class", "id", "style", "src", "href", "width", "height", "frameborder", "allowfullscreen", "scrolling", "title", "alt", "name", "type"]);
  const MINI_PROGRAM_LINK_ATTRS = new Set(["data-miniprogram-appid", "data-miniprogram-path", "data-miniprogram-title", "data-miniprogram-imageurl", "data-miniprogram-nickname", "data-miniprogram-type", "data-weapp-appid", "data-weapp-path"]);
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SVG_TAGS = new Set(["svg", "g", "defs", "use", "symbol", "a", "switch", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "image", "text", "tspan", "textpath", "title", "desc", "clippath", "mask", "pattern", "marker", "lineargradient", "radialgradient", "stop", "filter", "fegaussianblur", "feoffset", "fecolormatrix", "feblend", "fecomposite", "fecomponenttransfer", "fefunca", "fefuncb", "fefuncg", "fefuncr", "femerge", "femergenode", "feflood", "fedropshadow", "fedisplacementmap", "femorphology", "feturbulence", "feconvolvematrix", "fetile", "foreignobject", "animate", "set", "animatetransform", "animatemotion", "mpath"]);
  const SVG_ATTRS = new Set(["xmlns", "xmlns:xlink", "version", "viewbox", "preserveaspectratio", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "d", "points", "transform", "opacity", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "pathlength", "display", "visibility", "pointer-events", "clip-path", "clippathunits", "mask", "maskunits", "maskcontentunits", "filter", "filterunits", "gradientunits", "gradienttransform", "offset", "stop-color", "stop-opacity", "patternunits", "patterncontentunits", "markerwidth", "markerheight", "refx", "refy", "orient", "text-anchor", "dominant-baseline", "font-size", "font-family", "font-weight", "letter-spacing", "style", "id", "href", "xlink:href", "attributeName", "attributename", "attributeType", "attributetype", "from", "to", "by", "values", "keytimes", "keysplines", "calcmode", "dur", "begin", "end", "repeatcount", "repeatdur", "restart", "additive", "accumulate", "type", "path", "rotate", "keypoints", "in", "in2", "result", "stddeviation", "dx", "dy", "slope", "intercept", "amplitude", "exponent", "tablevalues", "operator", "k1", "k2", "k3", "k4", "scale", "xchannelselector", "ychannelselector", "basefrequency", "numoctaves", "seed", "stitchtiles", "radius", "flood-color", "flood-opacity", "lighting-color", "surfacescale", "diffuseconstant", "specularconstant", "specularexponent", "azimuth", "elevation", "kernelmatrix", "divisor", "bias", "targetx", "targety", "edgemode", "kernelunitlength", "order"]);
  const CSS_ALLOWED = new Set([
    "color", "background", "background-color", "background-image", "background-size", "background-position", "background-repeat", "-webkit-font-smoothing", "-moz-osx-font-smoothing",
    "font", "font-family", "font-size", "font-weight", "font-style", "font-variant", "line-height", "letter-spacing", "text-align", "text-indent", "text-decoration", "text-decoration-color", "text-decoration-style",
    "white-space", "word-break", "overflow-wrap", "vertical-align", "opacity", "box-sizing", "display", "float", "clear", "overflow", "overflow-x", "overflow-y", "position", "top", "right", "bottom", "left", "z-index", "isolation",
    "width", "min-width", "max-width", "height", "min-height", "max-height", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border", "border-top", "border-right", "border-bottom", "border-left", "border-color", "border-style", "border-width", "border-radius", "-webkit-border-radius", "box-shadow", "text-shadow", "object-fit", "object-position", "aspect-ratio", "background-clip", "background-origin",
    "list-style", "list-style-type", "table-layout", "border-collapse", "border-spacing", "caption-side", "flex", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "justify-content", "align-items", "align-content", "align-self", "gap", "row-gap", "column-gap", "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
    "transform", "transform-origin", "transform-box", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "stop-color", "stop-opacity", "clip-path", "mask", "filter", "pointer-events"
  ]);
  const SAFE_ATTRS = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "width", "height"]);

  function parseCssRules(cssText, report) {
    const holder = document.createElement("style");
    holder.textContent = cssText;
    document.head.appendChild(holder);
    const rules = [];
    try {
      for (const rule of holder.sheet.cssRules) collectRule(rule, rules, report);
    } catch (_) {
      report.warnings.push("有一部分 CSS 无法解析，已保留可识别规则。");
    }
    holder.remove();
    return rules;
  }

  function collectRule(rule, rules, report) {
    if (rule.type === CSSRule.STYLE_RULE) {
      rules.push({ selector: rule.selectorText, style: rule.style });
    } else if (rule.cssRules) {
      for (const child of rule.cssRules) collectRule(child, rules, report);
    } else if (rule.type !== CSSRule.CHARSET_RULE) {
      report.droppedCssRules++;
    }
  }

  function applyCssRules(root, rules, report) {
    const elements = [root, ...root.querySelectorAll("*")];
    for (const rule of rules) {
      if (/(^|\s|,):{1,2}(before|after)\b/i.test(rule.selector)) continue;
      for (const element of elements) {
        try {
          if (!element.matches(rule.selector)) continue;
          for (const prop of rule.style) {
            if (!CSS_ALLOWED.has(prop)) { report.droppedProperties.add(prop); continue; }
            element.style.setProperty(prop, rule.style.getPropertyValue(prop), rule.style.getPropertyPriority(prop));
          }
        } catch (_) {
          report.warnings.push(`不支持的选择器：${rule.selector}`);
          break;
        }
      }
    }
  }

  function pseudoContent(value) {
    const content = (value || "").trim();
    if (!content || content === "none" || content === "normal") return "";
    const quoted = content.match(/^(?:"([\s\S]*)"|'([\s\S]*)')$/);
    return quoted ? (quoted[1] ?? quoted[2] ?? "").replace(/\\A\s?/g, "\n").replace(/\\([\\"'])/g, "$1") : "";
  }

  function applyPseudoStyle(node, style, report) {
    for (const prop of style) {
      if (prop === "content") continue;
      if (!CSS_ALLOWED.has(prop)) { report.droppedProperties.add(prop); continue; }
      node.style.setProperty(prop, style.getPropertyValue(prop), style.getPropertyPriority(prop));
    }
    if (!node.style.display) node.style.setProperty("display", "block");
    if (!node.style.boxSizing) node.style.setProperty("box-sizing", "border-box");
  }

  // The editor discards ::before/::after. Materialize decorative dots, lines, and masks as real nodes.
  function materializePseudoElements(root, rules, report) {
    for (const rule of rules) {
      const selectors = (rule.selector || "").split(",");
      for (const rawSelector of selectors) {
        const matched = rawSelector.trim().match(/^(.*?)(:{1,2}(before|after))\s*$/i);
        if (!matched) continue;
        const selector = matched[1].trim();
        const placement = matched[3].toLowerCase();
        if (!selector) continue;
        let targets = [];
        try { targets = Array.from(root.querySelectorAll(selector)); } catch (_) {
          report.warnings.push(`Unsupported pseudo-element selector: ${rawSelector.trim()}`);
          continue;
        }
        for (const target of targets) {
          const generated = target.ownerDocument.createElement("span");
          generated.setAttribute("aria-hidden", "true");
          generated.textContent = pseudoContent(rule.style.getPropertyValue("content"));
          applyPseudoStyle(generated, rule.style, report);
          if (placement === "before") target.insertBefore(generated, target.firstChild);
          else target.appendChild(generated);
          report.materializedPseudoElements++;
        }
      }
    }
  }

  function inheritedInlineValue(element, root, property) {
    let current = element;
    while (current) {
      const value = current.style?.getPropertyValue(property).trim();
      if (value) return value;
      if (current === root) break;
      current = current.parentElement;
    }
    return "";
  }

  // WeChat reapplies defaults to several text tags. Persist inherited colors and type styles on each text node.
  function materializeTextStyles(root, report) {
    const textNodes = root.querySelectorAll("p,span,strong,b,em,i,u,s,del,a,h1,h2,h3,h4,h5,h6,li,blockquote,td,th,pre,code,div,section,article,header,main,footer");
    const inheritedProperties = ["color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "text-decoration"];
    for (const element of textNodes) {
      if (!(element.textContent || "").trim()) continue;
      for (const property of inheritedProperties) {
        if (element.style.getPropertyValue(property).trim()) continue;
        const value = inheritedInlineValue(element.parentElement, root, property);
        if (!value) continue;
        element.style.setProperty(property, value);
        report.materializedTextStyles++;
      }
    }
  }

  function hasOwnStyle(element, property) {
    return Boolean(element.style.getPropertyValue(property).trim());
  }

  function classNameOf(element) {
    // SVG 的 className 是 SVGAnimatedString，直接转字符串会得到 [object SVGAnimatedString]。
    return element.getAttribute("class") || (typeof element.className === "string" ? element.className : "");
  }

  function enhanceTypography(root, report) {
    if (!hasOwnStyle(root, "font-family")) {
      root.style.setProperty("font-family", '"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Helvetica Neue",Arial,sans-serif');
      report.roundedTypography = true;
    }
    if (!hasOwnStyle(root, "letter-spacing")) root.style.setProperty("letter-spacing", "0.15px");
    root.style.setProperty("-webkit-font-smoothing", "antialiased");
    root.style.setProperty("-moz-osx-font-smoothing", "grayscale");
  }

  function isSmallIconSvg(element) {
    if (element.tagName !== "svg") return false;
    const marker = `${classNameOf(element)} ${element.getAttribute("data-icon") || ""} ${element.getAttribute("aria-label") || ""}`;
    if (!/icon|glyph|symbol|图标/i.test(marker)) return false;
    const width = Number.parseFloat(element.getAttribute("width") || element.style.width || "0");
    const height = Number.parseFloat(element.getAttribute("height") || element.style.height || "0");
    return (!width || width <= 64) && (!height || height <= 64);
  }

  function isTextIcon(element) {
    if (!["I", "SPAN"].includes(element.tagName)) return false;
    const marker = `${classNameOf(element)} ${element.getAttribute("data-icon") || ""} ${element.getAttribute("aria-label") || ""}`;
    return /icon|glyph|symbol|图标/i.test(marker) && (element.textContent || "").trim().length <= 4;
  }

  function enhanceIconFrames(root, report) {
    for (const element of Array.from(root.querySelectorAll("svg, i, span"))) {
      if (!isSmallIconSvg(element) && !isTextIcon(element)) continue;
      if (hasOwnStyle(element, "background") || hasOwnStyle(element, "background-color") || hasOwnStyle(element, "border")) continue;
      if (element.tagName === "svg") {
        const shell = element.ownerDocument.createElement("span");
        shell.setAttribute("style", "display:inline-flex;width:38px;height:38px;padding:8px;align-items:center;justify-content:center;vertical-align:middle;border:1px solid #dce8f5;border-radius:999px;background:#f5f9fe;box-shadow:0 3px 8px rgba(32,85,137,.10)");
        element.style.setProperty("display", "block");
        element.style.setProperty("width", "100%");
        element.style.setProperty("height", "100%");
        element.replaceWith(shell);
        shell.appendChild(element);
      } else {
        element.style.setProperty("display", "inline-flex");
        element.style.setProperty("min-width", "32px");
        element.style.setProperty("height", "32px");
        element.style.setProperty("padding", "6px");
        element.style.setProperty("align-items", "center");
        element.style.setProperty("justify-content", "center");
        element.style.setProperty("vertical-align", "middle");
        element.style.setProperty("border", "1px solid #dce8f5");
        element.style.setProperty("border-radius", "999px");
        element.style.setProperty("background", "#f5f9fe");
        element.style.setProperty("box-shadow", "0 3px 8px rgba(32,85,137,.10)");
      }
      report.iconFrames++;
    }
  }

  // Some WeChat editor themes reset border-radius on small inline blocks. Reassert
  // round badges after icon enhancement so numbered circles/dots do not become squares.
  function stabilizeRoundShapes(root, report) {
    for (const element of Array.from(root.querySelectorAll("*"))) {
      const marker = classNameOf(element);
      const width = Number.parseFloat(element.style.width || element.style.minWidth || "");
      const height = Number.parseFloat(element.style.height || "");
      const explicitlyNamed = /(?:visit-icon|chapter-no|ending-mark|fact-dot|badge|avatar|round|circle|dot)/i.test(marker);
      const smallSquare = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 && width <= 64 && height <= 64 && Math.abs(width - height) <= 4;
      if (!explicitlyNamed && !smallSquare) continue;
      if (!element.style.borderRadius && !explicitlyNamed) continue;
      element.style.setProperty("border-radius", "50%", "important");
      element.style.setProperty("-webkit-border-radius", "50%", "important");
      element.style.setProperty("overflow", "hidden", "important");
      if (/\bvisit-icon\b/i.test(marker)) {
        element.style.setProperty("background", "transparent", "important");
        element.style.setProperty("border", "1px solid rgba(255,255,255,.7)", "important");
        element.style.setProperty("color", "#fff4c8", "important");
      }
      report.roundedShapes++;
    }
  }

  function cleanStyle(element, mode, report) {
    const next = [];
    for (const prop of Array.from(element.style)) {
      const value = element.style.getPropertyValue(prop).trim();
      const priority = element.style.getPropertyPriority(prop);
      if (!CSS_ALLOWED.has(prop) || /expression\(|javascript:/i.test(value)) { report.droppedProperties.add(prop); continue; }
      if (mode === "safe" && (prop.startsWith("grid-") || prop.startsWith("flex") || prop === "display" && /grid|flex/.test(value) || /position|transform|animation/.test(prop))) {
        report.degradedLayouts++;
        if (prop === "display") next.push("display:block");
        continue;
      }
      next.push(`${prop}:${value}${priority ? " !important" : ""}`);
    }
    if (element.tagName === "IMG") {
      if (!next.some((item) => item.startsWith("max-width:"))) next.push("max-width:100%");
      if (!next.some((item) => item.startsWith("height:"))) next.push("height:auto");
      next.push("display:block");
    }
    element.setAttribute("style", next.join(";"));
  }

  function isWeChatNativeComponent(element) {
    const tag = element.tagName;
    if (WECHAT_COMPONENT_TAGS.has(tag)) return true;
    if (tag !== "IFRAME") return false;
    const marker = `${element.className || ""} ${element.getAttribute("data-vid") || ""} ${element.getAttribute("data-mpvid") || ""} ${element.getAttribute("data-src") || ""} ${element.getAttribute("src") || ""}`;
    return element.hasAttribute("data-vid") || element.hasAttribute("data-mpvid") || /video_iframe|mpvideo|mp\.weixin\.qq\.com\/mp\/readtemplate|v\.qq\.com\/iframe\/player/i.test(marker);
  }

  function weChatComponentKind(element) {
    if (element.tagName === "IFRAME") return "视频";
    const names = {
      MPVOICE: "音频", MPVIDEO: "视频", "MP-MINIPROGRAM": "小程序", "MP-COMMON-PROFILE": "公众号名片",
      "MP-ARTICLE": "文章卡片", "MP-LIVE": "直播", "MP-SHOP": "小店商品", "MP-PRODUCT": "商品", "MP-RED-PACKET": "红包封面", "MP-COVER": "红包封面"
    };
    return names[element.tagName] || "公众号组件";
  }

  function isSafeWeChatComponentUrl(value) {
    return /^(https?:)?\/\/(mp\.weixin\.qq\.com|v\.qq\.com|(?:[\w-]+\.)?qpic\.cn)\//i.test(value);
  }

  function sanitizeWeChatNativeComponent(element, mode, report) {
    const kind = weChatComponentKind(element);
    report.officialComponentKinds.add(kind);
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) { element.removeAttribute(attr.name); continue; }
      if (name === "style") continue;
      // 公众号专用标签的资源字段名称并不统一。对已识别的非 iframe 标签，保留其非事件属性，
      // 以免破坏从公众号后台复制出的真实媒体/名片代码。
      if (element.tagName !== "IFRAME") {
        if ((name === "src" || name === "href") && !isSafeWeChatComponentUrl(value)) {
          element.removeAttribute(attr.name);
          report.removedUrls++;
        }
        continue;
      }
      if (name.startsWith("data-") || WECHAT_COMPONENT_ATTRS.has(name)) {
        if ((name === "src" || name === "href") && !isSafeWeChatComponentUrl(value)) {
          element.removeAttribute(attr.name);
          report.removedUrls++;
        }
        continue;
      }
      element.removeAttribute(attr.name);
    }
    cleanStyle(element, mode, report);
  }

  function recordUnsupportedDynamic(nodeName, report) {
    const names = {
      SCRIPT: "JavaScript", IFRAME: "任意 iframe", VIDEO: "原生 video", AUDIO: "原生 audio", FORM: "表单", INPUT: "表单输入", BUTTON: "网页按钮", CANVAS: "Canvas", OBJECT: "嵌入对象", EMBED: "嵌入对象"
    };
    if (names[nodeName]) report.unsupportedDynamic.add(names[nodeName]);
  }

  function sanitizeTree(root, mode, report) {
    for (const element of Array.from(root.querySelectorAll("*"))) {
      const nodeName = (element.localName || element.tagName).toUpperCase();
      if (DROP_TAGS.has(nodeName) && !isWeChatNativeComponent(element)) {
        recordUnsupportedDynamic(nodeName, report);
        element.remove();
        report.removedNodes++;
        continue;
      }
      if (element.namespaceURI !== SVG_NS && RENAME_TAGS[element.tagName]) {
        const replacement = element.ownerDocument.createElement(RENAME_TAGS[element.tagName]);
        for (const attr of Array.from(element.attributes)) replacement.setAttribute(attr.name, attr.value);
        while (element.firstChild) replacement.appendChild(element.firstChild);
        element.replaceWith(replacement);
      }
    }
    for (const element of Array.from(root.querySelectorAll("*"))) {
      if (element.namespaceURI === SVG_NS) {
        sanitizeSvgElement(element, mode, report);
        continue;
      }
      if (isWeChatNativeComponent(element)) {
        sanitizeWeChatNativeComponent(element, mode, report);
        continue;
      }
      if (!SAFE_TAGS.has(element.tagName)) {
        const replacement = element.ownerDocument.createElement("span");
        replacement.innerHTML = element.innerHTML;
        element.replaceWith(replacement);
        report.replacedNodes++;
        continue;
      }
      for (const attr of Array.from(element.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();
        if (name.startsWith("on") || name === "id" || name === "class" || name === "data-testid") { element.removeAttribute(attr.name); continue; }
        if (name === "style") continue;
        if (element.tagName === "A" && MINI_PROGRAM_LINK_ATTRS.has(name)) continue;
        if (!SAFE_ATTRS.has(name)) { element.removeAttribute(attr.name); continue; }
        if ((name === "href" || name === "src") && !isSafeUrl(value, name === "src")) { element.removeAttribute(attr.name); report.removedUrls++; continue; }
        if (name === "src" && /^data:/i.test(value)) report.dataImages++;
      }
      cleanStyle(element, mode, report);
    }
  }

  function sanitizeSvgElement(element, mode, report) {
    const tag = (element.localName || "").toLowerCase();
    if (!SVG_TAGS.has(tag) || (mode === "safe" && ["animate", "set", "animatetransform", "animatemotion"].includes(tag))) {
      element.remove();
      if (tag.includes("animate") || tag === "set") report.degradedAnimations++;
      else report.removedNodes++;
      return;
    }
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on") || !SVG_ATTRS.has(name)) { element.removeAttribute(attr.name); continue; }
      if ((name === "href" || name === "xlink:href") && !isSafeUrl(value, tag === "image")) {
        element.removeAttribute(attr.name);
        report.removedUrls++;
        continue;
      }
      if (tag === "image" && (name === "href" || name === "xlink:href")) {
        report.svgImages++;
        if (!/mmbiz\.qpic\.cn/i.test(value) && /^https?:/i.test(value)) report.externalSvgImages++;
      }
    }
    cleanStyle(element, mode, report);
  }

  function namespaceSvgIds(root, report) {
    const idMap = new Map();
    const prefix = `wxsvg-${Date.now().toString(36)}`;
    for (const svg of root.querySelectorAll("svg")) {
      for (const element of [svg, ...svg.querySelectorAll("[id]")]) {
        const oldId = element.getAttribute("id");
        if (!oldId) continue;
        const nextId = `${prefix}-${oldId}`;
        idMap.set(oldId, nextId);
        element.setAttribute("id", nextId);
      }
    }
    if (!idMap.size) return;
    for (const svg of root.querySelectorAll("svg")) {
      for (const element of [svg, ...svg.querySelectorAll("*")]) {
        for (const attr of Array.from(element.attributes)) {
          let value = attr.value;
          for (const [oldId, nextId] of idMap) {
            value = value.replace(new RegExp(`url\\(#${escapeRegExp(oldId)}\\)`, "g"), `url(#${nextId})`);
            value = value.replace(new RegExp(`#${escapeRegExp(oldId)}(?=[\\s)'\"]|$)`, "g"), `#${nextId}`);
            value = value.replace(new RegExp(`\\b${escapeRegExp(oldId)}(?=\\.(?:click|touchstart|touchend|begin|end))`, "g"), nextId);
          }
          if (value !== attr.value) element.setAttribute(attr.name, value);
        }
      }
    }
    report.namespacedSvgIds = idMap.size;
  }

  function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function isSafeUrl(value, isImage) {
    if (/^(https?:|mailto:|tel:|#)/i.test(value)) return true;
    return isImage && /^data:image\/(png|jpe?g|gif|webp);/i.test(value);
  }

  function candidateText(node, limit) {
    if (!node) return "";
    const value = (node.getAttribute?.("content") || node.textContent || "").replace(/\s+/g, " ").trim();
    return value.length <= limit ? value : "";
  }

  function findMeta(documentSource, selectors, limit) {
    for (const selector of selectors) {
      const value = candidateText(documentSource.querySelector(selector), limit);
      if (value) return value;
    }
    return "";
  }

  function findVisibleText(documentSource, selectors, limit) {
    for (const selector of selectors) {
      const nodes = documentSource.querySelectorAll(selector);
      for (const node of nodes) {
        const value = candidateText(node, limit);
        if (value) return value;
      }
    }
    return "";
  }

  function extractMetadata(source) {
    if (!source || !source.trim()) return { title: "", author: "", sources: [] };
    const documentSource = new DOMParser().parseFromString(source, "text/html");
    const sources = [];
    let title = findMeta(documentSource, [
      'meta[name="wechat-title"]', 'meta[property="wechat:title"]', 'meta[property="og:title"]'
    ], 120);
    if (title) sources.push("标题 meta");
    if (!title) {
      title = findVisibleText(documentSource, ["h1", "[data-wechat-title]", ".article-title", ".post-title", ".title"], 120);
      if (title) sources.push("正文标题");
    }
    if (!title) {
      title = candidateText(documentSource.querySelector("title"), 120);
      if (title) sources.push("页面标题");
    }

    let author = findMeta(documentSource, [
      'meta[name="wechat-author"]', 'meta[name="author"]', 'meta[property="article:author"]', 'meta[name="article:author"]'
    ], 80);
    if (author) sources.push("作者 meta");
    if (!author) {
      author = findVisibleText(documentSource, [
        '[rel="author"]', '[data-wechat-author]', '.article-author', '.post-author', '.author', '[class*="author"]', '.cinema-name', '[class*="publisher"]'
      ], 80);
      if (author) sources.push("正文作者区");
    }
    return { title, author, sources };
  }

  function convertHtml(source) {
    if (!source || !source.trim()) throw new Error("没有可转换的 HTML 内容。");
    // 智能直通固定使用 SVG 保真策略：普通正文仍是可编辑 HTML 文本，已有 SVG 则原样保留。
    const mode = "svg";
    const report = {
      removedNodes: 0, replacedNodes: 0, removedUrls: 0, dataImages: 0, svgImages: 0, externalSvgImages: 0,
      namespacedSvgIds: 0, degradedLayouts: 0, degradedAnimations: 0, droppedCssRules: 0,
      droppedProperties: new Set(), warnings: [], officialComponentKinds: new Set(), unsupportedDynamic: new Set(),
      gifImages: 0, apngImages: 0, miniProgramLinks: 0, scrollContainers: 0, cssKeyframes: 0,
      roundedTypography: false, iconFrames: 0, roundedShapes: 0, materializedPseudoElements: 0, materializedTextStyles: 0
    };
    const documentSource = new DOMParser().parseFromString(source, "text/html");
    const root = documentSource.body;
    const cssText = Array.from(documentSource.querySelectorAll("style")).map((node) => node.textContent || "").join("\n");
    report.cssKeyframes = (cssText.match(/@(?:-[\w]+-)?keyframes\b/gi) || []).length;
    for (const image of root.querySelectorAll("img[src]")) {
      const src = image.getAttribute("src") || "";
      if (/^data:image\/gif;|\.gif(?:[?#]|$)/i.test(src)) report.gifImages++;
      if (/\.apng(?:[?#]|$)/i.test(src)) report.apngImages++;
    }
    report.miniProgramLinks = root.querySelectorAll("a[data-miniprogram-appid], a[data-weapp-appid]").length;
    const rules = parseCssRules(cssText, report);
    documentSource.querySelectorAll("style").forEach((node) => node.remove());
    applyCssRules(root, rules, report);
    materializePseudoElements(root, rules, report);
    materializeTextStyles(root, report);
    // 只在原稿没有明确设计时补足视觉细节，避免覆盖作者的字体和图标外观。
    enhanceTypography(root, report);
    enhanceIconFrames(root, report);
    stabilizeRoundShapes(root, report);
    report.scrollContainers = Array.from(root.querySelectorAll("*")).filter((node) => /auto|scroll/i.test(node.style.overflow || "") || /auto|scroll/i.test(node.style.overflowX || "")).length;
    report.svgComponents = root.querySelectorAll("svg").length;
    report.svgAnimations = root.querySelectorAll("animate, set, animateTransform, animateMotion").length;
    namespaceSvgIds(root, report);
    sanitizeTree(root, mode, report);
    cleanStyle(root, mode, report);
    root.style.setProperty("margin", "0 auto");
    root.style.setProperty("max-width", "100%");
    root.style.setProperty("box-sizing", "border-box");
    // `body` 本身不会被写入公众号正文，因此将它已转换的样式转移到一个真实正文容器。
    const wrapper = documentSource.createElement("section");
    wrapper.setAttribute("style", root.getAttribute("style") || "max-width:100%;box-sizing:border-box");
    while (root.firstChild) wrapper.appendChild(root.firstChild);
    root.appendChild(wrapper);
    const html = wrapper.outerHTML.trim();
    const summary = [
      `已内联 ${rules.length} 条 CSS 规则`,
      report.removedNodes ? `移除 ${report.removedNodes} 个不支持节点` : "未发现高风险节点",
      report.replacedNodes ? `降级 ${report.replacedNodes} 个语义标签` : "常用标签已保留",
      report.dataImages ? `发现 ${report.dataImages} 张 Base64 图片（公众号可能不显示）` : "图片保留原 URL",
      report.degradedLayouts ? `安全模式已降级 ${report.degradedLayouts} 处布局` : "保留原布局模式",
      report.roundedTypography ? "已补充圆润中文字体栈与抗锯齿显示" : "保留原稿字体设置",
      report.iconFrames ? `为 ${report.iconFrames} 个标注图标补充圆角框架` : "",
      report.svgComponents ? `保留 ${report.svgComponents} 个 SVG 组件、${report.svgAnimations - report.degradedAnimations} 个动画指令` : "未发现 SVG 组件",
      report.gifImages ? `保留 ${report.gifImages} 个 GIF 动图` : "",
      report.apngImages ? `发现 ${report.apngImages} 个 PNG/APNG：是否动态由原文件决定` : "",
      report.scrollContainers ? `保留 ${report.scrollContainers} 个横向/纵向滚动容器` : "",
      report.miniProgramLinks ? `保留 ${report.miniProgramLinks} 个小程序跳转链接（需已关联小程序）` : "",
      report.officialComponentKinds.size ? `保留公众号原生组件代码：${Array.from(report.officialComponentKinds).join("、")}` : "",
      report.namespacedSvgIds ? `已隔离 ${report.namespacedSvgIds} 个 SVG 图层 ID，避免与正文冲突` : "",
      report.externalSvgImages ? `发现 ${report.externalSvgImages} 张 SVG 外链图片；发布前建议转存到公众号图片库` : "",
      report.cssKeyframes ? `检测到 ${report.cssKeyframes} 组 CSS 关键帧：公众号不稳定，建议改用 SVG/SMIL 动画` : "",
      report.unsupportedDynamic.size ? `无法直接导入的网页动态能力：${Array.from(report.unsupportedDynamic).join("、")}；请改用对应的公众号原生组件` : ""
    ];
    if (report.droppedProperties.size) summary.push(`忽略 ${Array.from(report.droppedProperties).slice(0, 8).join("、")} 等不兼容样式`);
    if (report.materializedPseudoElements) summary.push(`已将 ${report.materializedPseudoElements} 个伪元素装饰转为真实节点`);
    if (report.materializedTextStyles) summary.push(`已固化 ${report.materializedTextStyles} 条继承文字样式（含颜色）`);
    if (report.warnings.length) summary.push(...Array.from(new Set(report.warnings)).slice(0, 3));
    const metadata = extractMetadata(source);
    if (metadata.title) summary.unshift(`识别标题：${metadata.title}`);
    if (metadata.author) summary.unshift(`识别作者：${metadata.author}`);
    if (!metadata.title) summary.unshift("未找到标题：可在插件内手动补充");
    return { html, report: summary.join("\n"), metadata };
  }

  window.WechatHtmlConverter = { convertHtml, extractMetadata };
})();
