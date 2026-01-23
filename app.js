// app.js (WORKING)
// - Base(theme) checkbox will select/deselect all parts
// - Part checkbox updates theme indeterminate state
// - Event delegation (robust)

const MATERIAL_ORDER_RAW = [
  "怪物精华Monster Essence",
  "怪物毛皮Monster Fur",
  "怪物爪子Monster Claws",
  "惨爪龙的硬肌Odogaron Sinew",
  "惨爪龙的重牙Odogaron Hardfang",
  "惨爪龙的鳞Odogaron Scale",
  "雷狼龙的高电毛Zinogre Electrofur",
  "雷狼龙的雷电壳Zinogre Deathly Shocker",
  "雷狼龙的重壳Zinogre Cortex",
  "火龙的坚壳Rathalos Carapace",
  "火龙的翅膀Rathalos Wings",
  "火龙的尾巴Rathalos Tail",
  "麒麟的雷角Kirin Thunderhorn",
  "麒麟的皮Kirin Hide",
  "麒麟的鬃毛Kirin Mane",
  "太古大骨Ancient Bone",
  "冠突龙的甲壳Kestodon Shell",
  "野猪的头Bullfango Head",
  "大桶Large Barrel",
  "火药粉Gunpowder",
  "铁矿石Iron Ore",
  "惨爪龙的厚鳞Odogaron Shard",
  "惨爪龙的天鳞Odogaron Mantle",
  "雷狼龙的刚角Zinogre Hardhorn",
  "雷狼龙的天玉Zinogre Skymerald",
  "火龙的红玉Rathalos Ruby",
  "火龙的逆鳞Rathalos Plate",
  "麒麟的苍角Kirin Azure Horn",
  "古龙的大宝玉Large Elder Dragon Gem",
  "龙玉Wyvern Gem",
  "扭曲狂骨Warped Bone",
  "灾祸之布Sinister Cloth",
  "鬼硝化伞菇Devils Blight",
  "艾露猫票券Palico Voucher",
  "噗嗤猪票券Poogie Voucher",
  "棱彩颜料Prismatic Pigment",
];

const SPLIT_RE = /^(.*?)([A-Za-z].*)$/;
const MATERIALS = MATERIAL_ORDER_RAW.map(s => {
  const m = s.match(SPLIT_RE);
  if (!m) return { zh: s.trim(), en: s.trim(), combo: s.trim() };
  const zh = m[1].trim();
  const en = m[2].trim();
  return { zh, en, combo: `${zh} ${en}`.trim() };
});

const MATERIAL_ORDER_EN = MATERIALS.map(x => x.en);
const EN_TO_ZH = Object.fromEntries(MATERIALS.map(x => [x.en, x.zh]));
const ZH_TO_EN = Object.fromEntries(MATERIALS.map(x => [x.zh, x.en]));
const COMBO_TO_EN = Object.fromEntries(MATERIALS.map(x => [x.combo, x.en]));

