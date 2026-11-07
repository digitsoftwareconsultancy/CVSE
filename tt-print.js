/********** tt-print.js - ONE timetable print layout for every page **********
 * Used by: timetable-builder.html, class-dashboard.html, subject-dashboard.html
 * Needs on the page:  const WEB_URL = "..."   (same WEB_URL as every file)
 * Reads:              localStorage cvse_token
 * School name, address, logo and periods always come from the Settings tab (getfullsettings).
 * Three prints (same layout as the Timetable page):
 *   TTP_printClass(className)          Day x Period grid of one class
 *   TTP_printTeacher(username, name)   Day x Period grid of one teacher (subject row + class row) + weekly counts
 *   TTP_printDay(day)                  All teachers for one day (subject row + class row)
 */
var TTP_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];

function TTP_esc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function TTP_get(action, params){
  var url = WEB_URL + '?action=' + action;
  var tk = localStorage.getItem('cvse_token');
  if(tk) url += '&token=' + encodeURIComponent(tk);
  for(var k in (params || {})) url += '&' + k + '=' + encodeURIComponent(params[k]);
  var r = await fetch(url);
  var t = await r.text();
  var j;
  try{ j = JSON.parse(t); }catch(e){ throw new Error('Server did not answer. Check your internet and try again.'); }
  if(typeof j === 'string'){ try{ j = JSON.parse(j); }catch(e){} }
  if(j && j.code === 'AUTH'){ localStorage.clear(); window.location.href = 'index.html'; throw new Error('Session expired. Please login again.'); }
  if(j && j.success === false) throw new Error(j.error || 'Could not load the timetable.');
  return j || {};
}

function TTP_period(p){
  var no = p.no || 1;
  var label = p.label || ('P-' + no);
  var type = p.type || 'Teaching';
  var low = String(type).toLowerCase();
  var teaching = !(low === 'break' || low === 'leisure' || String(label).toUpperCase() === 'BREAK' || String(label).toUpperCase() === 'LEISURE');
  return {no:String(no), label:String(label), display:String(label), time:String(p.time || ''), type:type, isTeaching:teaching};
}

// school details + periods from Settings (nothing typed in code)
async function TTP_school(){
  var res = await TTP_get('getfullsettings');
  var m = res.settings || res || {};
  var total = parseInt(m['Total_Periods'] || 8) || 8;
  var list = [];
  for(var i = 1; i <= total; i++){
    list.push(TTP_period({no:i, time:m['Period_' + i] || '', type:m['Period_' + i + '_Type'] || 'Teaching', label:m['Period_' + i + '_Label'] || ('P-' + i)}));
  }
  return {name:m['School_Name'] || '', address:m['School_Address'] || '', logo:m['Logo Path'] || '', periods:list};
}

function TTP_header(s){
  var logo = s.logo ? '<img src="' + TTP_esc(s.logo) + '" style="height:45px;max-width:80px;object-fit:contain" onerror="this.style.display=\'none\'">' : '';
  return '<div class="schoolBar" style="display:flex;align-items:center;justify-content:center;gap:12px;text-align:center">' + logo +
    '<div><div style="font-weight:900;font-size:16px;color:#0b2a5c">' + TTP_esc(String(s.name).toUpperCase()) + '</div>' +
    '<div style="font-size:11px;white-space:pre-line;color:#333">' + TTP_esc(s.address) + '</div></div></div>';
}

// black borders, landscape, page numbers (Page x of y) on every printed page
function TTP_css(small){
  var fs = small ? '10px' : '11px', pad = small ? '3px' : '5px';
  return '<style>@page{size:A4 landscape;margin:8mm 8mm 14mm 8mm;@bottom-center{content:"Page " counter(page) " of " counter(pages);font-size:10px}}' +
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'body{font-family:Arial;margin:0;color:#111}' +
    'table{border-collapse:collapse;width:100%}' +
    'th,td{border:1px solid #000;padding:' + pad + ';font-size:' + fs + ';text-align:center;vertical-align:middle}' +
    'th{background:#0b2a5c;color:#fff;font-weight:700}th small{color:#cfe0ff;font-weight:400}' +
    'tbody tr:nth-child(even) td{background:#f6f8fc}' +
    'td.dayCell{background:#e8eef9 !important;color:#0b2a5c;font-weight:800}' +
    '.breakCell{background:#fff3cd !important;font-weight:800;color:#7a5200}' +
    '.eleCell{background:#e8f2ff !important}' +
    'td b.sb{display:block;font-size:' + fs + ';color:#0b2a5c}td small.tc{display:block;color:#555;font-size:9px}' +
    '.schoolBar{border-bottom:3px double #0b2a5c;padding-bottom:6px;margin-bottom:6px}' +
    '.title{text-align:center;font-size:18px;font-weight:900;margin:6px 0;color:#0b2a5c;letter-spacing:.5px}' +
    '.sub{text-align:center;font-size:13px;margin:4px 0 8px;font-weight:700}' +
    '.dayBar{text-align:center;font-weight:800;background:#e8eef9;color:#0b2a5c;padding:5px;border:1px solid #000;margin-bottom:0}' +
    '.sumRow{display:flex;flex-wrap:wrap;margin-top:10px;border:1px solid #000;align-items:center;font-size:12px}' +
    '.sumRow .chip{padding:6px 12px;border-right:1px solid #000}.sumRow .chip span{border:1px solid #000;padding:2px 10px;margin-left:6px;font-weight:900;background:#fff}' +
    '.sumRow .tot{padding:6px 12px;font-weight:700;background:#e8eef9;color:#0b2a5c;margin-left:auto}.sumRow .tot span{border:1px solid #000;padding:2px 12px;margin-left:6px;background:#fff}' +
    'tr{page-break-inside:avoid}thead{display:table-header-group}</style>';
}

