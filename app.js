// app.js
// Full JS port of your planner logic:
// - reserve required materials first
// - only use surplus for exchanges
// - two modes: 3first vs 6first
// Assumption: 3->1 and 6->1 only require same rarity (no duplicate material requirement) and can specify output.

// ---------- bilingual material order (authoritative) ----------
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

// ---------- rarity ----------
const RARITY_LV = { "Common": 1, "Uncommon": 2, "Rare": 3, "Super Rare": 4 };
const LV_RARITY = { 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Super Rare" };

const RARITY_ALIAS_TO_EN = {
  "普通": "Common", "普通": "Common",
  "罕见": "Uncommon",
  "稀有": "Rare",
  "超级珍稀": "Super Rare", "超级珍稀": "Super Rare"
};

function normRarity(x) {
  let s = String(x ?? "").trim();
  s = s.replace(/\.\d+$/, "");      // Uncommon.6
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
  return s0; // unknown
}

function displayMaterial(lang, enKey) {
  return lang === "zh" ? (EN_TO_ZH[enKey] ?? enKey) : enKey;
}

// ---------- UI text ----------
const UI = {
  en: {
    title: "Dota2 x Monster Hunter - Surplus Exchange Planner",
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
    // report labels
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
    title: "Dota2 × 怪物猎人 - 多余材料兑换规划器",
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

function t(lang) { return UI[lang] ?? UI.en; }

// ---------- global state ----------
let LANG = "en";
let MODE = "3first";
let RECIPES = [];  // normalized internal: material EN key, rarity EN, amount int
let MATERIAL_SET = new Map(); // enKey -> {rarity, rarity_lv, order}
let HERO_TREE = []; // [{hero, themes:[{theme,setName,parts:[{part,setName}]}]}]
let INVENTORY = {}; // enKey -> int

// ---------- load data ----------
async function loadData(lang) {
  const path = (lang === "zh") ? "data/recipes_zh.json" : "data/recipes_en.json";
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch ${path} failed`);
  const raw = await res.json();

  // Normalize records to internal form
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

// ---------- build material list (fixed order) ----------
function buildMaterialSet(recipes) {
  // determine rarity for each material by first appearance
  const rarityByMat = new Map();
  for (const row of recipes) {
    if (!rarityByMat.has(row.material)) rarityByMat.set(row.material, row.rarity);
  }

  // fixed order: MATERIAL_ORDER_EN then unknown appended by first appearance
  const orderMap = new Map(MATERIAL_ORDER_EN.map((m, i) => [m, i]));
  const unknowns = [];
  for (const row of recipes) {
    if (!orderMap.has(row.material) && !unknowns.includes(row.material)) unknowns.push(row.material);
  }
  for (let i = 0; i < unknowns.length; i++) {
    orderMap.set(unknowns[i], MATERIAL_ORDER_EN.length + i);
  }

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

// ---------- build hero/theme/part tree preserving appearance order ----------
function splitSetName(setName) {
  const s = String(setName).trim();
  const parts = s.split(" ", 2);
  if (parts.length === 1) return { hero: parts[0], theme: "Base" };
  return { hero: parts[0], theme: parts.slice(1).join(" ").trim() || "Base" };
}

function buildTree(recipes) {
  // preserve first appearance order:
  const heroOrder = new Map();
  const themeOrder = new Map(); // key hero||theme
  const partOrder = new Map();  // key setName||part

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

    rows.push({
      hero, theme, setName: r.setName, part: r.part,
      ho: heroOrder.get(hk), to: themeOrder.get(tk), po: partOrder.get(pk)
    });
  }

  // unique part nodes
  const seen = new Set();
  const unique = [];
  for (const x of rows) {
    const k = `${x.setName}||${x.part}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(x);
  }

  unique.sort((a,b)=> (a.ho-b.ho) || (a.to-b.to) || (a.po-b.po));

  // build nested arrays in-order
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

// ---------- UI render ----------
function qs(id){ return document.getElementById(id); }

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

  // mode options labels
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
    detHero.open = false; // collapsed by default
    const sum = document.createElement("summary");
    sum.textContent = h.hero;
    detHero.appendChild(sum);

    for (const th of h.themes) {
      const divTheme = document.createElement("div");
      divTheme.className = "theme";

      const head = document.createElement("div");
      head.className = "theme-head";

      const cbSet = document.createElement("input");
      cbSet.type = "checkbox";
      cbSet.dataset.token = JSON.stringify(["SET", th.setName]);

      const lab = document.createElement("span");
      lab.textContent = th.theme;

      head.appendChild(cbSet);
      head.appendChild(lab);
      divTheme.appendChild(head);

      const divParts = document.createElement("div");
      divParts.className = "parts";

      for (const p of th.parts) {
        const row = document.createElement("label");
        row.className = "row";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.token = JSON.stringify(["PART", p.setName, p.part]);
        const span = document.createElement("span");
        span.textContent = p.part;
        row.appendChild(cb);
        row.appendChild(span);
        divParts.appendChild(row);
      }

      divTheme.appendChild(divParts);
      detHero.appendChild(divTheme);
    }

    root.appendChild(detHero);
  }
}

function getSelectedTokens() {
  const checks = qs("tree").querySelectorAll("input[type=checkbox]");
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
  return tokens; // preserves DOM order
}

// ---------- compute demand ----------
function computeDemand(tokens) {
  // tokens: ["SET", setName] or ["PART", setName, part]
  const setWanted = new Set(tokens.filter(t=>t[0]==="SET").map(t=>t[1]));
  const partWanted = new Set(tokens.filter(t=>t[0]==="PART").map(t=>`${t[1]}||${t[2]}`));

  const need = new Map(); // materialEN -> total need
  const rarity = new Map(); // materialEN -> rarity string

  for (const r of RECIPES) {
    const isSet = setWanted.has(r.setName);
    const isPart = partWanted.has(`${r.setName}||${r.part}`);
    if (!isSet && !isPart) continue;

    need.set(r.material, (need.get(r.material) ?? 0) + r.amount);
    if (!rarity.has(r.material)) rarity.set(r.material, r.rarity);
  }

  // output in fixed material order
  const ordered = [];
  for (const enKey of MATERIAL_ORDER_EN) {
    if (!need.has(enKey)) continue;
    ordered.push({ material: enKey, need: need.get(enKey), rarity: rarity.get(enKey) });
  }
  // append unknowns in first-seen order
  for (const [m, v] of need.entries()) {
    if (MATERIAL_ORDER_EN.includes(m)) continue;
    ordered.push({ material: m, need: v, rarity: rarity.get(m) });
  }

  return ordered;
}

// ---------- reserve and surplus ----------
function reserveAndSurplus(demandList, inv) {
  const useDirect = {};
  const leftover = {};
  const deficit = {};

  // build need map
  const needMap = {};
  for (const d of demandList) needMap[d.material] = d.need;

  // iterate in fixed material order (plus any unknown at end)
  const allMats = [...new Set([...MATERIAL_ORDER_EN, ...Object.keys(needMap)])];

  for (const m of allMats) {
    const have = inv[m] ?? 0;
    const need = needMap[m] ?? 0;
    const use = Math.min(have, need);
    if (use > 0) useDirect[m] = use;
    const left = have - use;
    const def = need - use;
    if (left > 0) leftover[m] = left;
    if (def > 0) deficit[m] = def;
  }
  return { useDirect, leftover, deficit };
}

// ---------- planning exchanges (two modes) ----------
function materialsByRarity(materialOrder) {
  const by = {1:[],2:[],3:[],4:[]};
  for (const m of materialOrder) {
    const info = MATERIAL_SET.get(m);
    if (!info) continue;
    by[info.rarity_lv].push(m);
  }
  return by;
}

function takeFromSurplus(surplus, candidatesInOrder, needQty) {
  // consume from end to preserve earlier materials
  const taken = new Map();
  let remaining = needQty;

  for (let i = candidatesInOrder.length - 1; i >= 0; i--) {
    const m = candidatesInOrder[i];
    if (remaining <= 0) break;
    const have = surplus[m] ?? 0;
    if (have <= 0) continue;
    const use = Math.min(have, remaining);
    surplus[m] = have - use;
    taken.set(m, (taken.get(m) ?? 0) + use);
    remaining -= use;
  }

  if (remaining > 0) {
    // undo
    for (const [m, q] of taken.entries()) {
      surplus[m] = (surplus[m] ?? 0) + q;
    }
    return null;
  }

  // return breakdown in forward order
  const out = [];
  for (const m of candidatesInOrder) {
    if (taken.has(m)) out.push([m, taken.get(m)]);
  }
  return out;
}

function planExchanges(mode, deficit, leftover, materialOrder) {
  const by = materialsByRarity(materialOrder);
  const matToLv = {};
  for (const m of materialOrder) matToLv[m] = MATERIAL_SET.get(m)?.rarity_lv ?? 1;

  const surplus = {};
  for (const m of materialOrder) surplus[m] = leftover[m] ?? 0;

  const rem = {...deficit};
  const ops = [];

  const surplusCount = (lv) => by[lv].reduce((s,m)=>s+(surplus[m]??0),0);

  const deficitsInOrderForLv = (lv) => {
    const out = [];
    for (const m of materialOrder) {
      if (rem[m] > 0 && matToLv[m] === lv) out.push([m, rem[m]]);
    }
    // append unknown materials in rem, in insertion order
    for (const m of Object.keys(rem)) {
      if (materialOrder.includes(m)) continue;
      if (rem[m] > 0 && matToLv[m] === lv) out.push([m, rem[m]]);
    }
    return out;
  };

  const do3 = (lv, target, times) => {
    if (times <= 0) return true;
    const consumed = takeFromSurplus(surplus, by[lv], 3*times);
    if (!consumed) return false;
    ops.push({kind:"3to1", from:lv, to:lv, target, times, consumed});
    rem[target] = Math.max(0, (rem[target]??0) - times);
    if (rem[target] === 0) delete rem[target];
    return true;
  };

  const do6 = (lv, target, times) => {
    if (times <= 0) return true;
    const consumed = takeFromSurplus(surplus, by[lv], 6*times);
    if (!consumed) return false;
    ops.push({kind:"6to1", from:lv, to:lv+1, target, times, consumed});
    rem[target] = Math.max(0, (rem[target]??0) - times);
    if (rem[target] === 0) delete rem[target];
    return true;
  };

  for (const lv of [4,3,2,1]) {
    if (lv === 4) {
      // super rare must come from rare via 6->1
      for (const [target, need] of deficitsInOrderForLv(4)) {
        const possible = Math.floor(surplusCount(3)/6);
        const take = Math.min(need, possible);
        if (take > 0) do6(3, target, take);
      }
      continue;
    }

    for (let [target, need] of deficitsInOrderForLv(lv)) {
      if (need <= 0) continue;

      if (mode === "3first") {
        // 3->1 within same rarity first
        const possible3 = Math.floor(surplusCount(lv)/3);
        const take3 = Math.min(need, possible3);
        if (take3 > 0) {
          do3(lv, target, take3);
          need = rem[target] ?? 0;
        }
        // if still missing and can be produced by 6->1 from lower rarity
        if (need > 0 && lv > 1) {
          const possible6 = Math.floor(surplusCount(lv-1)/6);
          const take6 = Math.min(need, possible6);
          if (take6 > 0) do6(lv-1, target, take6);
        }
      } else {
        // 6->1 from lower rarity first
        if (lv > 1) {
          const possible6 = Math.floor(surplusCount(lv-1)/6);
          const take6 = Math.min(need, possible6);
          if (take6 > 0) {
            do6(lv-1, target, take6);
            need = rem[target] ?? 0;
          }
        }
        // last resort 3->1 within same rarity
        if (need > 0) {
          const possible3 = Math.floor(surplusCount(lv)/3);
          const take3 = Math.min(need, possible3);
          if (take3 > 0) do3(lv, target, take3);
        }
      }
    }
  }

  // remaining deficit after ops
  const remDef = {};
  for (const [k,v] of Object.entries(rem)) if (v > 0) remDef[k] = v;
  return {ops, remDef};
}

// ---------- report ----------
function formatReport(tokens, demandList, matsOrder, useDirect, deficitBefore, leftover, ops, deficitAfter) {
  const U = t(LANG);

  const mname = (enKey)=> displayMaterial(LANG, enKey);

  const listInOrder = (obj) => {
    const out = [];
    for (const m of matsOrder) {
      if (obj[m] > 0) out.push([m, obj[m]]);
    }
    // append unknown
    for (const m of Object.keys(obj)) {
      if (matsOrder.includes(m)) continue;
      if (obj[m] > 0) out.push([m, obj[m]]);
    }
    return out;
  };

  const lines = [];
  const modeLabel = (MODE === "3first") ? U.mode3 : U.mode6;
  lines.push(U.reportMode(modeLabel));
  lines.push("");
  lines.push(U.selected(tokens.length));
  for (const tok of tokens) {
    if (tok[0] === "SET") lines.push(U.set(tok[1]));
    else lines.push(U.part(tok[1], tok[2]));
  }
  lines.push("");

  lines.push(U.sec1);
  if (!demandList.length) lines.push(U.none);
  else {
    for (const d of demandList) {
      lines.push(`- ${mname(d.material)} ×${d.need} (${d.rarity})`);
    }
  }
  lines.push("");

  lines.push(U.sec2);
  const resv = listInOrder(useDirect);
  if (!resv.length) lines.push(U.none);
  else resv.forEach(([m,v])=> lines.push(`- ${mname(m)} ×${v} ✅`));
  lines.push("");

  lines.push(U.sec3);
  const deb = listInOrder(deficitBefore);
  if (!deb.length) lines.push(U.none + " ✅");
  else deb.forEach(([m,v])=> lines.push(`- ${mname(m)} ×${v}`));
  lines.push("");

  lines.push(U.sec4);
  const sup = listInOrder(leftover);
  if (!sup.length) lines.push(U.none);
  else sup.forEach(([m,v])=> lines.push(`- ${mname(m)} ×${v}`));
  lines.push("");

  lines.push(U.sec5);
  if (!ops.length) lines.push(U.none);
  else {
    let i = 1;
    for (const op of ops) {
      const breakdown = op.consumed.length
        ? op.consumed.map(([m,q])=>`${mname(m)}×${q}`).join(" + ")
        : "-";
      if (op.kind === "3to1") {
        lines.push(U.step3(i, LV_RARITY[op.from], 3*op.times, breakdown, mname(op.target), op.times));
      } else {
        lines.push(U.step6(i, LV_RARITY[op.from], LV_RARITY[op.to], 6*op.times, breakdown, mname(op.target), op.times));
      }
      i++;
    }
  }
  lines.push("");

  lines.push(U.sec6);
  const daf = listInOrder(deficitAfter);
  if (!daf.length) {
    lines.push(U.none + " ✅");
    lines.push("");
    lines.push(U.ok);
  } else {
    daf.forEach(([m,v])=> lines.push(`- ${mname(m)} ×${v}`));
    lines.push("");
    lines.push(U.notOk);
  }

  return lines.join("\n");
}

// ---------- event handlers ----------
async function init() {
  qs("lang").addEventListener("change", async (e)=>{
    LANG = e.target.value;
    await reloadAll();
  });

  qs("mode").addEventListener("change", (e)=>{
    MODE = e.target.value;
  });

  qs("computeBtn").addEventListener("click", ()=>{
    compute();
  });

  qs("copyBtn").addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(qs("output").textContent);
      qs("status").textContent = LANG === "zh" ? "已复制到剪贴板" : "Copied to clipboard";
    }catch{
      qs("status").textContent = LANG === "zh" ? "复制失败（浏览器限制）" : "Copy failed (browser restriction)";
    }
  });

  await reloadAll();
}

