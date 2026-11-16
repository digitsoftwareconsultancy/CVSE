/* photo.js - S17 student photos: pick (phone camera or gallery), crop 3:4 like a passport photo, shrink to ONE JPEG of
   at most about 150 KB (600 x 800), then hand it to the page, which sends it with 'photosave'.
   <meta name="app-version" content="2026.11.16-S17">
   Used by student-record.html (photo box) and photos.html (Class photo day). Nothing here talks to the server.

   PHOTO.choose(camera) ............ opens the camera (camera = true) or the gallery; returns the chosen file (or null)
   PHOTO.open({file, title, sub, onSave}) ... the crop screen; onSave(base64Jpeg, kb) must return {ok:true} or {ok:false, msg}
   PHOTO.box(dataUrl, cls) ......... an <img> for a 3:4 photo box ('' = the empty 'No photo' box) */
var PHOTO = (function(){
  var W = 600, H = 800, MAX = 150 * 1024, SRC_MAX = 1800;
  var css = '.phm{position:fixed;inset:0;z-index:300;background:rgba(15,23,42,.88);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:12px 10px 30px}' +
    '.phm .pp{background:#fff;border-radius:16px;width:100%;max-width:420px;padding:14px;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
    '.phm h3{margin:0 0 2px;color:#0b2a5c;font-size:16px}.phm .ps{font-size:12px;color:#64748b;margin-bottom:10px}' +
    '.phm .stage{position:relative;width:100%;max-width:300px;margin:0 auto;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:#0f172a;touch-action:none;cursor:grab}' +
    '.phm canvas{width:100%;height:100%;display:block}' +
    '.phm .guide{position:absolute;left:22%;right:22%;top:12%;height:52%;border:2px dashed rgba(255,255,255,.75);border-radius:50%;pointer-events:none}' +
    '.phm .hint{font-size:11.5px;color:#64748b;text-align:center;margin:6px 0 2px}' +
    '.phm .zr{display:flex;align-items:center;gap:10px;margin:8px 0}.phm .zr input{flex:1;min-height:30px}.phm .zr span{font-size:18px}' +
    '.phm .pbr{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.phm .pbr .btn{flex:1;min-width:110px}' +
    '.phbox{width:90px;aspect-ratio:3/4;border-radius:10px;border:1.5px solid #cbd5e1;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;flex-shrink:0}' +
    '.phbox img{width:100%;height:100%;object-fit:cover;display:block}';
  function style(){ if(document.getElementById('phStyle')) return; var s = document.createElement('style'); s.id = 'phStyle'; s.textContent = css; document.head.appendChild(s); }
  function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function choose(camera){
    return new Promise(function(res){
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      if(camera) inp.setAttribute('capture', 'environment');           // back camera: the helper photographs the child
      inp.style.display = 'none'; inp.id = 'phInput';
      inp.onchange = function(){ var f = inp.files && inp.files[0]; inp.remove(); res(f || null); };
      document.body.appendChild(inp); inp.click();
    });
  }
  // the picture as a canvas (long side at most SRC_MAX: smooth dragging, little memory)
  function load(file){
    return new Promise(function(res, rej){
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function(){
        var k = Math.min(1, SRC_MAX / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('open')); };
      img.src = url;
    });
  }
  function rotate(src){
    var c = document.createElement('canvas'); c.width = src.height; c.height = src.width;
    var g = c.getContext('2d'); g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(src, 0, 0); return c;
  }
  // one JPEG ≤ MAX: lower the quality step by step; if still too big, a smaller picture
  function jpeg(canvas){
    var sizes = [[W, H], [480, 640]];
    for(var s = 0; s < sizes.length; s++){
      var c = canvas;
      if(s > 0){ c = document.createElement('canvas'); c.width = sizes[s][0]; c.height = sizes[s][1]; c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); }
      for(var q = 0.9; q >= 0.45; q -= 0.07){
        var url = c.toDataURL('image/jpeg', q), b64 = url.substring(url.indexOf(',') + 1), bytes = Math.floor(b64.length * 3 / 4);
        if(bytes <= MAX) return {data:b64, url:url, kb:Math.round(bytes / 1024)};
      }
    }
    return {data:b64, url:url, kb:Math.round(bytes / 1024)};
  }

  function open(o){
    style();
    var m = document.createElement('div'); m.className = 'phm'; m.id = 'phModal';
    m.innerHTML = '<div class="pp"><h3>' + esc(o.title || 'Student photo') + '</h3><div class="ps">' + esc(o.sub || '') + '</div>' +
      '<div class="stage" id="phStage"><canvas id="phCan" width="' + W + '" height="' + H + '"></canvas><div class="guide"></div></div>' +
      '<div class="hint">Drag the photo so the face sits inside the oval. Use the slider (or two fingers) to zoom.</div>' +
      '<div class="zr"><span>➖</span><input type="range" id="phZoom" min="100" max="300" value="100"><span>➕</span></div>' +
      '<div class="pbr"><button class="btn b-grey" type="button" id="phRot">↻ Turn</button><button class="btn b-grey" type="button" id="phCancel">Cancel</button></div>' +
      '<div class="pbr"><button class="btn b-green" type="button" id="phSave" data-nofb>✅ Save this photo</button></div>' +
      '<div class="msg" id="phMsg"></div></div>';
    document.body.appendChild(m);
    var can = m.querySelector('#phCan'), g = can.getContext('2d'), msg = m.querySelector('#phMsg'), zoom = m.querySelector('#phZoom');
    var src = null, base = 1, z = 1, x = 0, y = 0, busy = false;
    function say(t, k){ msg.className = 'msg show ' + k; msg.innerText = t; }
    function close(){ m.remove(); }
    function fitNew(){ base = Math.max(W / src.width, H / src.height); z = 1; zoom.value = 100; x = (W - src.width * base) / 2; y = (H - src.height * base) / 2; draw(); }
    function clamp(){
      var w = src.width * base * z, h = src.height * base * z;
      x = Math.min(0, Math.max(W - w, x)); y = Math.min(0, Math.max(H - h, y));
    }
    function draw(){ if(!src) return; clamp(); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(src, x, y, src.width * base * z, src.height * base * z); }
    function zoomTo(nz, cx, cy){                                        // keep the point (cx, cy) of the frame still
      nz = Math.max(1, Math.min(3, nz)); if(cx === undefined){ cx = W / 2; cy = H / 2; }
      var k = nz / z; x = cx - (cx - x) * k; y = cy - (cy - y) * k; z = nz; zoom.value = Math.round(z * 100); draw();
    }
    zoom.oninput = function(){ zoomTo(Number(zoom.value) / 100); };
    // drag with one finger / mouse, pinch with two fingers
    var stage = m.querySelector('#phStage'), pts = {}, last = null, pinch = null;
    function ratio(){ return W / stage.clientWidth; }
    stage.addEventListener('pointerdown', function(e){ stage.setPointerCapture(e.pointerId); pts[e.pointerId] = {x:e.clientX, y:e.clientY}; last = {x:e.clientX, y:e.clientY}; pinch = null; });
    stage.addEventListener('pointermove', function(e){
      if(!pts[e.pointerId] || !src) return;
      pts[e.pointerId] = {x:e.clientX, y:e.clientY};
      var ids = Object.keys(pts);
      if(ids.length >= 2){
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), r = stage.getBoundingClientRect();
        if(pinch){ zoomTo(pinch.z * d / pinch.d, ((a.x + b.x) / 2 - r.left) * ratio(), ((a.y + b.y) / 2 - r.top) * ratio()); }
        else pinch = {d:d || 1, z:z};
        return;
      }
      if(last){ x += (e.clientX - last.x) * ratio(); y += (e.clientY - last.y) * ratio(); draw(); }
      last = {x:e.clientX, y:e.clientY};
    });
    function up(e){ delete pts[e.pointerId]; pinch = null; var ids = Object.keys(pts); last = ids.length ? pts[ids[0]] : null; }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    m.querySelector('#phRot').onclick = function(){ if(src){ src = rotate(src); fitNew(); } };
    m.querySelector('#phCancel').onclick = function(){ if(!busy) close(); };
    m.querySelector('#phSave').onclick = async function(){
      if(!src || busy) return;
      var btn = this, html = btn.innerHTML, j = jpeg(can); busy = true; btn.disabled = true; btn.innerHTML = '⏳ Saving...';
      say('Saving the photo (' + j.kb + ' KB)... please wait', 'load');
      var r;
      try{ r = await o.onSave(j.data, j.kb, j.url); }catch(err){ r = {ok:false, msg:'❌ Could not connect. Check internet and tap Save again. Nothing was saved.'}; }
      busy = false;
      if(r && r.ok){ btn.innerHTML = '✔ Saved'; btn.classList.add('ui-done'); setTimeout(close, 400); return; }
      btn.innerHTML = '✖ Failed'; btn.classList.add('ui-fail');
      say((r && r.msg) || '❌ The photo was not saved. Please try again.', 'err');
      setTimeout(function(){ btn.innerHTML = html; btn.classList.remove('ui-fail'); btn.disabled = false; }, 2000);
    };
    say('Opening the picture...', 'load');
    load(o.file).then(function(c){ src = c; fitNew(); msg.className = 'msg'; })
      .catch(function(){ say('❌ This picture could not be opened (some phones save HEIC pictures). Please use "Take photo", or choose a JPG / PNG picture.', 'err'); m.querySelector('#phSave').disabled = true; m.querySelector('#phRot').disabled = true; });
    return m;
  }
  function box(dataUrl, cls){ style(); return '<div class="phbox' + (cls ? ' ' + cls : '') + '">' + (dataUrl ? '<img src="' + esc(dataUrl) + '" alt="Student photo">' : 'No<br>photo') + '</div>'; }
  return {choose:choose, open:open, box:box, jpeg:jpeg, MAX:MAX};
})();
