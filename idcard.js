/* DiGit School ERP – idcard.js (S18): draws a student ID card from the school's design.
   Used by idcard-settings.html (live preview) and idcards.html (print).  Sizes in mm: landscape 85.6 × 54, portrait 54 × 85.6.
   IDCARD.html(design, fields, school, student, side, opt) → '<div class="idc">…</div>'   side 'F' | 'B'
   IDCARD.fit(cardElement) → true when everything fits (else the card gets class 'over' and false)
   IDCARD.qr(text) → SVG (own QR maker, byte mode, error level M, no outside website)
   app-version 2026.11.16-S18 */
(function(){
  var COL = {dark:'#111827', navy:'#0b2a5c', blue:'#1976d2', red:'#c62828', green:'#16a34a', purple:'#7c3aed', orange:'#ef6c00'};
  var ACC = {yellow:'#fbc02d', lightblue:'#bbdefb', lightgreen:'#c8e6c9', lightorange:'#ffe0b2', lightpurple:'#e1bee7', grey:'#e5e7eb'};
  var MAINN = {red:'Red', navy:'Navy', blue:'Blue', green:'Green', purple:'Purple', orange:'Orange'};
  function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function col(d, c){ return c === 'main' ? COL[d.color] || COL.red : (COL[c] || COL.dark); }

  /* ================= QR code (ISO 18004, byte mode, level M, versions 1–10) ================= */
  var ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], BLK_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  function gmul(x, y){ var z = 0; for(var i = 7; i >= 0; i--){ z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
  function rsDiv(deg){ var r = []; for(var i = 0; i < deg; i++) r.push(0); r[deg - 1] = 1; var root = 1;
    for(i = 0; i < deg; i++){ for(var j = 0; j < r.length; j++){ r[j] = gmul(r[j], root); if(j + 1 < r.length) r[j] ^= r[j + 1]; } root = gmul(root, 2); } return r; }
  function rsRem(data, dv){ var r = dv.map(function(){ return 0; });
    data.forEach(function(b){ var f = b ^ r.shift(); r.push(0); dv.forEach(function(c, i){ r[i] ^= gmul(c, f); }); }); return r; }
  function rawMods(v){ var r = (16 * v + 128) * v + 64; if(v >= 2){ var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if(v >= 7) r -= 36; } return r; }
  function dataCw(v){ return Math.floor(rawMods(v) / 8) - ECC_M[v] * BLK_M[v]; }
  function alignPos(v){ if(v === 1) return []; var n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for(var p = size - 7; r.length < n; p -= step) r.splice(1, 0, p); return r; }
  function qrMatrix(text){
    var bytes = unescape(encodeURIComponent(String(text))).split('').map(function(c){ return c.charCodeAt(0); });
    var v = 1; while(v <= 10 && 4 + (v < 10 ? 8 : 16) + bytes.length * 8 > dataCw(v) * 8) v++;
    if(v > 10) return null;
    var bits = [], put = function(val, n){ for(var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function(b){ put(b, 8); });
    var cap = dataCw(v) * 8; put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
    for(var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = []; for(var i = 0; i < bits.length; i += 8){ var b = 0; for(var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }
    // error correction blocks, interleaved
    var nb = BLK_M[v], el = ECC_M[v], raw = Math.floor(rawMods(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), dv = rsDiv(el), blocks = [], at = 0;
    for(i = 0; i < nb; i++){ var len = shortLen - el + (i < nShort ? 0 : 1), dat = data.slice(at, at + len); at += len;
      var ecc = rsRem(dat, dv); if(i < nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
    var all = [];
    for(i = 0; i < blocks[0].length; i++) for(var j = 0; j < nb; j++) if(i !== shortLen - el || j >= nShort) all.push(blocks[j][i]);
    // matrix
    var size = v * 4 + 17, M = [], F = [];
    for(i = 0; i < size; i++){ M.push([]); F.push([]); for(j = 0; j < size; j++){ M[i].push(false); F[i].push(false); } }
    var setF = function(x, y, d){ M[y][x] = d; F[y][x] = true; };
    for(i = 0; i < size; i++){ setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function(c){
      for(var dy = -4; dy <= 4; dy++) for(var dx = -4; dx <= 4; dx++){ var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
        if(xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4); } });
    var ap = alignPos(v), na = ap.length;
    for(i = 0; i < na; i++) for(j = 0; j < na; j++){ if((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for(var dy2 = -2; dy2 <= 2; dy2++) for(var dx2 = -2; dx2 <= 2; dx2++) setF(ap[i] + dx2, ap[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1); }
    var drawFormat = function(mask){
      var d = (0 << 3) | mask, r = d; for(var q = 0; q < 10; q++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var fb = ((d << 10) | r) ^ 0x5412, bit = function(n){ return ((fb >>> n) & 1) !== 0; };
      for(q = 0; q <= 5; q++) setF(8, q, bit(q));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for(q = 9; q < 15; q++) setF(14 - q, 8, bit(q));
      for(q = 0; q < 8; q++) setF(size - 1 - q, 8, bit(q));
      for(q = 8; q < 15; q++) setF(8, size - 15 + q, bit(q));
      setF(8, size - 8, true);
    };
    drawFormat(0);
    if(v >= 7){ var rr = v; for(i = 0; i < 12; i++) rr = (rr << 1) ^ ((rr >>> 11) * 0x1F25); var vb = (v << 12) | rr;
      for(i = 0; i < 18; i++){ var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, bb = Math.floor(i / 3); setF(a, bb, bt); setF(bb, a, bt); } }
    // data
    var n = 0;
    for(var right = size - 1; right >= 1; right -= 2){ if(right === 6) right = 5;
      for(var vert = 0; vert < size; vert++) for(j = 0; j < 2; j++){ var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if(!F[y][x] && n < all.length * 8){ M[y][x] = ((all[n >>> 3] >>> (7 - (n & 7))) & 1) !== 0; n++; } } }
    // mask: the one with the lowest penalty
    var maskFn = [function(x, y){ return (x + y) % 2 === 0; }, function(x, y){ return y % 2 === 0; }, function(x){ return x % 3 === 0; },
      function(x, y){ return (x + y) % 3 === 0; }, function(x, y){ return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function(x, y){ return x * y % 2 + x * y % 3 === 0; }, function(x, y){ return (x * y % 2 + x * y % 3) % 2 === 0; },
      function(x, y){ return ((x + y) % 2 + x * y % 3) % 2 === 0; }];
    var applyMask = function(m){ for(var y = 0; y < size; y++) for(var x = 0; x < size; x++) if(!F[y][x] && maskFn[m](x, y)) M[y][x] = !M[y][x]; };
    var penalty = function(){
      var p = 0, y, x, run, dark = 0;
      for(var pass = 0; pass < 2; pass++) for(y = 0; y < size; y++){ run = 1;
        for(x = 1; x <= size; x++){ var same = x < size && (pass ? M[x][y] === M[x - 1][y] : M[y][x] === M[y][x - 1]);
          if(same) run++; else { if(run >= 5) p += run - 2; run = 1; } } }
      for(y = 0; y < size - 1; y++) for(x = 0; x < size - 1; x++){ var c = M[y][x]; if(c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      for(y = 0; y < size; y++) for(x = 0; x < size; x++) if(M[y][x]) dark++;
      p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    var best = 0, bestP = Infinity;
    for(var m = 0; m < 8; m++){ applyMask(m); drawFormat(m); var pe = penalty(); if(pe < bestP){ bestP = pe; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return M;
  }
  function qrSvg(text){
    var M = qrMatrix(text); if(!M) return '';
    var n = M.length, q = 2, p = '';
    for(var y = 0; y < n; y++) for(var x = 0; x < n; x++) if(M[y][x]) p += 'M' + (x + q) + ',' + (y + q) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * q) + ' ' + (n + 2 * q) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + p + '" fill="#000"/></svg>';
  }

  /* ================= the card ================= */
  var CSS = '' +
    '.idc{position:relative;overflow:hidden;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;--s:1;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;line-height:1.15}' +
    '.idc *{box-sizing:border-box}.idc.L{width:85.6mm;height:54mm}.idc.P{width:54mm;height:85.6mm}' +
    '.idc .dk{position:absolute;inset:0;pointer-events:none}' +
    '.idc .hd{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:1.2mm;padding:1.3mm 2.4mm 0}' +
    '.idc.L .hd{height:14mm}.idc.P .hd{height:15.5mm;padding:1.6mm 2mm 0}' +
    '.idc .hd .lg{width:11mm;height:11mm;border-radius:50%;flex-shrink:0;background:#fff;object-fit:contain}.idc.P .hd .lg{width:10mm;height:10mm}' +
    '.idc .hd .tx{flex:1;min-width:0;text-align:center}' +
    '.idc .hd .sn{font-weight:900;font-size:calc(9.5pt * var(--s));white-space:nowrap;text-transform:uppercase;letter-spacing:.1pt}.idc.P .hd .sn{white-space:normal;font-size:calc(8pt * var(--s))}' +
    '.idc .hd .sa{font-size:5.4pt;font-weight:700;margin-top:.3mm}.idc .hd .af{font-size:5.4pt;font-weight:700;color:#1976d2;margin-top:.2mm}' +
    '.idc .hd img.hi{width:100%;height:100%;object-fit:contain}' +
    '.idc .tt{position:absolute;left:0;right:0;text-align:center;font-weight:900;font-size:8.5pt;letter-spacing:.4pt;white-space:nowrap}' +
    '.idc.L .tt{top:14.6mm}.idc.P .tt{top:16.2mm}' +
    '.idc .bd{position:absolute;left:2.4mm;right:2.4mm;display:flex;gap:2mm}' +
    '.idc.L .bd{top:19.4mm;bottom:5mm}.idc.P .bd{top:20.6mm;bottom:5.2mm;flex-direction:column;align-items:center;gap:1mm}' +
    '.idc .lc{display:flex;flex-direction:column;align-items:center;width:18mm;flex-shrink:0}.idc.P .lc{width:auto}' +
    '.idc .ph{width:16.5mm;height:22mm;border:.3mm solid #111;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#64748b;overflow:hidden;text-align:center}' +
    '.idc.P .ph{width:19.5mm;height:26mm}.idc .ph img{width:100%;height:100%;object-fit:cover}' +
    '.idc .adm{font-weight:800;font-size:calc(6.2pt * var(--s));margin-bottom:.6mm;white-space:nowrap}' +
    '.idc .sg{text-align:center;font-size:5.4pt;font-weight:700;margin-top:.4mm;line-height:1}.idc .sg img{display:block;height:4.2mm;max-width:17mm;margin:0 auto;object-fit:contain}' +
    '.idc .sg .bl{height:4.2mm}' +
    '.idc .rc{flex:1;min-width:0;display:flex;gap:1.2mm;overflow:hidden}.idc.P .rc{width:100%}' +
    '.idc .ls{flex:1;min-width:0;overflow:hidden}' +
    '.idc .nm{font-weight:900;font-size:calc(10pt * var(--s));text-align:center;margin:.2mm 0 .8mm;line-height:1.08;overflow-wrap:anywhere}' +
    '.idc .ln{font-size:calc(7pt * var(--s));font-weight:700;margin:.45mm 0;overflow-wrap:anywhere}' +
    '.idc.P .ln{text-align:center}.idc .ln b{font-weight:800}' +
    '.idc .sh{display:flex;flex-wrap:wrap;gap:.6mm 1.2mm;margin:.5mm 0}.idc.P .sh{justify-content:center}' +
    '.idc .sh .pi{font-size:calc(7pt * var(--s));font-weight:800;padding:.15mm 1.2mm;border-radius:2mm;white-space:nowrap}' +
    '.idc .qr{width:12mm;height:12mm;flex-shrink:0;align-self:flex-end}.idc .qr svg{width:100%;height:100%;display:block}' +
    '.idc .ft{position:absolute;left:1.5mm;right:1.5mm;bottom:1mm;text-align:center;font-size:calc(5.8pt * var(--s));font-weight:800;line-height:1.1}' +
    '.idc .hb{position:absolute}.idc.L .hb{left:0;top:0;bottom:0;width:1.8mm}.idc.P .hb{left:0;right:0;bottom:0;height:1.8mm}' +
    '.idc.B .bd{top:13mm;flex-direction:column;align-items:stretch}.idc.B .hd{height:11.5mm}' +
    '.idc.B .rc{flex-direction:row}.idc.B .bot{display:flex;justify-content:flex-end;align-items:flex-end;gap:3mm;flex-shrink:0}' +
    '.idc.over{outline:.8mm solid #c62828}';
  function css(){ return CSS; }

  function deco(d, side){
    var m = COL[d.color] || COL.red, a = ACC[d.accent] || ACC.yellow, h = '';
    if(d.deco === 'CLASSIC'){
      var P = d.shape === 'P';
      var tr = P ? ['74% 0,82% 0,100% 11%,100% 16%', '82% 0,100% 0,100% 11%'] : ['70% 0,79% 0,100% 33%,100% 45%', '79% 0,100% 0,100% 33%'];
      var bl = P ? ['0 86%,0 91%,16% 100%,24% 100%', '0 91%,0 100%,16% 100%'] : ['0 75%,0 84%,12% 100%,19% 100%', '0 84%,0 100%,12% 100%'];
      h += '<div class="dk" style="background:' + a + ';clip-path:polygon(' + tr[0] + ')"></div>' +
           '<div class="dk" style="background:' + m + ';clip-path:polygon(' + tr[1] + ')"></div>' +
           '<div class="dk" style="background:' + a + ';clip-path:polygon(' + bl[0] + ')"></div>' +
           '<div class="dk" style="background:' + m + ';clip-path:polygon(' + bl[1] + ')"></div>';
    } else if(d.deco === 'BAND'){
      h += '<div class="dk" style="bottom:auto;height:' + (side === 'B' ? '11.5mm' : (d.shape === 'P' ? '15.5mm' : '14mm')) + ';background:' + m + '"></div>' +
           '<div class="dk" style="top:auto;height:1.4mm;background:' + a + '"></div>';
    } else {
      h += '<div class="dk" style="border:.5mm solid ' + m + ';border-radius:1.5mm"></div>';
    }
    return h;
  }
  function header(d, sc, side){
    var white = d.deco === 'BAND', tc = white ? '#fff' : '#111827';
    if(d.header === 'IMAGE' && d.headerImg && side !== 'B')
      return '<div class="hd"><img class="hi" src="' + esc(d.headerImg) + '" alt="" onerror="this.parentNode.outerHTML=this.parentNode.getAttribute(\'data-alt\')"></div>'.replace('<div class="hd">', '<div class="hd" data-alt="' + esc(headerText(d, sc, side, tc)) + '">');
    return headerText(d, sc, side, tc);
  }
  function headerText(d, sc, side, tc){
    var logo = d.logoPos !== 'N' && sc.logo ? '<img class="lg" src="' + esc(sc.logo) + '" alt="" onerror="this.style.visibility=\'hidden\'">' : '';
    var tx = '<div class="tx" style="color:' + tc + '"><div class="sn fit1">' + esc(sc.name || 'School name') + '</div>' +
      (d.showAddress && sc.address ? '<div class="sa">' + esc(sc.address) + '</div>' : '') +
      (side !== 'B' && d.showAffil && sc.affiliation ? '<div class="af"' + (d.deco === 'BAND' ? ' style="color:#fff"' : '') + '>' + esc(/^affil/i.test(sc.affiliation) ? sc.affiliation : 'Affiliation No: ' + sc.affiliation) + '</div>' : '') +
      (d.showPhone && sc.phone ? '<div class="sa">Ph: ' + esc(sc.phone) + '</div>' : '') + '</div>';
    return '<div class="hd">' + (d.logoPos === 'L' ? logo + tx : tx + (d.logoPos === 'R' ? logo : '')) + '</div>';
  }
  function value(k, d, sc, s){
    if(k === 'valid') return sc.validFrom ? sc.validFrom + ' – ' + sc.validTo : '';
    if(k === 'note') return d.note;
    if(k === 'school') return [sc.address, sc.phone ? 'Ph: ' + sc.phone : ''].filter(Boolean).join(' · ');
    if(k === 'ret') return d.retText + (sc.phone ? ' Ph: ' + sc.phone : '');
    return s[k] === undefined || s[k] === null ? '' : String(s[k]);
  }
  function kindOf(fields, k){ for(var i = 0; i < fields.length; i++) if(fields[i].key === k) return fields[i].kind; return 'L'; }
  // the lines of one side, in the school's order (short fields next to each other on one line)
  function lines(d, fields, sc, s, side){
    var h = '', group = [];
    var flush = function(){
      if(!group.length) return;
      h += '<div class="sh">' + group.map(function(g){
        var f = d.fields[g.k], c = col(d, f.c);
        return '<span class="pi" style="' + (d.pills ? 'background:' + (ACC[d.accent] || ACC.yellow) + ';' : 'padding-left:0;') + 'color:' + c + '">' + (f.label ? esc(f.label) + ': ' : '') + '<span style="color:' + (d.pills ? '#111827' : c) + '">' + esc(g.v || '-') + '</span></span>';
      }).join('') + '</div>';
      group = [];
    };
    d.order.forEach(function(k){
      var f = d.fields[k]; if(!f || f.side !== side) return;
      if(k === 'adm' && d.admPos === 'PHOTO' && side === 'F') return;
      var kind = kindOf(fields, k); if(kind === 'X') return;
      var v = value(k, d, sc, s);
      if(kind === 'S'){ group.push({k:k, v:v}); return; }
      flush();
      if(!v && (k === 'note' || k === 'school' || k === 'ret')) return;
      h += '<div class="ln" data-k="' + k + '" style="color:' + col(d, f.c) + '">' + (f.label ? '<b>' + esc(f.label) + ':</b> ' : '') + esc(v || '-') + '</div>';
    });
    flush();
    return h;
  }
  function sign(d, sc){
    var f = d.fields.sign;
    return '<div class="sg" style="color:' + col(d, f.c) + '">' + (sc.sign ? '<img src="' + esc(sc.sign) + '" alt="" onerror="this.outerHTML=\'<div class=bl></div>\'">' : '<div class="bl"></div>') + esc(f.label || 'Principal') + '</div>';
  }
  function photoBox(s, url){
    return '<div class="ph" data-padm="' + esc(s.adm) + '">' + (url ? '<img src="' + esc(url) + '" alt="">' : (s.photo && s.photo.has ? 'Loading…' : 'No photo')) + '</div>';
  }
  function html(d, fields, sc, s, side, opt){
    opt = opt || {};
    var cls = 'idc ' + (d.shape === 'P' ? 'P' : 'L') + (side === 'B' ? ' B' : ''), h = '<div class="' + cls + '" data-adm="' + esc(s.adm) + '" data-side="' + side + '">';
    h += deco(d, side);
    if(d.houseBand && s.house && d.houseColors && d.houseColors[s.house]) h += '<div class="hb" style="background:' + esc(d.houseColors[s.house]) + '"></div>';
    h += header(d, sc, side);
    var main = COL[d.color] || COL.red, foot = d.fields.footer, qrOn = d.fields.qr.side === side, signOn = d.fields.sign.side === side;
    var qr = qrOn ? '<div class="qr">' + qrSvg(s.adm) + '</div>' : '';
    if(side === 'F'){
      if(d.title || d.showSession) h += '<div class="tt" style="color:' + main + '">' + esc(d.title) + (d.showSession && sc.session ? ' ' + esc(sc.session) : '') + '</div>';
      var adm = d.admPos === 'PHOTO' ? '<div class="adm" style="color:' + col(d, d.fields.adm.c) + '">' + (d.fields.adm.label ? esc(d.fields.adm.label) + ': ' : '') + esc(s.adm) + '</div>' : '';
      var name = '<div class="nm fit2">' + esc(d.nameCaps ? String(s.name || '').toUpperCase() : s.name) + '</div>';
      if(d.shape === 'P'){
        h += '<div class="bd"><div class="lc">' + adm + photoBox(s, opt.photo) + '</div><div class="rc"><div class="ls">' + name + lines(d, fields, sc, s, 'F') + '</div>' + qr + '</div>' + (signOn ? '<div style="align-self:flex-end;margin-top:auto">' + sign(d, sc) + '</div>' : '') + '</div>';
      } else {
        h += '<div class="bd"><div class="lc">' + adm + photoBox(s, opt.photo) + (signOn ? sign(d, sc) : '') + '</div><div class="rc"><div class="ls">' + name + lines(d, fields, sc, s, 'F') + '</div>' + qr + '</div></div>';
      }
    } else {
      h += '<div class="bd"><div class="rc"><div class="ls">' + lines(d, fields, sc, s, 'B') + '</div></div>' +
        (qrOn || signOn ? '<div class="bot">' + (signOn ? sign(d, sc) : '') + qr + '</div>' : '') + '</div>';
    }
    if(foot.side === side && d.footer) h += '<div class="ft" style="color:' + col(d, foot.c) + (d.deco === 'CLASSIC' ? ';left:' + (d.shape === 'P' ? '9mm;right:3mm' : '11mm;right:4mm') : '') + '">' + esc(d.footer) + '</div>';
    return h + '</div>';
  }
  // shrink to fit: school name on one line (landscape), name up to 2 lines, then the whole text a little smaller
  function fit(el){
    el.classList.remove('over'); el.style.setProperty('--s', 1);
    var sn = el.querySelector('.sn.fit1');
    if(sn && el.classList.contains('L')){ var fs = 9.5; sn.style.fontSize = ''; while(sn.scrollWidth > sn.clientWidth + 1 && fs > 6){ fs -= 0.25; sn.style.fontSize = fs + 'pt'; } }
    var nm = el.querySelector('.nm'), body = el.querySelector('.ls');
    if(nm){ var nf = 10; nm.style.fontSize = ''; var lh = function(){ return parseFloat(getComputedStyle(nm).fontSize) * 1.08 * 2 + 1; };
      while(nm.offsetHeight > lh() && nf > 7){ nf -= 0.25; nm.style.fontSize = nf + 'pt'; } }
    var over = function(){ var bad = false; el.querySelectorAll('.ls,.bd').forEach(function(b){ if(b.scrollHeight > b.clientHeight + 1) bad = true; }); return bad; };
    var s = 1;
    while(over() && s > 0.72){ s = Math.round((s - 0.04) * 100) / 100; el.style.setProperty('--s', s); }
    if(over()){ el.classList.add('over'); return false; }
    return true;
  }
  window.IDCARD = {html:html, fit:fit, css:css, qr:qrSvg, qrMatrix:qrMatrix, colors:COL, accents:ACC, mainNames:MAINN, esc:esc};
})();