const RARITY_LV = { "Common": 1, "Uncommon": 2, "Rare": 3, "Super Rare": 4 };
const LV_RARITY = { 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Super Rare" };

const RARITY_ALIAS_TO_EN = {
  "普通": "Common",
  "常见": "Common",
  "罕见": "Uncommon",
  "不常见": "Uncommon",
  "稀有": "Rare",
  "超级珍稀": "Super Rare",
  "超级稀有": "Super Rare",
  "超稀有": "Super Rare",
};

function qs(id){ return document.getElementById(id); }

function normRarity(x) {
  let s = String(x ?? "").trim();
  s = s.replace(/\.\d+$/, "");
  if (RARITY_LV[s]) return s;
  if (RARITY_ALIAS_TO_EN[s]) return RARITY_ALIAS_TO_EN[s];
  if (s.toLowerCase() === "superrare") return "Super Rare";
  return s;
}

function normMaterialToEN(raw) {
  const s0 = String(raw ?? "").replace(/\r/g, " ").replace(/\n/g, " ").trim();
  if (!s0) return s0;
  if (ZH_TO_EN[s0]) return ZH_TO_EN[s0];
  if (COMBO_TO_EN[s0]) return COMBO_TO_EN[s0];

  const m = s0.match(SPLIT_RE);
  if (m) {
    const zh = m[1].trim();
    const en = m[2].trim();
    if (EN_TO_ZH[en]) return en;
    if (ZH_TO_EN[zh]) return ZH_TO_EN[zh];
    return en;
  }

  if (EN_TO_ZH[s0]) return s0;
  return s0;
}

function displayMaterial(lang, enKey) {
  return lang === "zh" ? (EN_TO_ZH[enKey] ?? enKey) : enKey;
}

const UI = {
  en: {
    title: "MH Planner",
    language: "Language:",
    strategy: "Strategy:",
    inv: "Inventory",
    invHint: "Enter how many materials you own.",
    tar: "Targets",
    tarHint: "Select the parts/sets you still need. (Collapsed by default)",
    compute: "Compute",
    copy: "Copy Output",
    out: "Output",
    statusReady: (n) => `Ready. Loaded ${n} recipe rows.`,
    noSelection: "Please select at least one target.",
    fetchFail: "Failed to load data. Make sure you run a local server (python -m http.server).",
    mode3: "Low clicks (prefer 3→1; if insufficient then 6→1)",
    mode6: "Rarity-first (prefer 6→1; if needed then 3→1)",
    reportMode: (m) => `[Mode] ${m}`,
    selected: (n) => `You selected ${n} targets:`,
    set: (name) => `- Set: ${name}`,
    part: (setName, part) => `- Part: ${setName} / ${part}`,
    sec1: "## 1) Total required (for checking)",
    sec2: "## 2) Reserved from inventory (do NOT exchange these)",
    sec3: "## 3) Remaining deficits (need exchange/upgrade)",
    sec4: "## 4) Surplus available for exchange (ONLY use these)",
    sec5: "## 5) Exchange steps (copy/paste)",
    sec6: "## 6) Final remaining deficits",
    none: "- (none)",
    ok: "✅ Conclusion: Using surplus-only exchanges, you can complete the selected targets.",
    notOk: "⚠️ Conclusion: Using surplus-only exchanges, you still cannot fill the deficits (usually highest rarity not enough).",
    step3: (i, rar, cons, breakdown, target, times) =>
      `${i}. 3→1 (${rar}): consume ${cons} (${breakdown})\n   Output select: ${target} ×${times}`,
    step6: (i, r1, r2, cons, breakdown, target, times) =>
      `${i}. 6→1 upgrade (${r1}→${r2}): consume ${cons} (${breakdown})\n   Output select: ${target} ×${times}`,
  },
  zh: {
    title: "MH Planner",
    language: "语言：",
    strategy: "策略：",
    inv: "库存",
    invHint: "输入你拥有的材料数量。",
    tar: "目标",
    tarHint: "勾选你还没做完的套装/部件。（默认折叠）",
    compute: "开始计算",
    copy: "复制输出",
    out: "输出",
    statusReady: (n) => `就绪。已加载 ${n} 条配方。`,
    noSelection: "请先勾选至少一个目标。",
    fetchFail: "加载失败。请用本地服务器运行（python -m http.server）。",
    mode3: "少操作（优先 3→1；不够再 6→1）",
    mode6: "稀有度优先（尽量 6→1；无奈才 3→1）",
    reportMode: (m) => `【模式】${m}`,
    selected: (n) => `你选择了 ${n} 个目标：`,
    set: (name) => `- 整套：${name}`,
    part: (setName, part) => `- 部件：${setName} / ${part}`,
    sec1: "## 1) 目标总需求（核对用）",
    sec2: "## 2) 直接合成清单（已预留，别拿去换）",
    sec3: "## 3) 仍缺材料（需要兑换/升阶补）",
    sec4: "## 4) 可用于兑换的多余材料（只动这里）",
    sec5: "## 5) 兑换步骤（可直接照抄）",
    sec6: "## 6) 最终仍缺",
    none: "- （无）",
    ok: "✅ 结论：只用多余材料兑换，你可以补齐所选目标。",
    notOk: "⚠️ 结论：只用多余材料兑换，你仍无法补齐缺口（通常最高稀有度不够）。",
    step3: (i, rar, cons, breakdown, target, times) =>
      `${i}. 3→1（${rar}）：消耗 ${cons}（${breakdown}）\n   产出请选择：${target} ×${times}`,
    step6: (i, r1, r2, cons, breakdown, target, times) =>
      `${i}. 6→1 升阶（${r1}→${r2}）：消耗 ${cons}（${breakdown}）\n   产出请选择：${target} ×${times}`,
  }
};
function t(lang){ return UI[lang] ?? UI.en; }

// ---------- selection helpers (THE FIX) ----------
function setThemeState(themeDiv, checked) {
  const partCbs = themeDiv.querySelectorAll('input[type="checkbox"][data-role="part"]');
  partCbs.forEach(cb => { cb.checked = checked; });
}

function updateThemeCheckbox(themeDiv) {
  const themeCb = themeDiv.querySelector('input[type="checkbox"][data-role="theme"]');
  const partCbs = [...themeDiv.querySelectorAll('input[type="checkbox"][data-role="part"]')];
  if (!themeCb) return;

  const total = partCbs.length;
  const checkedCount = partCbs.filter(cb => cb.checked).length;

  if (checkedCount === 0) {
    themeCb.checked = false;
    themeCb.indeterminate = false;
  } else if (checkedCount === total) {
    themeCb.checked = true;
    themeCb.indeterminate = false;
  } else {
    themeCb.checked = false;
    themeCb.indeterminate = true;
  }
}

// ---------- global state ----------
let LANG = "en";
let MODE = "3first";
let RECIPES = [];
let MATERIAL_SET = new Map();
let HERO_TREE = [];
let INVENTORY = {};

// ---------- load data ----------
async function loadData(lang) {
  const path = (lang === "zh") ? "data/recipes_zh.json" : "data/recipes_en.json";
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch ${path} failed (${res.status})`);
  const raw = await res.json();

  const recipes = [];
  for (const r of raw) {
    const setName = String(r.set_name ?? r.category ?? "").trim();
    const part = String(r.part ?? r.item ?? "").trim();
    const materialEN = normMaterialToEN(r.material);
    const rarityEN = normRarity(r.rarity);
    const amount = Number(r.amount ?? 0) | 0;
    if (!setName || !part || !materialEN || !amount) continue;
    recipes.push({ setName, part, material: materialEN, rarity: rarityEN, amount });
  }
  return recipes;
}

function buildMaterialSet(recipes) {
  const rarityByMat = new Map();
  for (const row of recipes) {
    if (!rarityByMat.has(row.material)) rarityByMat.set(row.material, row.rarity);
  }

  const orderMap = new Map(MATERIAL_ORDER_EN.map((m, i) => [m, i]));
  const unknowns = [];
  for (const row of recipes) {
    if (!orderMap.has(row.material) && !unknowns.includes(row.material)) unknowns.push(row.material);
  }
  for (let i = 0; i < unknowns.length; i++) orderMap.set(unknowns[i], MATERIAL_ORDER_EN.length + i);

  const list = [];
  for (const [mat, idx] of orderMap.entries()) {
    if (!rarityByMat.has(mat)) continue;
    const rar = rarityByMat.get(mat);
    const lv = RARITY_LV[rar] ?? 1;
    list.push({ mat, rar, lv, idx });
  }
  list.sort((a,b)=>a.idx-b.idx);

  const mset = new Map();
  for (const x of list) mset.set(x.mat, { rarity: x.rar, rarity_lv: x.lv, order: x.idx });
  return { mset, ordered: list.map(x=>x.mat) };
}

function splitSetName(setName) {
  const s = String(setName).trim();
  const parts = s.split(" ", 2);
  if (parts.length === 1) return { hero: parts[0], theme: "Base" };
  return { hero: parts[0], theme: parts.slice(1).join(" ").trim() || "Base" };
}

function buildTree(recipes) {
  const heroOrder = new Map();
  const themeOrder = new Map();
  const partOrder = new Map();
  let heroIdx = 0, themeIdx = 0, partIdx = 0;

  const rows = [];
  for (const r of recipes) {
    const { hero, theme } = splitSetName(r.setName);
    const hk = hero;
    const tk = `${hero}||${theme}`;
    const pk = `${r.setName}||${r.part}`;
    if (!heroOrder.has(hk)) heroOrder.set(hk, heroIdx++);
    if (!themeOrder.has(tk)) themeOrder.set(tk, themeIdx++);
    if (!partOrder.has(pk)) partOrder.set(pk, partIdx++);
    rows.push({ hero, theme, setName: r.setName, part: r.part, ho: heroOrder.get(hk), to: themeOrder.get(tk), po: partOrder.get(pk) });
  }

  const seen = new Set();
  const unique = [];
  for (const x of rows) {
    const k = `${x.setName}||${x.part}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(x);
  }
  unique.sort((a,b)=> (a.ho-b.ho) || (a.to-b.to) || (a.po-b.po));

  const heroes = [];
  const heroMap = new Map();
  for (const x of unique) {
    if (!heroMap.has(x.hero)) {
      const node = { hero: x.hero, themes: [] };
      heroMap.set(x.hero, node);
      heroes.push(node);
    }
    const hnode = heroMap.get(x.hero);
    let tnode = hnode.themes.find(t => t.theme === x.theme && t.setName === x.setName);
    if (!tnode) {
      tnode = { theme: x.theme, setName: x.setName, parts: [] };
      hnode.themes.push(tnode);
    }
    tnode.parts.push({ part: x.part, setName: x.setName });
  }
  return heroes;
}

