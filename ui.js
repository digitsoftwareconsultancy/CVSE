/* ui.js - one shared helper for every page (button feedback, messages, confirm box, date fields).
   <meta name="app-version" content="2026.11.13-S7">
   Load it with <script src="ui.js"></script> before the page's own script.

   1. BUTTON FEEDBACK: when a button is tapped and the page asks the server, the button changes at once
      (grey, "Saving..."), a message shows right under the button row (blue while working, green when done,
      red with the reason when it failed) and the button returns to normal after about 2 seconds.
      Nothing has to be written in each page: this watches the page's own calls to the server.
   2. NO POP-UPS: alert() shows an in-page message near the button you tapped. UI.ask() is the in-page Yes / Cancel box.
   3. DATE FIELDS: every DD-MM-YYYY box gets automatic dashes, a calendar button and a clear message when it is not a real date.
   Nothing here changes any data. */
(function(){
  if(window.UI) return;
  var UI = window.UI = {};
  var doc = document;

  /* ---------- look ---------- */
  var css = '' +
  '.ui-msg{padding:11px 12px;border-radius:12px;font-weight:700;font-size:13.5px;margin:8px 0;line-height:1.45;width:100%;box-sizing:border-box;white-space:pre-wrap;word-break:break-word}' +
  '.ui-msg.load{background:#e0f2fe;color:#075985}.ui-msg.ok{background:#dcfce7;color:#14532d}.ui-msg.err{background:#fee2e2;color:#7f1d1d}.ui-msg.warn{background:#ffedd5;color:#9a3412}' +
  '.ui-busy{opacity:.75;cursor:progress!important}.ui-done{background:#16a34a!important;color:#fff!important}.ui-fail{background:#c62828!important;color:#fff!important}' +
  '.ui-toast{position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:9000;box-shadow:0 8px 24px rgba(0,0,0,.18)}' +
  '.ui-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px}' +
  '.ui-box{background:#fff;border-radius:16px;padding:16px;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.3)}' +
  '.ui-box .t{font-weight:800;font-size:16px;color:#0b2a5c;margin-bottom:6px}.ui-box .m{font-size:14px;color:#111827;line-height:1.5;white-space:pre-wrap;margin-bottom:12px}' +
  '.ui-box input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;min-height:46px;margin-bottom:12px}' +
  '.ui-box .r{display:flex;gap:8px}.ui-box button{flex:1;min-height:46px;border:none;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer}' +
  '.ui-box .y{background:#16a34a;color:#fff}.ui-box .y.d{background:#c62828}.ui-box .n{background:#0b2a5c;color:#fff}' +
  '.ui-dw{position:relative;display:block}.ui-dw>input{padding-right:50px!important}' +
  '.ui-dp{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:42px;height:38px;border:none;background:transparent;font-size:20px;cursor:pointer;padding:0;line-height:1}' +
  '.ui-dn{font-size:12.5px;font-weight:700;margin:4px 2px 0;line-height:1.35}.ui-dn.err{color:#c62828}.ui-dn.warn{color:#c2410c}' +
  '.ui-dh{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;left:0;bottom:0}';
  var st = doc.createElement('style'); st.textContent = css;
  (doc.head || doc.documentElement).appendChild(st);

  function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  UI.esc = esc;

  /* ---------- message under a button ---------- */
  function rowOf(btn){
    var r = btn.closest ? btn.closest('.btnrow') : null;
    return r || btn;
  }
  function inView(el){
    var r = el.getBoundingClientRect(), h = window.innerHeight || doc.documentElement.clientHeight;
    return r.top >= 60 && r.bottom <= h - 90;
  }
  UI.msgAt = function(btn, text, kind, keepMs){
    if(!btn || !btn.isConnected || !rowOf(btn).parentNode) return UI.toast(text, kind);
    var row = rowOf(btn);
    var m = row.__uimsg;
    if(!m || !m.isConnected){
      m = doc.createElement('div'); row.__uimsg = m;
      row.parentNode.insertBefore(m, row.nextSibling);
    }
    m.className = 'ui-msg ' + kind; m.textContent = text; m.style.display = 'block';
    clearTimeout(m.__t);
    if(keepMs) m.__t = setTimeout(function(){ if(m.parentNode) m.style.display = 'none'; }, keepMs);
    if(!inView(m)){ try{ m.scrollIntoView({block:'center', behavior:'smooth'}); }catch(e){ m.scrollIntoView(); } }
    return m;
  };

  /* ---------- watch which button was tapped ---------- */
  var last = {el:null, t:0};
  doc.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('button,a.btn,input[type=button],input[type=submit]') : null;
    if(b && !b.disabled) last = {el:b, t:Date.now()};
  }, true);

  function skipBtn(b){
    if(!b || b.__uiBusy) return true;
    if(b.hasAttribute('data-nofb')) return true;
    if(b.closest && b.closest('.tabs,.top,.setBar,.chips,.chip,nav,[data-nofb]')) return true;
    if(/tabBtn|btn-logout|chip/.test(b.className || '')) return true;
    return false;
  }
  var WORDS = [
    [/unpublish/i, 'Unpublishing...'], [/publish/i, 'Publishing...'], [/delete|remove|clear/i, 'Deleting...'],
    [/cancel/i, 'Cancelling...'], [/unlock/i, 'Unlocking...'], [/lock/i, 'Locking...'],
    [/create|add|new/i, 'Creating...'], [/pay|collect|receive/i, 'Processing...'],
    [/print|pdf|download|csv/i, 'Preparing...'], [/upload|import/i, 'Uploading...'], [/restore/i, 'Restoring...'],
    [/backup/i, 'Backing up...'], [/generate|build|make|fill|run|check|fix|finali/i, 'Working...'],
    [/send|share/i, 'Sending...'], [/search|find|show|view|load|refresh|open|get|list|report|preview/i, 'Loading...'],
    [/save|update|submit|confirm|apply|set|correct|change|reset|assign|link|mark|enter|done/i, 'Saving...']
  ];
  function labelFor(btn){
    var t = (btn.textContent || btn.value || '').replace(/\s+/g, ' ').trim();
    for(var i = 0; i < WORDS.length; i++) if(WORDS[i][0].test(t)) return {text:WORDS[i][1], load:WORDS[i][1] === 'Loading...'};
    return {text:'Working...', load:false};
  }
  function start(btn){
    var lab = labelFor(btn), job = {btn:btn, load:lab.load, html:btn.innerHTML, val:btn.value, dis:btn.disabled, busy:'⏳ ' + lab.text};
    btn.__uiBusy = true; btn.disabled = true; btn.classList.add('ui-busy');
    if(btn.tagName === 'INPUT') btn.value = job.busy; else btn.innerHTML = job.busy;
    job.busyHtml = btn.tagName === 'INPUT' ? null : btn.innerHTML;
    job.msg = UI.msgAt(btn, 'Working... please wait', 'load');
    return job;
  }
  function restore(job){
    var b = job.btn; b.__uiBusy = false;
    if(!b.isConnected) return;
    b.classList.remove('ui-busy', 'ui-done', 'ui-fail');
    if(b.tagName === 'INPUT'){ if(b.value.indexOf('⏳') === 0 || /^(✔|✖)/.test(b.value)){ b.value = job.val; b.disabled = job.dis; } }
    else if(b.innerHTML === job.shown){ b.innerHTML = job.html; b.disabled = job.dis; }
  }
  function finish(job, j){
    var b = job.btn, ok = !(j && (j.success === false || (j.error && j.success !== true)));
    var text = ok ? '✔ Done' : '✖ Failed';
    if(b.isConnected){
      b.classList.remove('ui-busy'); b.classList.add(ok ? 'ui-done' : 'ui-fail');
      b.disabled = false;
      if(b.tagName === 'INPUT') b.value = text; else b.innerHTML = text;
      job.shown = b.tagName === 'INPUT' ? text : b.innerHTML;
    }
    if(ok){
      if(job.load) UI.msgAt(b, 'Done', 'ok', 600);
      else UI.msgAt(b, '✔ ' + ((j && (j.message || j.msg)) || 'Done'), 'ok', 6000);
      setTimeout(function(){ restore(job); }, job.load ? 700 : 2000);
    }else{
      UI.msgAt(b, '✖ ' + ((j && (j.error || j.message)) || 'Could not finish. Please try again.'), 'err', 20000);
      setTimeout(function(){ restore(job); }, 2200);
    }
  }
  function isServer(url){
    try{
      var u = String(url && url.url ? url.url : url), w = (window.CVSE_CONFIG && window.CVSE_CONFIG.WEB_URL) || '';
      if(w && u.indexOf(w.split('?')[0]) === 0) return true;
      return /script\.google(usercontent)?\.com/.test(u);
    }catch(e){ return false; }
  }
  var origFetch = window.fetch;
  if(origFetch){
    window.fetch = function(url, opt){
      var btn = (last.el && Date.now() - last.t < 700 && last.el.isConnected) ? last.el : null;
      var job = (btn && isServer(url) && !skipBtn(btn)) ? start(btn) : null;
      if(job) last = {el:null, t:0};
      var p = origFetch.apply(this, arguments);
      if(!job) return p;
      return p.then(function(res){
        var c; try{ c = res.clone(); }catch(e){ finish(job, null); return res; }
        c.json().then(function(j){ finish(job, j); }, function(){ finish(job, res.ok ? null : {success:false, error:'The server did not answer properly. Please try again.'}); });
        return res;
      }, function(err){
        finish(job, {success:false, error:'Could not connect. Nothing was saved. Check the internet and try again.'});
        throw err;
      });
    };
  }

  /* ---------- no pop-ups ---------- */
  var BADWORDS = /\b(not|no|error|fail|failed|could|cannot|can't|invalid|wrong|enter|choose|select|required|expired|refused|stopped|missing|first|add at least|nothing)\b/i;
  UI.toast = function(text, kind){
    kind = kind || (BADWORDS.test(String(text)) ? 'err' : 'ok');
    var recent = last.el && last.el.isConnected && Date.now() - last.t < 30000 ? last.el : null;
    if(recent && !recent.__uiBusy && recent.closest && !recent.closest('.tabs')) return UI.msgAt(recent, String(text), kind, kind === 'ok' ? 7000 : 15000);
    var t = doc.createElement('div'); t.className = 'ui-msg ui-toast ' + kind; t.textContent = String(text);
    t.onclick = function(){ t.remove(); };
    doc.body.appendChild(t); setTimeout(function(){ if(t.parentNode) t.remove(); }, kind === 'ok' ? 7000 : 15000);
    return t;
  };
  /* a message shown just before the page changes (for example "Session expired") is shown again on the next page */
  window.alert = function(m){
    try{
      sessionStorage.setItem('cvse_flash', JSON.stringify({m:String(m), t:Date.now()}));
      setTimeout(function(){ try{ sessionStorage.removeItem('cvse_flash'); }catch(e){} }, 6000);
    }catch(e){}
    UI.toast(m);
  };
  function showFlash(){
    try{
      var f = JSON.parse(sessionStorage.getItem('cvse_flash') || 'null'); sessionStorage.removeItem('cvse_flash');
      if(f && f.m && Date.now() - f.t < 6000) UI.toast(f.m);
    }catch(e){}
  }

  function modal(title, msg, yes, danger, input, ph, def){
    return new Promise(function(res){
      var prev = last.el;                                  // the button that opened this box: it gets the Saving / Done feedback afterwards
      var ov = doc.createElement('div'); ov.className = 'ui-ov';
      ov.innerHTML = '<div class="ui-box"><div class="t">' + esc(title) + '</div><div class="m">' + esc(msg) + '</div>' +
        (input ? '<input type="text" id="uiIn" placeholder="' + esc(ph || '') + '" value="' + esc(def || '') + '">' : '') +
        '<div class="r"><button class="n" type="button">Cancel</button><button class="y' + (danger ? ' d' : '') + '" type="button">' + esc(yes) + '</button></div></div>';
      doc.body.appendChild(ov);
      var inp = ov.querySelector('#uiIn'); if(inp) setTimeout(function(){ inp.focus(); }, 50);
      function close(v){ ov.remove(); if(v && prev && prev.isConnected) last = {el:prev, t:Date.now()}; res(v); }
      ov.querySelector('.n').onclick = function(){ close(input ? null : false); };
      ov.querySelector('.y').onclick = function(){ close(input ? (inp.value || '') : true); };
      ov.addEventListener('click', function(e){ if(e.target === ov) close(input ? null : false); });
    });
  }
  /* in-page Yes / Cancel box:  if(!(await UI.ask('Delete this?'))) return;   */
  UI.ask = function(msg, yes, danger){ return modal('Please confirm', msg, yes || 'Yes', danger !== false && /delete|remove|unpublish|cancel|discard|lose|leave/i.test(msg), false); };
  /* in-page question with a text box:  var v = await UI.prompt('Reason?'); (null = cancelled)  */
  UI.prompt = function(msg, def){ return modal('Please write', msg, 'OK', false, true, '', def); };

  /* ---------- dates: DD-MM-YYYY ---------- */
  UI.dateOk = function(s){
    var m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(s || '').trim()); if(!m) return false;
    var d = +m[1], mo = +m[2], y = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
    return y >= 1900 && y <= 2100 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  };
  UI.ageOf = function(s){
    var m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || ''); if(!m) return null;
    var now = new Date(), a = now.getFullYear() - +m[3];
    if(now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[1])) a--;
    return a;
  };
  function maskVal(v){
    var d = String(v || '').replace(/[^0-9]/g, '').substring(0, 8), o = d;
    if(d.length > 4) o = d.substring(0, 2) + '-' + d.substring(2, 4) + '-' + d.substring(4);
    else if(d.length > 2) o = d.substring(0, 2) + '-' + d.substring(2);
    return o;
  }
  UI.maskD = function(el){ el.value = maskVal(el.value); };
  function note(inp, text, kind){
    var n = inp.__uin;
    if(!text){ if(n) n.remove(); inp.__uin = null; return; }
    if(!n || !n.isConnected){
      n = doc.createElement('div'); inp.__uin = n;
      var host = inp.parentNode.classList && inp.parentNode.classList.contains('ui-dw') ? inp.parentNode : inp;
      host.parentNode.insertBefore(n, host.nextSibling);
    }
    n.className = 'ui-dn ' + kind; n.textContent = text;
  }
  function isDob(inp){ return inp.hasAttribute('data-dob') || /(^|_)dob$/i.test(inp.id || '') || /dob/i.test(inp.getAttribute('data-k') || ''); }
  UI.checkDate = function(inp, quiet){
    var v = (inp.value || '').trim();
    inp.dataset.bad = '';
    if(!v){ note(inp, ''); return true; }
    if(!UI.dateOk(v)){
      inp.dataset.bad = '1';
      if(!quiet) note(inp, '✖ "' + v + '" is not a real date. Write it as DD-MM-YYYY, for example 03-10-2019.', 'err');
      return false;
    }
    if(isDob(inp)){
      var a = UI.ageOf(v);
      if(a !== null && (a < 0)) note(inp, '⚠ This date is in the future. Please check.', 'warn');
      else if(a !== null && (a < 2 || a > 25)) note(inp, '⚠ Age would be ' + a + ' years. Please check.', 'warn');
      else note(inp, '');
    }else note(inp, '');
    return true;
  };
  /* page code: if(!UI.checkDates(['dob','e_dob'])) return;  (shows the red note and stops the save) */
  UI.checkDates = function(ids){
    var ok = true;
    (ids || []).forEach(function(id){ var e = typeof id === 'string' ? doc.getElementById(id) : id; if(e && !UI.checkDate(e)) ok = false; });
    return ok;
  };
  function enhance(inp){
    if(inp.__uid || inp.type === 'date' || inp.type === 'hidden') return;
    inp.__uid = 1;
    inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('maxlength', '10'); inp.setAttribute('autocomplete', 'off');
    if(!inp.getAttribute('placeholder') || /dob|date/i.test(inp.getAttribute('placeholder')) && !/DD-MM-YYYY/.test(inp.getAttribute('placeholder'))) inp.setAttribute('placeholder', 'DD-MM-YYYY');
    var w = doc.createElement('span'); w.className = 'ui-dw';
    try{ var cs = getComputedStyle(inp); if(cs.flexGrow && cs.flexGrow !== '0') w.style.flex = cs.flex; w.style.minWidth = '0'; }catch(e){}
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    var hid = doc.createElement('input'); hid.type = 'date'; hid.className = 'ui-dh'; hid.tabIndex = -1; w.appendChild(hid);
    var bt = doc.createElement('button'); bt.type = 'button'; bt.className = 'ui-dp'; bt.setAttribute('aria-label', 'Choose date'); bt.setAttribute('data-nofb', '1'); bt.textContent = '📅';
    bt.onclick = function(){
      var v = (inp.value || '').trim(), m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
      if(m && UI.dateOk(v)) hid.value = m[3] + '-' + m[2] + '-' + m[1]; else hid.value = '';
      try{ if(hid.showPicker) hid.showPicker(); else hid.click(); }catch(e){ hid.click(); }
    };
    hid.onchange = function(){
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hid.value); if(!m) return;
      inp.value = m[3] + '-' + m[2] + '-' + m[1];
      inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true}));
      UI.checkDate(inp);
    };
    w.appendChild(bt);
    inp.addEventListener('input', function(){ var p = maskVal(inp.value); if(p !== inp.value) inp.value = p; if(inp.dataset.bad && inp.value.length === 10) UI.checkDate(inp); });
    inp.addEventListener('blur', function(){ UI.checkDate(inp); });
    if(inp.value && inp.value.length > 0 && inp.value.length < 10 && /^\d+$/.test(inp.value)) UI.checkDate(inp);
  }
  var DATE_SEL = 'input[data-date],input[oninput*="maskD"],input#dob,input#e_dob,input#f_dob,input#fx_dob,input#e_date,input#fDate,input#f_from,input#f_to';
  UI.enhanceDates = function(root){
    try{ (root || doc).querySelectorAll(DATE_SEL).forEach(enhance); }catch(e){}
  };
  function boot(){
    showFlash();
    UI.enhanceDates();
    try{
      var obs = new MutationObserver(function(list){
        for(var i = 0; i < list.length; i++){ if(list[i].addedNodes && list[i].addedNodes.length){ UI.enhanceDates(); break; } }
      });
      obs.observe(doc.body, {childList:true, subtree:true});
    }catch(e){}
  }
  if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