function TTP_head(periods, first){
  return '<tr>' + first + periods.map(function(p){ return '<th>' + TTP_esc(p.display) + '<br><small>' + TTP_esc(p.time) + '</small></th>'; }).join('') + '</tr>';
}

// opens the print window FIRST (phones block a window opened after a wait), then fills it
function TTP_open(){
  var w = window.open('', '_blank');
  if(!w){ alert('Please allow pop-ups for this site to print.'); return null; }
  w.document.write('<div style="font-family:Arial;padding:30px;text-align:center">Loading timetable...</div>');
  return w;
}
function TTP_fail(w, e){
  var msg = (e && e.message) ? e.message : 'Could not load the timetable.';
  if(w){ try{ w.close(); }catch(x){} }
  alert(msg);
}
function TTP_show(w, html){
  w.document.open();
  w.document.write(html + '<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script>');
  w.document.close();
}

// ---------- 1. Class print ----------
async function TTP_printClass(className){
  className = String(className || '').trim();
  if(!className){ alert('Select a class first.'); return; }
  var w = TTP_open(); if(!w) return;
  try{
    var s = await TTP_school();
    var res = await TTP_get('gettimetable', {className:className});
    var rows = (res.timetable || res.rows || []).map(function(r){
      return {Day:String(r.day || r.Day || '').toUpperCase(), No:String(r.periodNo || r.Period_No || ''), Subject:r.subject || r.Subject || '', Teacher:r.teacher || r.TeacherName || ''};
    });
    var grid = {};
    rows.forEach(function(r){ if(!grid[r.Day]) grid[r.Day] = {}; if(!grid[r.Day][r.No]) grid[r.Day][r.No] = []; grid[r.Day][r.No].push(r); });
    var html = TTP_css(false) + TTP_header(s) + '<div class="title">Class Time Table - ' + TTP_esc(className) + '</div>' +
      '<table><thead>' + TTP_head(s.periods, '<th>Day</th>') + '</thead><tbody>';
    TTP_DAYS.forEach(function(d){
      html += '<tr><td class="dayCell">' + d.slice(0, 3) + '</td>';
      s.periods.forEach(function(p){
        if(!p.isTeaching){ html += '<td class="breakCell">' + TTP_esc(p.label) + '</td>'; return; }
        var arr = (grid[d] || {})[p.no] || [];
        if(arr.length > 1) html += '<td class="eleCell">' + arr.map(function(c){ return '<b class="sb">' + TTP_esc(c.Subject) + '</b><small class="tc">' + TTP_esc(c.Teacher) + '</small>'; }).join('<hr style="margin:2px;border:0;border-top:1px solid #9bb">') + '</td>';
        else if(arr.length === 1) html += '<td><b class="sb">' + TTP_esc(arr[0].Subject) + '</b><small class="tc">' + TTP_esc(arr[0].Teacher) + '</small></td>';
        else html += '<td></td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    if(!rows.length) html += '<p style="text-align:center;margin-top:14px">No data found. The timetable for this class is empty.</p>';
    TTP_show(w, html);
  }catch(e){ TTP_fail(w, e); }
}

// ---------- 2. Teacher print ----------
async function TTP_printTeacher(username, teacherName){
  username = String(username || '').trim();
  if(!username){ alert('Teacher not found.'); return; }
  var w = TTP_open(); if(!w) return;
  try{
    var s = await TTP_school();
    var res = await TTP_get('gettimetableforteacher', {username:username});
    var rows = (res.timetable || res.rows || []).map(function(r){
      return {Day:String(r.day || r.Day || '').toUpperCase(), No:String(r.periodNo || r.Period_No || ''), Grade:r.className || r.Grade || '', Subject:r.subject || r.Subject || ''};
    });
    var grid = {}, counts = {};
    rows.forEach(function(r){
      if(!grid[r.Day]) grid[r.Day] = {};
      grid[r.Day][r.No] = r;
      var sub = String(r.Subject || '').trim().toUpperCase();
      if(sub) counts[sub] = (counts[sub] || 0) + 1;
    });
    var html = TTP_css(false) + TTP_header(s) + '<div class="title">Time Table</div>' +
      '<div class="sub">Teacher\'s Name : ' + TTP_esc(teacherName || username) + '</div>' +
      '<table><thead>' + TTP_head(s.periods, '<th>Day</th>') + '</thead><tbody>';
    TTP_DAYS.forEach(function(d){
      html += '<tr><td rowspan="2" class="dayCell">' + d.charAt(0) + d.slice(1).toLowerCase() + '</td>';
      s.periods.forEach(function(p){
        if(!p.isTeaching){ html += '<td class="breakCell">' + TTP_esc(p.label) + '</td>'; return; }
        var c = (grid[d] || {})[p.no];
        html += '<td>' + (c ? '<b class="sb">' + TTP_esc(c.Subject) + '</b>' : '') + '</td>';
      });
      html += '</tr><tr>';
      s.periods.forEach(function(p){
        if(!p.isTeaching){ html += '<td class="breakCell"><small>' + TTP_esc(p.type) + '</small></td>'; return; }
        var c = (grid[d] || {})[p.no];
        html += '<td>' + (c ? TTP_esc(c.Grade) : '') + '</td>';
      });
      html += '</tr>';
    });
    var chips = Object.keys(counts).map(function(sub){
      return '<div class="chip">' + TTP_esc(sub) + ' <span>' + counts[sub] + '</span></div>';
    }).join('');
    html += '</tbody></table><div class="sumRow">' + chips + '<div class="tot">Total no. of Classes per Week <span>' + rows.length + '</span></div></div>';
    if(!rows.length) html += '<p style="text-align:center;margin-top:14px">No data found. No periods are allotted to this teacher yet.</p>';
    TTP_show(w, html);
  }catch(e){ TTP_fail(w, e); }
}

// ---------- 3. Day print (all teachers) ----------
async function TTP_printDay(day){
  day = String(day || '').trim().toUpperCase();
  if(TTP_DAYS.indexOf(day) < 0){ alert('Choose a day from Monday to Saturday.'); return; }
  var w = TTP_open(); if(!w) return;
  try{
    var s = await TTP_school();
    var res = await TTP_get('gettimetable', {day:day});
    var rows = (res.timetable || res.rows || []).map(function(r){
      return {TeacherName:r.teacher || r.TeacherName || '', TeacherUsername:r.teacherUsername || '', No:String(r.periodNo || r.Period_No || ''), Grade:r.className || r.Grade || '', Subject:r.subject || r.Subject || ''};
    });
    var by = {};
    rows.forEach(function(r){
      var k = r.TeacherUsername || r.TeacherName;
      if(!k) return;
      if(!by[k]) by[k] = {name:r.TeacherName, periods:{}};
      by[k].periods[r.No] = r;
    });
    var list = Object.keys(by).map(function(k){ return by[k]; });
    var html = TTP_css(true) + TTP_header(s) + '<div class="title">Time Table</div>' +
      '<div class="dayBar">' + TTP_esc(day) + '</div>' +
      '<table><thead>' + TTP_head(s.periods, '<th style="width:30px">Sl.No.</th><th style="width:100px">Teacher</th>') + '</thead><tbody>';
    list.forEach(function(t, i){
      html += '<tr><td rowspan="2" class="dayCell">' + (i + 1) + '</td><td rowspan="2" style="font-weight:700">' + TTP_esc(t.name) + '</td>';
      s.periods.forEach(function(p){
        if(!p.isTeaching){ html += '<td class="breakCell">' + TTP_esc(p.label) + '</td>'; return; }
        var c = t.periods[p.no];
        html += '<td>' + (c ? TTP_esc(c.Grade) : '') + '</td>';
      });
      html += '</tr><tr>';
      s.periods.forEach(function(p){
        if(!p.isTeaching){ html += '<td class="breakCell"><small>' + TTP_esc(p.type) + '</small></td>'; return; }
        var c = t.periods[p.no];
        html += '<td>' + (c ? '<b class="sb">' + TTP_esc(c.Subject) + '</b>' : '') + '</td>';
      });
      html += '</tr>';
    });
    if(!list.length) html += '<tr><td colspan="' + (s.periods.length + 2) + '">No data found for ' + TTP_esc(day) + '. Save the timetable first.</td></tr>';
    html += '</tbody></table>';
    TTP_show(w, html);
  }catch(e){ TTP_fail(w, e); }
}