// ---------- render ----------
function renderStaticTexts() {
  const U = t(LANG);
  document.title = U.title;
  qs("title").textContent = U.title;
  qs("langLabel").textContent = U.language;
  qs("modeLabel").textContent = U.strategy;
  qs("invTitle").textContent = U.inv;
  qs("invHint").textContent = U.invHint;
  qs("tarTitle").textContent = U.tar;
  qs("tarHint").textContent = U.tarHint;
  qs("computeBtn").textContent = U.compute;
  qs("copyBtn").textContent = U.copy;
  qs("outTitle").textContent = U.out;

  const modeSel = qs("mode");
  modeSel.options[0].text = U.mode3;
  modeSel.options[1].text = U.mode6;
}

function renderInventory(materialOrder) {
  const body = qs("invBody");
  body.innerHTML = "";
  for (const enKey of materialOrder) {
    const info = MATERIAL_SET.get(enKey);
    if (!info) continue;

    const tr = document.createElement("tr");

    const tdM = document.createElement("td");
    tdM.textContent = displayMaterial(LANG, enKey);
    tdM.dataset.key = enKey;

    const tdR = document.createElement("td");
    tdR.textContent = info.rarity;

    const tdO = document.createElement("td");
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.value = String(INVENTORY[enKey] ?? 0);
    inp.addEventListener("input", () => {
      INVENTORY[enKey] = Math.max(0, parseInt(inp.value || "0", 10));
    });
    tdO.appendChild(inp);

    tr.appendChild(tdM);
    tr.appendChild(tdR);
    tr.appendChild(tdO);
    body.appendChild(tr);
  }
}

