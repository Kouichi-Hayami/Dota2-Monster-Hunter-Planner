<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>MH Planner</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; }
    header { padding: 14px 18px; border-bottom: 1px solid #e5e5e5; display:flex; gap:12px; align-items:center; flex-wrap: wrap;}
    header h1 { font-size: 16px; margin: 0; font-weight: 650; }
    select, button { padding: 6px 10px; font-size: 14px; }
    main { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; padding: 12px; }
    .card { border: 1px solid #e5e5e5; border-radius: 10px; background: #fff; overflow: hidden; }
    .card h2 { margin: 0; padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #eee; background: #fafafa; }
    .card .content { padding: 10px 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #f0f0f0; padding: 6px 6px; text-align: left; }
    th { position: sticky; top: 0; background: #fff; z-index: 1; }
    input[type="number"] { width: 90px; padding: 4px 6px; }
    .tree { font-size: 13px; line-height: 1.5; }
    details { border: 1px solid #eee; border-radius: 8px; padding: 6px 8px; margin: 6px 0; }
    summary { cursor: pointer; font-weight: 650; }
    .theme { margin-left: 14px; margin-top: 6px; }
    .theme-head { display:flex; gap:8px; align-items:center; font-weight: 600; }
    .parts { margin-left: 18px; margin-top: 4px; display:grid; gap:4px; }
    .row { display:flex; gap:8px; align-items:center; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 12.5px; background:#0b1020; color:#e7e7e7; padding: 10px; border-radius: 10px; margin: 0; }
    .actions { display:flex; gap: 8px; align-items:center; }
    .muted { color:#666; font-size: 12px; }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<header>
  <h1 id="title">MH Planner</h1>

  <div class="actions">
    <label id="langLabel">Language:</label>
    <select id="lang">
      <option value="en" selected>English</option>
      <option value="zh">中文</option>
    </select>

    <label id="modeLabel">Strategy:</label>
    <select id="mode">
      <option value="3first">Low clicks (prefer 3→1; if insufficient then 6→1)</option>
      <option value="6first">Rarity-first (prefer 6→1; if needed then 3→1)</option>
    </select>

    <button id="computeBtn">Compute</button>
    <button id="copyBtn">Copy Output</button>
  </div>

  <span class="muted" id="status">Loading…</span>
</header>

<main>
  <section class="card">
    <h2 id="invTitle">Inventory</h2>
    <div class="content">
      <div class="muted" id="invHint">Enter how many materials you own.</div>
      <div style="max-height: 520px; overflow:auto; border:1px solid #eee; border-radius:10px; margin-top:8px;">
        <table>
          <thead>
            <tr>
              <th id="thMat">Material</th>
              <th id="thRar">Rarity</th>
              <th id="thOwn">Owned</th>
            </tr>
          </thead>
          <tbody id="invBody"></tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="card">
    <h2 id="tarTitle">Targets</h2>
    <div class="content">
      <div class="muted" id="tarHint">Select the parts/sets you still need. (Collapsed by default)</div>
      <div id="tree" class="tree"></div>
    </div>
  </section>

  <section class="card" style="grid-column: 1 / -1;">
    <h2 id="outTitle">Output</h2>
    <div class="content">
      <pre id="output"></pre>
    </div>
  </section>
</main>

<script src="app.js"></script>
</body>
</html>
