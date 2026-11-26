/* ui.js - one shared helper for every page (button feedback, messages, confirm box, date fields).
   <meta name="app-version" content="2026.11.27-S31">
   Load it with <script src="ui.js"></script> before the page's own script.

   1. BUTTON FEEDBACK: when a button is tapped and the page asks the server, the button changes at once
      (grey, "Saving..."), a message shows right under the button row (blue while working, green when done,
      red with the reason when it failed) and the button returns to normal after about 2 seconds.
      Nothing has to be written in each page: this watches the page's own calls to the server.
   2. NO POP-UPS: alert() shows an in-page message near the button you tapped. UI.ask() is the in-page Yes / Cancel box.
   3. DATE FIELDS: every DD-MM-YYYY box gets automatic dashes, a calendar button and a clear message when it is not a real date.
   Nothing here changes any data. */
/* SP5: phone settings that must survive a logout (keys starting with cvse_keep_, e.g. the last payment mode in Collect Fees).
   Every page clears the phone storage at logout; this keeps only those keys. Logins / tokens are still cleared. */
(function(){
  try{
    var clear0 = Storage.prototype.clear;
    if(clear0 && !clear0.__keep){
      var c = function(){ var keep = {}, i, k; try{ for(i = 0; i < this.length; i++){ k = this.key(i); if(k && k.indexOf('cvse_keep_') === 0) keep[k] = this.getItem(k); } }catch(e){} clear0.call(this); for(k in keep){ try{ this.setItem(k, keep[k]); }catch(e){} } };
      c.__keep = true; Storage.prototype.clear = c;
    }
  }catch(e){}
})();
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
  // S23 (F6): the page's own message box right after the button row (class "msg"). When it exists the page shows the
  // result itself, so ui.js shows no second message (the button still shows ✔ / ✖).
  function pageMsg(btn){
    var row = rowOf(btn), n = row.nextElementSibling, k = 0;
    while(n && k < 3){
      if(n.classList && n.classList.contains('msg') && !n.classList.contains('ui-msg')) return n;
      if(!(n.classList && n.classList.contains('ui-msg'))) k++;
      n = n.nextElementSibling;
    }
    var pv = row.previousElementSibling;           // some pages put their message box just above the buttons
    if(pv && pv.classList && pv.classList.contains('msg') && !pv.classList.contains('ui-msg') && pv.id) return pv;
    return null;
  }
  UI.pageMsg = pageMsg;
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
    if(b.closest && b.closest('.tabs,.top,.topbar,.setBar,.chips,.chip,nav,[data-nofb]')) return true;
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
    // own = ui.js greys the button itself. When the page has already greyed it (it saves on its own), the page also
    // decides when it comes back, so ui.js never touches it (fix of 14-11-2026: a button stayed grey after a failed save).
    var lab = labelFor(btn), job = {btn:btn, load:lab.load, html:btn.innerHTML, val:btn.value, own:!btn.disabled, busy:'⏳ ' + lab.text};
    // S24 (F11): when the page greyed the button AND wrote its own busy label ("⏳ Saving..."), the page owns the label
    // (it puts its own result back): ui.js does not touch it at all (no busy text, no Done/Failed, no restore), only its message.
    // (Before, ui.js stored "⏳ Saving..." as the original label and put it back for ever after a failed save.)
    job.pageLabel = !job.own && /^\s*⏳/.test(btn.tagName === 'INPUT' ? String(btn.value || '') : String(btn.textContent || ''));
    btn.__uiBusy = true;
    if(job.own) btn.disabled = true;
    if(!job.pageLabel){ btn.classList.add('ui-busy'); if(btn.tagName === 'INPUT') btn.value = job.busy; else btn.innerHTML = job.busy; }
    job.busyHtml = btn.tagName === 'INPUT' ? null : btn.innerHTML;
    job.page = pageMsg(btn);
    job.msg = job.page ? null : UI.msgAt(btn, 'Working... please wait', 'load');
    return job;
  }
  function restore(job){
    var b = job.btn; b.__uiBusy = false;
    if(!b.isConnected) return;
    b.classList.remove('ui-busy', 'ui-done', 'ui-fail');
    if(b.tagName === 'INPUT'){ if(b.value.indexOf('⏳') === 0 || /^(✔|✖)/.test(b.value)){ b.value = job.val; if(job.own) b.disabled = false; } }
    else if(b.innerHTML === job.shown){ b.innerHTML = job.html; if(job.own) b.disabled = false; }
  }
  // S13: while the admin has paused all saves (or a promotion runs), a red bar at the top says so
  function pausedBar(j){
    if(!j || j.code !== 'PAUSED' || doc.getElementById('uiPaused')) return;
    var d = doc.createElement('div'); d.id = 'uiPaused'; d.textContent = '⏸ ' + (j.error || 'Saving is paused.');
    d.style.cssText = 'position:sticky;top:0;z-index:9999;background:#c62828;color:#fff;font-weight:800;padding:10px 14px;font-size:14px;text-align:center';
    d.onclick = function(){ d.remove(); };
    doc.body.insertBefore(d, doc.body.firstChild);
  }
  function finish(job, j){
    pausedBar(j);
    var b = job.btn, ok = !(j && (j.success === false || (j.error && j.success !== true)));
    var text = ok ? '✔ Done' : '✖ Failed';
    if(!b.isConnected){
      // the page replaced the button (it shows its own result): tidy our own "Working..." message (fix of 14-11-2026)
      var m = job.msg;
      if(m && m.isConnected){
        if(ok){ m.style.display = 'none'; }
        else { m.className = 'ui-msg err'; m.textContent = '✖ ' + ((j && (j.error || j.message)) || 'Could not finish. Please try again.'); m.style.display = 'block'; }
      }else if(!ok && !job.page) UI.toast('✖ ' + ((j && (j.error || j.message)) || 'Could not finish. Please try again.'), 'err');
      return;
    }
    if(job.pageLabel) b.__uiBusy = false;            // S24 (F11): the page owns this button's label
    if(b.isConnected && !job.pageLabel){
      b.classList.remove('ui-busy'); b.classList.add(ok ? 'ui-done' : 'ui-fail');
      if(job.own) b.disabled = false;
      if(b.tagName === 'INPUT') b.value = text; else b.innerHTML = text;
      job.shown = b.tagName === 'INPUT' ? text : b.innerHTML;
    }
    if(job.page){                                   // S23 (F6): the page shows its own message
      if(job.msg && job.msg.isConnected) job.msg.style.display = 'none';
      if(!job.pageLabel) setTimeout(function(){ restore(job); }, ok ? (job.load ? 700 : 2000) : 2200);
      return;
    }
    if(ok){
      if(job.load) UI.msgAt(b, 'Done', 'ok', 600);
      else UI.msgAt(b, '✔ ' + ((j && (j.message || j.msg)) || 'Done'), 'ok', 6000);
      if(!job.pageLabel) setTimeout(function(){ restore(job); }, job.load ? 700 : 2000);
    }else{
      UI.msgAt(b, '✖ ' + ((j && (j.error || j.message)) || 'Could not finish. Please try again.'), 'err', 20000);
      if(!job.pageLabel) setTimeout(function(){ restore(job); }, 2200);
    }
  }
  function isServer(url){
    try{
      var u = String(url && url.url ? url.url : url), w = (window.CVSE_CONFIG && window.CVSE_CONFIG.WEB_URL) || '';
      if(w && u.indexOf(w.split('?')[0]) === 0) return true;
      return /script\.google(usercontent)?\.com/.test(u);
    }catch(e){ return false; }
  }
  /* S31 (stage 5): Archive Viewer – a page opened with ?arch=<file id> reads a yearly archive copy (admin, read only).
     Every request of the page carries arch=…; the server refuses every save. UI.archUrl(u) keeps the archive on a link. */
  var AQ = new URLSearchParams(location.search);
  UI.arch = AQ.get('arch') || ''; UI.archSession = AQ.get('as') || '';
  UI.archUrl = function(u){ if(!UI.arch) return u; return u + (u.indexOf('?') > -1 ? '&' : '?') + 'arch=' + encodeURIComponent(UI.arch) + (UI.archSession ? '&as=' + encodeURIComponent(UI.archSession) : ''); };
  function archReq(url, opt){
    if(!UI.arch || typeof url !== 'string' || !isServer(url)) return [url, opt];
    if(opt && opt.body && typeof opt.body === 'string'){ try{ var b = JSON.parse(opt.body); b.arch = UI.arch; opt = Object.assign({}, opt, {body:JSON.stringify(b)}); }catch(e){} }
    else url = url + (url.indexOf('?') > -1 ? '&' : '?') + 'arch=' + encodeURIComponent(UI.arch);
    return [url, opt];
  }
  var origFetch = window.fetch;
  if(origFetch){
    window.fetch = function(url, opt){
      var ax = archReq(url, opt); url = ax[0]; opt = ax[1]; arguments[0] = url; if(arguments.length > 1 || opt) arguments[1] = opt;
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
        finish(job, {success:false, error:'Could not connect. Check the internet and try again.'});
        throw err;
      });
    };
  }

  /* ---------- S23 (L4): camera signatures on report cards / ID cards ---------- */
  // pictures <img data-sign="principal|ct"> get the real signature (one request per class; student app: own class)
  var SIGNS = {};
  UI.fillSigns = async function(box, cls, who){
    try{
      if(!box || !box.querySelector('img[data-sign]')) return;
      var w = (window.CVSE_CONFIG && window.CVSE_CONFIG.WEB_URL) || '', ls = function(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } };
      var stu = who === 'student' || (!ls('cvse_token') && !!ls('cvse_stoken')), key = (stu ? 'S|' : 'T|') + (cls || '');
      if(!SIGNS[key]){
        var url = w + '?action=' + (stu ? 'studentsigns' : 'signget') + '&token=' + encodeURIComponent(stu ? ls('cvse_stoken') : ls('cvse_token')) + (cls && !stu ? '&cls=' + encodeURIComponent(cls) : '') + (UI.arch && !stu ? '&arch=' + encodeURIComponent(UI.arch) : '');
        SIGNS[key] = origFetch ? origFetch(url).then(function(r){ return r.json(); }).catch(function(){ return {}; }) : Promise.resolve({});
      }
      var j = await SIGNS[key];
      Array.prototype.forEach.call(box.querySelectorAll('img[data-sign]'), function(im){
        var src = im.getAttribute('data-sign') === 'principal' ? j.principal : j.teacher;
        if(src){ im.src = src; im.style.visibility = ''; } else im.remove();
      });
    }catch(e){}
  };

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
      // optional limits on the field: data-min / data-max as DD-MM-YYYY (the picker greys out other days)
      var iso = function(t){ var x = /^(\d{2})-(\d{2})-(\d{4})$/.exec(t || ''); return x ? x[3] + '-' + x[2] + '-' + x[1] : ''; };
      hid.min = iso(inp.getAttribute('data-min')); hid.max = iso(inp.getAttribute('data-max'));
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
  /* S22: date style on PRINTS only. A print page calls UI.printDates(school.dateStyle) once it has its data; at the moment of
     printing every DD-MM-YYYY on the page is written in the school's style, and put back right after (screens never change). */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DSTYLE = 'DMY-', DSAVED = null;
  UI.fmtDate = function(t, style){
    return String(t).replace(/\b(\d{2})-(\d{2})-(\d{4})\b/g, function(all, d, m, y){
      var mi = +m; if(mi < 1 || mi > 12 || +d < 1 || +d > 31) return all;
      style = style || DSTYLE;
      return style === 'DMY/' ? d + '/' + m + '/' + y : style === 'DMY.' ? d + '.' + m + '.' + y : style === 'DMON' ? d + ' ' + MON[mi - 1] + ' ' + y : all;
    });
  };
  UI.printDates = function(style){ DSTYLE = ['DMY/', 'DMY.', 'DMON'].indexOf(style) > -1 ? style : 'DMY-'; };
  function dsOn(){
    if(DSTYLE === 'DMY-' || DSAVED) return;
    DSAVED = [];
    try{
      var w = doc.createTreeWalker(doc.body, 4, null), n;
      while((n = w.nextNode())){
        var pt = n.parentNode && n.parentNode.nodeName;
        if(pt === 'SCRIPT' || pt === 'STYLE' || pt === 'TEXTAREA' || !/\d{2}-\d{2}-\d{4}/.test(n.nodeValue)) continue;
        var nv = UI.fmtDate(n.nodeValue);
        if(nv !== n.nodeValue){ DSAVED.push([n, n.nodeValue]); n.nodeValue = nv; }
      }
    }catch(e){}
  }
  function dsOff(){ if(!DSAVED) return; DSAVED.forEach(function(x){ try{ x[0].nodeValue = x[1]; }catch(e){} }); DSAVED = null; }
  try{ window.addEventListener('beforeprint', dsOn); window.addEventListener('afterprint', dsOff); }catch(e){}
  UI._dsOn = dsOn; UI._dsOff = dsOff;
  /* ---------- S27 (b) + R7: the phone Back button ----------
     An app with bottom tabs calls UI.tabsBack({key, home, current(), open(id)}) once and UI.tabOpened(id) whenever a tab is shown:
     Back walks back through the tabs opened; from Home it leaves the app.
     Every other page: the phone Back does what the page's own Back does (its goBack(), wired automatically).
     A page with an inner screen (one report, one student) calls UI.innerOpen(closeFn) when it opens it and UI.innerClosed() when the
     page closes it itself: Back closes the inner screen first.
     UI.goBack(url) = the page's Back: closes an inner screen first; returns to the app entry it came from (no extra history), else opens url. */
  var NAV = {tabs:null, page:null, inner:null, skip:0, guard:false, pushed:0, quiet:false, leaving:false};
  function navPush(kind){ try{ history.pushState({uiNav:kind}, ''); NAV.pushed++; }catch(e){} }
  function navKey(){ return 'cvse_nav_' + NAV.tabs.key; }
  function navGet(){ try{ return JSON.parse(sessionStorage.getItem(navKey()) || '[]'); }catch(e){ return []; } }
  function navSet(a){ try{ sessionStorage.setItem(navKey(), JSON.stringify(a.slice(-30))); }catch(e){} }
  function navGuard(){ if(!NAV.guard){ NAV.guard = true; navPush('guard'); } }
  function navType(){ try{ var n = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]; return n ? n.type : ''; }catch(e){ return ''; } }
  UI.tabsBack = function(o){
    NAV.tabs = o;
    if(navType() === 'navigate' && !/[?&]tab=last/.test(location.search)) navSet([]);     // a fresh start (login) begins a new trail
    navGuard();
    window.addEventListener('pageshow', function(e){ if(e.persisted) location.reload(); });  // back from a page: fresh numbers
  };
  UI.tabOpened = function(id){ if(!NAV.tabs || NAV.quiet) return; if(NAV.inner) UI.innerClosed();   /* another tab: an open inner screen is left */ var a = navGet(); if(a[a.length - 1] !== id) a.push(id); navSet(a); };
  /* S27 (R10): turn a House text box into the House drop-down (list from Student record settings > Drop-down lists).
     An old typed House that is not in the list stays shown until another is chosen. No list / no internet = the box stays as it is. */
  UI.houseSelect = async function(id, cur, get){
    var el = doc.getElementById(id); if(!el) return;
    try{ if(!UI._houses){ var r = await get('houselist', {}); if(r && r.success) UI._houses = r.houses || []; } }catch(e){}
    el = doc.getElementById(id); if(!el || !UI._houses) return;
    cur = String(cur === undefined || cur === null ? (el.value || '') : cur).trim();
    var sel = el.tagName === 'SELECT' ? el : doc.createElement('select');
    var h = '<option value="">Choose</option>' + UI._houses.map(function(x){ return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    if(cur && UI._houses.indexOf(cur) < 0) h += '<option selected>' + esc(cur) + '</option>';
    sel.innerHTML = h;
    if(sel !== el){ sel.id = el.id; sel.className = el.className; if(el.getAttribute('style')) sel.setAttribute('style', el.getAttribute('style')); el.parentNode.replaceChild(sel, el); }
  };
  UI.pageBack = function(fn){ NAV.page = fn; navGuard(); };
  UI.innerOpen = function(close){ if(NAV.inner){ NAV.inner = close; return; } NAV.inner = close; navPush('inner'); };
  UI.innerClosed = function(){ if(!NAV.inner) return; NAV.inner = null; NAV.skip++; NAV.pushed = Math.max(0, NAV.pushed - 1); try{ history.back(); }catch(e){ NAV.skip--; } };
  UI.innerBack = function(){ if(!NAV.inner) return false; var c = NAV.inner; UI.innerClosed(); try{ c(); }catch(e){} return true; };
  UI.goBack = function(url){
    if(UI.innerBack()) return;
    if(UI.arch) url = 'archive.html' + (UI.archSession ? '?s=' + encodeURIComponent(UI.archSession) : '');   // S31: back to the Archive Viewer
    try{
      var r = doc.referrer ? new URL(doc.referrer) : null, t = new URL(url, location.href);
      if(r && r.origin === location.origin && r.pathname === t.pathname && history.length > NAV.pushed + 1){
        var tm = setTimeout(function(){ location.replace(url); }, 1200);
        window.addEventListener('pagehide', function(){ clearTimeout(tm); }, {once:true});
        history.go(-(NAV.pushed + 1)); return;
      }
    }catch(e){}
    location.replace(url);
  };
  window.addEventListener('popstate', function(){
    if(NAV.skip > 0){ NAV.skip--; return; }
    if(NAV.leaving){ if(history.state && history.state.uiNav){ try{ history.back(); }catch(e){} } else { NAV.leaving = false; last.el = null; UI.toast('Press Back again to close the app.', 'warn'); } return; }
    NAV.pushed = Math.max(0, NAV.pushed - 1);
    if(NAV.inner){ var c = NAV.inner; NAV.inner = null; try{ c(); }catch(e){} return; }
    NAV.guard = false;
    if(NAV.page){ try{ NAV.page(); }catch(e){} return; }
    if(!NAV.tabs) return;
    var a = navGet(), cur = NAV.tabs.current();
    if(a.length && a[a.length - 1] === cur) a.pop();
    var prev = a.length ? a[a.length - 1] : (cur && cur !== NAV.tabs.home ? NAV.tabs.home : '');
    if(prev){
      NAV.quiet = true; try{ NAV.tabs.open(prev); }catch(e){} NAV.quiet = false;
      navSet(a.length ? a : [prev]); navGuard(); return;
    }
    navSet([]);                                                         // on Home: Back leaves the app
    if(history.state && history.state.uiNav){ NAV.leaving = true; try{ history.back(); }catch(e){} }
    else { last.el = null; UI.toast('Press Back again to close the app.', 'warn'); }
  });

  /* S30 (stage 4): the 📢 icon in an app header, LEFT of Logout. list = active notices [{id,title}] (they come with the Home
     answer). The red number = notices NOT opened yet on this phone (remembered in localStorage cvse_keep_ntc_<who>, which
     survives Logout). UI.bell({who, list, open:function(){…}, before:logoutButton})  ·  UI.bellSeen(who, ids) after the list was shown. */
  function bellKey(who){ return 'cvse_keep_ntc_' + String(who || '').toLowerCase(); }
  function bellSeenSet(who){ try{ return JSON.parse(localStorage.getItem(bellKey(who)) || '[]') || []; }catch(e){ return []; } }
  UI.bellNew = function(who, list){ var s = bellSeenSet(who); return (list || []).filter(function(n){ return s.indexOf(String(n.id)) < 0; }).length; };
  UI.bellSeen = function(who, ids){
    try{ var s = bellSeenSet(who); (ids || []).forEach(function(i){ i = String(i); if(s.indexOf(i) < 0) s.push(i); }); localStorage.setItem(bellKey(who), JSON.stringify(s.slice(-300))); }catch(e){}
    var b = doc.getElementById('uiBell'); if(b) UI.bell({who:who, list:UI._bellList || [], open:UI._bellOpen, before:null});
  };
  UI.bell = function(o){
    UI._bellList = o.list || []; UI._bellOpen = o.open;
    var b = doc.getElementById('uiBell');
    if(!b){
      if(!doc.getElementById('uiBellCss')){ var st = doc.createElement('style'); st.id = 'uiBellCss';
        st.textContent = '.uiBell{position:relative;width:44px;height:44px;min-width:44px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;font-size:20px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0 6px 0 0;flex-shrink:0;box-shadow:none}.uiBell b{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#c62828;color:#fff;font-size:11.5px;font-weight:900;line-height:20px;text-align:center;border:2px solid #fff}.uiBellRow{display:flex;align-items:center;justify-content:flex-end}@media print{.uiBell{display:none!important}}';
        doc.head.appendChild(st); }
      b = doc.createElement('button'); b.type = 'button'; b.id = 'uiBell'; b.className = 'uiBell'; b.setAttribute('data-nofb', ''); b.setAttribute('aria-label', 'Notices');
      b.onclick = function(){ if(typeof UI._bellOpen === 'function') UI._bellOpen(); };
      var ref = o.before;
      if(ref && ref.parentNode){
        var par = ref.parentNode, cs = window.getComputedStyle ? getComputedStyle(par) : null;
        if(cs && cs.flexDirection === 'column'){                         // badge above Logout: put 📢 + Logout in one row
          var row = doc.createElement('div'); row.className = 'uiBellRow'; par.insertBefore(row, ref); row.appendChild(b); row.appendChild(ref);
        } else par.insertBefore(b, ref);
      }
    }
    var n = UI.bellNew(o.who, UI._bellList);
    b.innerHTML = '📢' + (n ? '<b>' + (n > 99 ? '99+' : n) + '</b>' : '');
    b.title = n ? n + ' new notice' + (n === 1 ? '' : 's') : 'Notices';
    b.setAttribute('aria-label', b.title);
    return n;
  };

  function boot(){
    showFlash();
    if(UI.arch){                                                          // S31: archive banner on every page opened from the Archive Viewer
      try{
        var bn = doc.createElement('div'); bn.className = 'uiArch noprint';
        bn.style.cssText = 'background:#fff7ed;border-bottom:2px solid #ef6c00;color:#9a3412;font-weight:800;font-size:13px;padding:9px 12px;text-align:center;position:sticky;top:0;z-index:60;line-height:1.4';
        bn.innerHTML = '🗄️ ARCHIVE ' + esc(UI.archSession || '') + ' – read only, nothing can be changed here. <a href="archive.html' + (UI.archSession ? '?s=' + encodeURIComponent(UI.archSession) : '') + '" style="color:#1976d2">Back to the Archive Viewer</a>';
        var top = doc.querySelector('body > .top, body > .topbar'); if(top && top.nextSibling) top.parentNode.insertBefore(bn, top.nextSibling); else doc.body.insertBefore(bn, doc.body.firstChild);
        var st2 = doc.createElement('style'); st2.textContent = '@media print{.uiArch{display:none!important}}'; doc.head.appendChild(st2);
      }catch(e){}
    }
    try{ if(!NAV.tabs && !NAV.page && typeof window.goBack === 'function' && !doc.body.hasAttribute('data-noback')) UI.pageBack(function(){ window.goBack(); }); }catch(e){}
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