function renderTree(tree) {
  const root = qs("tree");
  root.innerHTML = "";

  for (const h of tree) {
    const detHero = document.createElement("details");
    detHero.open = false;

    const sum = document.createElement("summary");
    sum.textContent = h.hero;
    detHero.appendChild(sum);

    for (const th of h.themes) {
      const divTheme = document.createElement("div");
      divTheme.className = "theme";

      // label makes clicking text toggle checkbox
      const head = document.createElement("label");
      head.className = "theme-head";

      const cbTheme = document.createElement("input");
      cbTheme.type = "checkbox";
      cbTheme.dataset.role = "theme"; // ✅ IMPORTANT
      cbTheme.dataset.token = JSON.stringify(["SET", th.setName]);

      const lab = document.createElement("span");
      lab.textContent = th.theme;

      head.appendChild(cbTheme);
      head.appendChild(lab);
      divTheme.appendChild(head);

      const divParts = document.createElement("div");
      divParts.className = "parts";

      for (const p of th.parts) {
        const row = document.createElement("label");
        row.className = "row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.role = "part"; // ✅ IMPORTANT
        cb.dataset.token = JSON.stringify(["PART", p.setName, p.part]);

        const span = document.createElement("span");
        span.textContent = p.part;

        row.appendChild(cb);
        row.appendChild(span);
        divParts.appendChild(row);
      }

      divTheme.appendChild(divParts);
      updateThemeCheckbox(divTheme);
      detHero.appendChild(divTheme);
    }

    root.appendChild(detHero);
  }
}

