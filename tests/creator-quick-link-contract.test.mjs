import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

class TextNode {
  constructor(value) {
    this.nodeType = 3;
    this.nodeValue = value;
    this.parentElement = null;
  }

  get textContent() {
    return this.nodeValue;
  }
}

class StyleDeclaration {
  constructor() {
    this.cssText = "";
  }

  setProperty(name, value) {
    this[name] = value;
  }
}

class ElementNode {
  constructor(document, tagName) {
    this.ownerDocument = document;
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.parentElement = null;
    this.childNodes = [];
    this.attributes = new Map();
    this.style = new StyleDeclaration();
    this._className = "";
  }

  get children() {
    return this.childNodes.filter((node) => node.nodeType === 1);
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = value;
    this.attributes.set("class", value);
  }

  get classList() {
    const element = this;
    const names = () => element.className.split(/\s+/).filter(Boolean);
    return {
      add(...tokens) { element.className = [...new Set([...names(), ...tokens])].join(" "); },
      contains(token) { return names().includes(token); },
      toggle(token) {
        const next = names();
        const present = next.includes(token);
        element.className = present ? next.filter((name) => name !== token).join(" ") : [...next, token].join(" ");
        return !present;
      },
    };
  }

  get id() {
    return this.getAttribute("id") || "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get href() {
    return this.getAttribute("href") || "";
  }

  set href(value) {
    this.setAttribute("href", value);
  }

  get textContent() {
    return this.childNodes.map((node) => node.textContent).join("");
  }

  set textContent(value) {
    this.childNodes = value === "" ? [] : [this._append(new TextNode(value), false)];
  }

  get innerHTML() {
    return this.textContent;
  }

  set innerHTML(markup) {
    this.childNodes = [];
    const stack = [this];
    for (const token of markup.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)) {
      const value = token[0];
      if (value.startsWith("</")) {
        stack.pop();
      } else if (value.startsWith("<")) {
        const [, tagName, rawAttributes = ""] = value.match(/^<([a-z0-9]+)([^>]*)>/i) || [];
        if (!tagName) continue;
        const element = this.ownerDocument.createElement(tagName);
        for (const attribute of rawAttributes.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
          if (attribute[1]) element.setAttribute(attribute[1], attribute[2] || "");
        }
        stack.at(-1).appendChild(element);
        if (!/\/$/.test(value) && !["img", "input", "br"].includes(tagName.toLowerCase())) stack.push(element);
      } else {
        stack.at(-1).appendChild(new TextNode(value));
      }
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "class") this._className = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "class") this._className = "";
  }

  appendChild(node) {
    return this._append(node, true);
  }

  _append(node, notify) {
    node.parentElement = this;
    this.childNodes.push(node);
    if (notify) this.ownerDocument._notify(node);
    return node;
  }

  insertBefore(node, reference) {
    const index = reference ? this.childNodes.indexOf(reference) : -1;
    if (index < 0) return this.appendChild(node);
    node.parentElement = this;
    this.childNodes.splice(index, 0, node);
    this.ownerDocument._notify(node);
    return node;
  }

  remove() {
    const siblings = this.parentElement?.childNodes;
    const index = siblings?.indexOf(this) ?? -1;
    if (index >= 0) siblings.splice(index, 1);
  }

  replaceWith(next) {
    const siblings = this.parentElement?.childNodes;
    const index = siblings?.indexOf(this) ?? -1;
    if (index < 0) return;
    next.parentElement = this.parentElement;
    siblings[index] = next;
    this.ownerDocument._notify(next);
  }

  cloneNode() {
    const clone = this.ownerDocument.createElement(this.tagName);
    for (const [name, value] of this.attributes) clone.setAttribute(name, value);
    return clone;
  }

  after(node) {
    this.parentElement?.insertBefore(node, this.parentElement.childNodes[this.parentElement.childNodes.indexOf(this) + 1]);
  }

  addEventListener() {}

  matches(selector) {
    return selector.split(",").some((part) => {
      const value = part.trim();
      if (!value) return false;
      if (value.startsWith(".")) return value.slice(1).split(".").every((name) => this.classList.contains(name));
      if (value.startsWith("[")) return this.hasAttribute(value.slice(1, -1));
      return this.tagName.toLowerCase() === value.toLowerCase();
    });
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches?.(selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return this.ownerDocument._descendants(this).filter((node) => node.nodeType === 1 && node.matches(selector));
  }
}

class DocumentNode {
  constructor() {
    this.nodeType = 9;
    this.readyState = "complete";
    this.documentElement = new ElementNode(this, "html");
    this.head = new ElementNode(this, "head");
    this.body = new ElementNode(this, "body");
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.observer = null;
  }

  createElement(tagName) {
    return new ElementNode(this, tagName);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return this._descendants(this.documentElement, true).filter((node) => node.nodeType === 1 && node.matches(selector));
  }

  getElementById(id) {
    return this.querySelectorAll("[id]").find((element) => element.id === id) || null;
  }

  createTreeWalker(root) {
    const nodes = this._descendants(root);
    let index = 0;
    return { nextNode: () => nodes[index++] || null };
  }

  addEventListener() {}

  dispatchEvent() {}