async function reloadAll() {
  renderStaticTexts();
  qs("status").textContent = "Loading…";
  try{
    RECIPES = await loadData(LANG);
  }catch(e){
    qs("status").textContent = t(LANG).fetchFail;
    qs("output").textContent = String(e);
    return;
  }

  // material set + order
  const { mset, ordered } = buildMaterialSet(RECIPES);
  MATERIAL_SET = mset;

  // init inventory keys if missing
  for (const m of ordered) {
    if (INVENTORY[m] == null) INVENTORY[m] = 0;
  }

  HERO_TREE = buildTree(RECIPES);

  renderInventory(ordered);
  renderTree(HERO_TREE);

  qs("status").textContent = t(LANG).statusReady(RECIPES.length);
  qs("output").textContent = LANG === "zh"
    ? "请选择目标，填写库存，然后点击“开始计算”。"
    : "Select targets, fill inventory, then click Compute.";
}

function compute() {
  const tokens = getSelectedTokens();
  if (!tokens.length) {
    qs("output").textContent = t(LANG).noSelection;
    return;
  }

  const demandList = computeDemand(tokens);

  const inv = {...INVENTORY};
  const { useDirect, leftover, deficit } = reserveAndSurplus(demandList, inv);

  // build matsOrder from current inventory table order (fixed)
  const matsOrder = [];
  for (const tr of qs("invBody").querySelectorAll("tr")) {
    const key = tr.children[0].dataset.key;
    if (key) matsOrder.push(key);
  }

  const { ops, remDef } = planExchanges(MODE, deficit, leftover, matsOrder);

  const report = formatReport(tokens, demandList, matsOrder, useDirect, deficit, leftover, ops, remDef);
  qs("output").textContent = report;
}

// ---------- start ----------
document.addEventListener("DOMContentLoaded", init);