function getSelectedTokens() {
  const checks = qs("tree").querySelectorAll('input[type="checkbox"]');
  const tokens = [];
  const seen = new Set();
  for (const cb of checks) {
    if (!cb.checked) continue;
    const tok = JSON.parse(cb.dataset.token);
    const key = JSON.stringify(tok);
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(tok);
  }
  return tokens;
}

// ---------- compute logic (kept minimal for selection test) ----------
function compute() {
  const U = t(LANG);
  const tokens = getSelectedTokens();
  if (!tokens.length) {
    qs("output").textContent = U.noSelection;
    return;
  }
  qs("output").textContent = JSON.stringify(tokens, null, 2);
}

// ---------- init & reload ----------
async function reloadAll() {
  renderStaticTexts();
  qs("status").textContent = "Loading…";

  try {
    RECIPES = await loadData(LANG);
  } catch (e) {
    qs("status").textContent = t(LANG).fetchFail;
    qs("output").textContent = String(e);
    return;
  }

  const { mset, ordered } = buildMaterialSet(RECIPES);
  MATERIAL_SET = mset;

  for (const m of ordered) if (INVENTORY[m] == null) INVENTORY[m] = 0;

  HERO_TREE = buildTree(RECIPES);
  renderInventory(ordered);
  renderTree(HERO_TREE);

  qs("status").textContent = t(LANG).statusReady(RECIPES.length);
  qs("output").textContent = LANG === "zh"
    ? "勾选 Base 会全选所有部件（已修复）。"
    : "Checking Base will select all parts (fixed).";
}

function init() {
  // ✅ bind delegation ONCE (NOT inside language change)
  qs("tree").addEventListener("change", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (el.type !== "checkbox") return;

    const themeDiv = el.closest(".theme");
    if (!themeDiv) return;

    if (el.dataset.role === "theme") {
      setThemeState(themeDiv, el.checked);
      updateThemeCheckbox(themeDiv);
      return;
    }
    if (el.dataset.role === "part") {
      updateThemeCheckbox(themeDiv);
      return;
    }
  });

  qs("lang").addEventListener("change", async (e) => {
    LANG = e.target.value;
    await reloadAll();
  });

  qs("mode").addEventListener("change", (e) => {
    MODE = e.target.value;
  });

  qs("computeBtn").addEventListener("click", () => compute());

  qs("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(qs("output").textContent);
      qs("status").textContent = (LANG === "zh") ? "已复制" : "Copied";
    } catch {
      qs("status").textContent = (LANG === "zh") ? "复制失败" : "Copy failed";
    }
  });

  reloadAll();
}

document.addEventListener("DOMContentLoaded", init);