  _descendants(root, includeRoot = false) {
    const nodes = [];
    const visit = (node) => {
      if (node !== root || includeRoot) nodes.push(node);
      node.childNodes?.forEach(visit);
    };
    visit(root);
    return nodes;
  }

  _notify(node) {
    this.observer?.callback([{ type: "childList", addedNodes: [node] }]);
  }
}

function boot({ locale, authNav, i18n }) {
  const document = new DocumentNode();
  const storage = new Map();
  const window = {
    document,
    location: { pathname: "/", search: `?lang=${locale}`, hash: "" },
    addEventListener() {},
    history: { replaceState() {} },
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() { document.observer = this; }
    disconnect() { if (document.observer === this) document.observer = null; }
  }
  const context = {
    window,
    location: window.location,
    document,
    Element: ElementNode,
    Node: { TEXT_NODE: 3 },
    NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 },
    MutationObserver,
    URLSearchParams,
    CustomEvent: class CustomEvent { constructor(name, detail) { this.type = name; this.detail = detail; } },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: async () => ({ ok: false }),
    requestAnimationFrame: (callback) => callback(),
    setTimeout: (callback) => { callback(); return 0; },
    clearTimeout() {},
  };
  window.localStorage = context.localStorage;
  window.sessionStorage = context.sessionStorage;
  window.fetch = context.fetch;
  vm.runInNewContext(i18n, context, { filename: "site-i18n.js" });
  vm.runInNewContext(authNav, context, { filename: "auth-nav.js" });
  return document;
}

function quickLinks(document) {
  return document.querySelectorAll(".studio-quick-banner");
}

function cssDeclarations(document, selector) {
  const stylesheet = document.getElementById("studio-quick-banner-style").textContent;
  const rule = [...stylesheet.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .find(([, selectors]) => selectors.split(",").map((value) => value.trim()).includes(selector));
  assert.ok(rule, `missing injected ${selector} rule`);
  return new Map(
    [...rule[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)]
      .map(([, property, value]) => [property, value.trim()]),
  );
}

function desktopStackRects(document, viewportHeight = 900) {
  const stack = cssDeclarations(document, ".quick-link-stack");
  const link = cssDeclarations(document, ".quick-link-stack .studio-quick-banner");
  assert.equal(stack.get("position"), "fixed");
  assert.equal(stack.get("display"), "flex");
  assert.equal(stack.get("flex-direction"), "column");
  assert.equal(stack.get("top"), "50%");
  assert.equal(stack.get("transform"), "translateY(-50%)");

  const height = Number.parseFloat(link.get("min-height"));
  const gap = Number.parseFloat(stack.get("gap"));
  const links = quickLinks(document);
  const totalHeight = (height * links.length) + (gap * (links.length - 1));
  const top = (viewportHeight - totalHeight) / 2;
  return links.map((_, index) => ({
    top: top + (index * (height + gap)),
    bottom: top + (index * (height + gap)) + height,
  }));
}

const [authNav, i18n] = await Promise.all([
  source("../auth-nav.js"),
  source("../site-i18n.js"),
]);

test("mobile creator center hides redundant floating quick links above its bottom navigation", () => {
  assert.match(authNav, /body:has\(\.creator-center\) \.quick-link-stack\s*\{[\s\S]*?display:\s*none/);
});

test("auth navigation injects one ordered fixed-link stack without overlapping sibling banners", () => {
  const document = boot({ locale: "ko-KR", authNav, i18n });
  const stack = document.querySelector(".quick-link-stack");

  assert.ok(stack, "quick links need one shared stack container");
  assert.deepEqual(
    quickLinks(document).map((link) => link.getAttribute("href")),
    ["/dashboard/designer", "/dashboard/creator", "#contact"],
  );
  assert.ok(quickLinks(document).every((link) => link.parentElement === stack));
  assert.equal(document.querySelectorAll(".creator-quick-banner").length, 1);

  const rects = desktopStackRects(document);
  assert.ok(rects.every((rect, index) => index === 0 || rect.top >= rects[index - 1].bottom), "desktop quick-link rectangles must not overlap");
});

test("creator center label and supporting copy translate atomically after auth navigation injects them", () => {
  const expected = new Map([
    ["vi-VN", ["Trung tâm nhà sáng tạo", "Lối tắt nhà sáng tạo", "Đi đến Trung tâm nhà sáng tạo"]],
    ["zh-TW", ["創作者中心", "創作者捷徑", "前往創作者中心"]],
    ["en-US", ["Creator Center", "Creator shortcut", "Go to Creator Center"]],
  ]);

  for (const [locale, [label, supportingCopy, ariaLabel]] of expected) {
    const document = boot({ locale, authNav, i18n });
    const creator = document.querySelector(".creator-quick-banner");
    const title = creator.querySelector("strong");
    const supporting = creator.querySelector(".creator-quick-banner-copy");

    assert.equal(title.textContent, label, `${locale} title`);
    assert.equal(title.childNodes.filter((node) => node.nodeType === 3).length, 1, `${locale} title stays atomic`);
    assert.equal(supporting.textContent, supportingCopy, `${locale} supporting copy`);
    assert.equal(creator.getAttribute("aria-label"), ariaLabel, `${locale} aria label`);
  }
});
