/* profile.js - S21 shared "Profile" screen for every staff user (teacher app, admin Profile tab, accountant My Profile).
   <meta name="app-version" content="2026.11.21-S23">
   Needs on the page: config.js, ui.js, photo.js. Use: PROFILE.mount(document.getElementById('box'), {back:function(){...}})
   Teachers / accountant: only EMPTY fields can be typed; 'Send to office' → the admin accepts each field; accepted = locked.
   Admin: his own values are saved at once (he is the one who accepts). Password change for everybody. */
var PROFILE = (function(){
  var URL_ = (window.CVSE_CONFIG && window.CVSE_CONFIG.WEB_URL) || '';
  var css = '.pf-head{display:flex;gap:12px;align-items:center}.pf-ph{width:84px;height:112px;border-radius:12px;background:#f1f5f9;border:1px solid #e5e7eb;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:11px;font-weight:700;text-align:center;flex-shrink:0}' +
    '.pf-ph img{width:100%;height:100%;object-fit:cover}.pf-name{font-size:18px;font-weight:800;color:#0b2a5c}.pf-sub{font-size:12.5px;color:#64748b;margin-top:3px;line-height:1.45}' +
    '.pf-bar{height:8px;border-radius:99px;background:#e5e7eb;margin-top:8px;overflow:hidden}.pf-bar i{display:block;height:100%;background:#16a34a}' +
    '.pf-f{border-top:1px solid #eef0f3;padding:10px 0}.pf-f:first-of-type{border-top:none}.pf-l{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:#0b2a5c;margin-bottom:5px}' +
    '.pf-v{font-size:15px;color:#111827;padding:4px 0;white-space:pre-line;word-break:break-word}.pf-v.none{color:#94a3b8}.pf-note{font-size:12px;color:#991b1b;background:#fee2e2;border-radius:8px;padding:6px 8px;margin-bottom:6px}' +
    '.pf-st{font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap}.pf-st.LOCKED{background:#dcfce7;color:#166534}.pf-st.WAITING{background:#fff7ed;color:#9a3412}' +
    '.pf-st.REFUSED{background:#fee2e2;color:#991b1b}.pf-st.EMPTY{background:#e5e7eb;color:#374151}.pf-st.OPEN{background:#e0f2fe;color:#075985}' +
    '.pf-pw{position:relative}.pf-show{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#0b2a5c;margin-top:8px;min-height:36px}.pf-show input{width:22px;height:22px;min-height:0}';
  var W = {LOCKED:'🔒 Accepted', WAITING:'⏳ Waiting for the admin', REFUSED:'✖ Not accepted', EMPTY:'Not filled', OPEN:'🔓 Unlocked – you may change it'};
  var ROLE = {admin:'Admin', accountant:'Accountant', classTeacher:'Class teacher', subjectTeacher:'Subject teacher'};
  var S = {el:null, data:null, opt:{}};
  function ls(k){ try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } }
  function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function auth(j){ if(j && j.code === 'AUTH'){ try{ localStorage.clear(); }catch(e){} try{ sessionStorage.setItem('cvse_flash', JSON.stringify({m:'Session expired. Please login again.', t:Date.now()})); }catch(e){} location.href = 'index.html'; } return j; }
  async function get(action, p){
    var u = URL_ + '?action=' + action + '&token=' + encodeURIComponent(ls('cvse_token'));
    for(var k in (p || {})) u += '&' + k + '=' + encodeURIComponent(p[k]);
    var r = await fetch(u); return auth(await r.json());
  }
  async function post(action, p){
    var r = await fetch(URL_, {method:'POST', body:JSON.stringify(Object.assign({action:action, token:ls('cvse_token')}, p || {}))});
    return auth(await r.json());
  }
  function style(){ if(document.getElementById('pfStyle')) return; var s = document.createElement('style'); s.id = 'pfStyle'; s.textContent = css; document.head.appendChild(s); }
  function q(id){ return S.el.querySelector('#' + id); }
  function say(id, t, k){ var m = q(id); if(m){ m.className = 'msg show ' + k; m.innerText = t; } }
  function isAdmin(){ return S.data && S.data.me && S.data.me.role === 'admin'; }

  async function mount(el, opt){
    style(); S.el = el; S.opt = opt || {};
    el.innerHTML = '<div class="empty-note">⏳ Loading your profile...</div>';
    var j;
    try{ j = await get('staffme'); }catch(e){ el.innerHTML = '<div class="box"><div class="msg show err">❌ Could not connect. Check the internet and open the Profile again.</div></div>'; return; }
    if(!j || !j.success){ el.innerHTML = '<div class="box"><div class="msg show err">❌ ' + esc((j && j.error) || 'Could not open your profile.') + '</div></div>'; return; }
    S.data = j; draw(); photo();
  }
  function fieldHtml(f){
    var st = isAdmin() && f.state !== 'WAITING' ? (f.value ? 'LOCKED' : 'EMPTY') : f.state;
    var h = '<div class="pf-f" data-k="' + f.k + '"><div class="pf-l"><span>' + esc(f.label) + '</span><span class="pf-st ' + st + '">' + (isAdmin() && st === 'LOCKED' ? '✔ Saved' : W[st]) + '</span></div>';
    if(f.note && st !== 'LOCKED') h += '<div class="pf-note">The office wrote: ' + esc(f.note) + '</div>';
    var canType = isAdmin() || f.canType;
    if(!canType){ h += '<div class="pf-v' + (f.value ? '' : ' none') + '">' + esc(f.value || '—') + '</div></div>'; return h; }
    var val = f.state === 'WAITING' ? f.wait : (f.state === 'OPEN' || isAdmin() ? f.value : '');
    var id = 'pf_' + f.k, ph = {FullName:'Full name as in certificates', DOB:'DD-MM-YYYY', Mobile:'10 digits', Email:'name@example.com', Qualification:'B.A., B.Ed', JoiningDate:'DD-MM-YYYY', Address:'House, area, town'}[f.k] || '';
    if(f.state === 'OPEN') h += '<div class="pf-v">Now: ' + esc(f.value) + '</div>';
    if(f.kind === 'area') h += '<textarea id="' + id + '" maxlength="' + (f.max || 200) + '" placeholder="' + esc(ph) + '">' + esc(val) + '</textarea>';
    else h += '<input id="' + id + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + (f.kind === 'date' ? ' data-date inputmode="numeric" maxlength="10"' : '') +
      (f.kind === 'mobile' ? ' inputmode="numeric" maxlength="10"' : '') + (f.kind === 'email' ? ' type="email" autocomplete="email"' : '') + (f.max ? ' maxlength="' + f.max + '"' : '') + '>';
    return h + '</div>';
  }
  function draw(){
    var d = S.data, me = d.me, fields = d.fields.filter(function(f){ return f.k !== 'Photo' && f.k !== 'Signature'; }), ph = d.fields.filter(function(f){ return f.k === 'Photo'; })[0];
    var sg = d.fields.filter(function(f){ return f.k === 'Signature'; })[0], sgOn = sg && me.role !== 'accountant', sgSt = sg ? (isAdmin() ? (sg.value ? 'LOCKED' : 'EMPTY') : sg.state) : '';
    var open = isAdmin() ? fields : fields.filter(function(f){ return f.canType; });
    var phSt = isAdmin() ? (ph.value ? 'LOCKED' : 'EMPTY') : ph.state;
    var h = '<div class="box" style="border-left-color:#1976d2"><div class="pf-head"><div class="pf-ph" id="pfPh">No<br>photo</div><div style="min-width:0">' +
      '<div class="pf-name">' + esc((d.fields[0].value || me.name || me.username)) + '</div><div class="pf-sub">' + esc(ROLE[me.role] || me.role) + (me.classes && me.role === 'classTeacher' ? ' · Class ' + esc(me.classes) : '') +
      '<br>Username: ' + esc(me.username) + '</div>' +
      (isAdmin() ? '' : '<div class="pf-sub" style="margin-top:6px">' + d.done + ' of ' + d.total + ' accepted by the office</div><div class="pf-bar"><i style="width:' + Math.round(100 * d.done / d.total) + '%"></i></div>') +
      '</div></div>' +
      '<div class="pf-l" style="margin-top:10px"><span>Photo</span><span class="pf-st ' + phSt + '">' + (isAdmin() && phSt === 'LOCKED' ? '✔ Saved' : W[phSt]) + '</span></div>' +
      (ph.note && phSt !== 'LOCKED' ? '<div class="pf-note">The office wrote: ' + esc(ph.note) + '</div>' : '') +
      ((isAdmin() || ph.canType) ? '<div class="btnrow"><button class="btn b-blue" type="button" data-nofb onclick="PROFILE.pick(true)">📷 Take photo</button><button class="btn b-navy" type="button" data-nofb onclick="PROFILE.pick(false)">🖼 Gallery</button></div>' : '') +
      '</div>';
    if(sgOn) h += '<div class="box" style="border-left-color:#7c3aed"><div class="title">✍️ My signature</div><div class="meta">Sign on white paper with a dark pen and take a photo. The paper is cleaned to white automatically.' +
      (me.role === 'classTeacher' ? ' It is printed on the report cards of your class.' : ' It is kept for later use.') + (isAdmin() ? ' Saved at once.' : ' The admin checks it first.') + '</div>' +
      '<div id="pfSg" style="margin:8px 0;min-height:56px;border:1.5px dashed #cbd5e1;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;color:#64748b;font-weight:700;font-size:12.5px;padding:6px">No signature yet</div>' +
      '<div class="pf-l"><span>Signature</span><span class="pf-st ' + sgSt + '">' + (isAdmin() && sgSt === 'LOCKED' ? '✔ Saved' : W[sgSt]) + '</span></div>' +
      (sg.note && sgSt !== 'LOCKED' ? '<div class="pf-note">The office wrote: ' + esc(sg.note) + '</div>' : '') +
      ((isAdmin() || sg.canType) ? '<div class="btnrow"><button class="btn b-blue" type="button" data-nofb onclick="PROFILE.sign(true)">📷 Take photo</button><button class="btn b-navy" type="button" data-nofb onclick="PROFILE.sign(false)">🖼 Gallery</button></div>' : '') +
      '<div class="msg" id="pfSgMsg"></div></div>';     // S23 (L4)
    h += '<div class="box"><div class="title">👤 About me</div><div class="meta">' + (isAdmin() ? 'Your own details are saved at once.' :
      (open.length ? 'Fill the empty boxes and tap <b>Send to office</b>. The admin checks each one; once accepted it is locked (ask the admin to change it later).' : 'Every detail is filled. To change an accepted detail, ask the admin.')) + '</div>' +
      fields.map(fieldHtml).join('') +
      (open.length ? '<div class="btnrow"><button class="btn b-green" type="button" id="pfSend" onclick="PROFILE.send()">' + (isAdmin() ? '💾 Save my details' : '📤 Send to office') + '</button></div><div class="msg" id="pfMsg"></div>' : '') + '</div>';
    h += '<div class="box" style="border-left-color:#0b2a5c"><div class="title">🔑 Change password</div><div class="meta">At least ' + d.pwMin + ' characters. If you forget it, the admin can reset it.</div>' +
      '<label for="pfCur">Current password</label><input id="pfCur" type="password" autocomplete="current-password">' +
      '<label for="pfNew">New password</label><input id="pfNew" type="password" autocomplete="new-password">' +
      '<label for="pfNew2">New password again</label><input id="pfNew2" type="password" autocomplete="new-password">' +
      '<label class="pf-show"><input type="checkbox" onchange="PROFILE.showPw(this.checked)"> Show passwords</label>' +
      '<div class="btnrow"><button class="btn b-navy" type="button" onclick="PROFILE.password()">🔑 Change password</button></div><div class="msg" id="pfPwMsg"></div></div>';
    h += '<div class="box" style="border-left-color:#7c3aed"><div class="btnrow" style="margin-top:0"><button class="btn b-purple" type="button" data-nofb onclick="location.href=\'events.html\'">📅 School calendar</button>' +
      '<button class="btn" type="button" data-nofb style="background:#c62828" onclick="PROFILE.logout()">🚪 Logout</button></div></div>';
    S.el.innerHTML = h;
    if(window.UI && UI.enhanceDates) UI.enhanceDates(S.el);
    if(sgOn) signPic();
  }
  async function photo(){
    var ph = S.data.fields.filter(function(f){ return f.k === 'Photo'; })[0], which = ph.wait ? 'wait' : (ph.value ? 'acc' : '');
    if(!which) return;
    try{ var j = await get('staffphotoget', {which:which}); var b = q('pfPh'); if(j && j.photo && b) b.innerHTML = '<img src="' + j.photo + '" alt="Your photo">'; }catch(e){}
  }
  async function signPic(){         // S23 (L4)
    var sg = S.data.fields.filter(function(f){ return f.k === 'Signature'; })[0], which = sg && sg.wait ? 'wait' : (sg && sg.value ? 'acc' : '');
    if(!which) return;
    try{ var j = await get('staffphotoget', {which:which, field:'Signature'}); var b = q('pfSg'); if(j && j.photo && b) b.innerHTML = '<img src="' + j.photo + '" alt="Your signature" style="max-width:100%;max-height:90px">'; }catch(e){}
  }
  async function sign(camera){
    if(!window.PHOTO) return;
    var file = await PHOTO.choose(camera); if(!file) return;
    PHOTO.open({file:file, sign:true, title:'My signature', sub:isAdmin() ? 'Saved at once' : 'The admin will check it', onSave:async function(data){
      var j = isAdmin() ? await post('staffadminphoto', {username:S.data.me.username, data:data, field:'Signature'}) : await post('staffphoto', {data:data, field:'Signature'});
      if(!j || !j.success) return {ok:false, msg:'❌ ' + ((j && j.error) || 'The signature was not saved.')};
      S.data.fields = j.fields; S.data.done = j.done; S.data.waiting = j.waiting; draw(); photo();
      setTimeout(function(){ say('pfSgMsg', j.message || '✅ Saved.', 'ok'); }, 50);
      return {ok:true};
    }});
  }
  async function pick(camera){
    if(!window.PHOTO){ return; }
    var file = await PHOTO.choose(camera); if(!file) return;
    PHOTO.open({file:file, title:'Your photo', sub:isAdmin() ? 'Saved at once' : 'The admin will check it', onSave:async function(data){
      var j = isAdmin() ? await post('staffadminphoto', {username:S.data.me.username, data:data}) : await post('staffphoto', {data:data});
      if(!j || !j.success) return {ok:false, msg:'❌ ' + ((j && j.error) || 'The photo was not saved.')};
      S.data.fields = j.fields; S.data.done = j.done; S.data.waiting = j.waiting; draw(); photo();
      setTimeout(function(){ say('pfMsg', j.message || '✅ Saved.', 'ok'); }, 50);
      return {ok:true};
    }});
  }
  async function send(){
    var d = S.data, data = {}, any = false, bad = [];
    d.fields.forEach(function(f){
      if(f.k === 'Photo' || f.k === 'Signature') return;
      var el = q('pf_' + f.k); if(!el) return;
      var v = el.value.trim(), was = f.state === 'WAITING' ? f.wait : (f.state === 'OPEN' || isAdmin() ? f.value : '');
      if(v === was) return;
      if(f.kind === 'date' && v && window.UI && !UI.checkDate(el)) bad.push(f.label);
      data[f.k] = v; any = true;
    });
    if(bad.length){ say('pfMsg', '❌ Please correct: ' + bad.join(', ') + ' (DD-MM-YYYY). Nothing was sent.', 'err'); return; }
    if(!any){ say('pfMsg', isAdmin() ? 'Nothing changed.' : 'Type in an empty box first, then tap Send to office.', 'warn'); return; }
    var j;
    try{ j = isAdmin() ? await post('staffadminsave', {username:d.me.username, data:JSON.stringify(data)}) : await post('staffsave', {data:JSON.stringify(data)}); }
    catch(e){ say('pfMsg', '❌ Could not connect. Check the internet and tap again.', 'err'); return; }
    if(!j || !j.success){ say('pfMsg', '❌ ' + ((j && j.error) || 'Not saved.'), 'err'); return; }
    S.data.fields = j.fields; S.data.done = j.done; S.data.waiting = j.waiting;
    setTimeout(function(){ draw(); photo(); say('pfMsg', j.message || '✅ Saved.', 'ok'); var m = q('pfMsg'); if(m && m.scrollIntoView) m.scrollIntoView({block:'center'}); }, 900);
  }
  async function password(){
    var a = q('pfCur').value, b = q('pfNew').value, c = q('pfNew2').value;
    if(!a){ say('pfPwMsg', 'Type your current password.', 'err'); return; }
    if(b.length < S.data.pwMin){ say('pfPwMsg', 'The new password must be at least ' + S.data.pwMin + ' characters.', 'err'); return; }
    if(b !== c){ say('pfPwMsg', 'The two new passwords are not the same.', 'err'); return; }
    var j;
    try{ j = await post('staffpassword', {current:a, newPassword:b, confirm:c}); }catch(e){ say('pfPwMsg', '❌ Could not connect. Nothing was changed.', 'err'); return; }
    if(!j || !j.success){ say('pfPwMsg', '❌ ' + ((j && j.error) || 'Not changed.'), 'err'); return; }
    q('pfCur').value = q('pfNew').value = q('pfNew2').value = '';
    say('pfPwMsg', j.message, 'ok');
  }
  function showPw(on){ ['pfCur', 'pfNew', 'pfNew2'].forEach(function(id){ q(id).type = on ? 'text' : 'password'; }); }
  function logout(){ try{ localStorage.clear(); }catch(e){} location.href = 'index.html'; }
  return {mount:mount, pick:pick, sign:sign, send:send, password:password, showPw:showPw, logout:logout};
})();
