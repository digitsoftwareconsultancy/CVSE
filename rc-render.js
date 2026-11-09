/* report card drawing - shared by report-card.html (staff) and student.html (student / parent)
   cardHtml(model, student) -> the A4 card as HTML.   rcFit(container) -> shrinks every .cw card to the screen width. */
function rcEsc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* ================= drawing a card ================= */
function grade(scale, p){ if(p === null || p === undefined) return ''; p = Math.round(p); for(let g of scale){ if(p >= g.from && p <= g.to) return g.grade; } return ''; }
function dash(v){ return (v === null || v === undefined || v === '') ? '-' : rcEsc(v); }
function ordinal(n){ n = Number(n); if(!n) return '-'; let s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function cell(c){ if(!c) return '-'; if(c.absent) return 'AB'; return c.total === null ? '-' : c.total; }

function tableFor(d, s){
  let L = d.cfg.layout, subs = s.subjects.filter(x => !x.notTaken), ex = d.report.exams, rows = '', head = '', foot = '', title = '';
  let upper = d.report.name.toUpperCase();
  if(L === 'C'){
    title = 'SCHOLASTIC ACHIEVEMENT - ' + upper;
    let w = Math.floor(44 / Math.max(1, ex.length));
    head = '<colgroup><col style="width:28%">' + ex.map(() => '<col style="width:' + w + '%">').join('') + '<col style="width:14%"><col style="width:14%"></colgroup><tr><th rowspan="2">Subject</th>' + ex.map(e => '<th>' + rcEsc(e.short || e.name) + '</th>').join('') + '<th rowspan="2">Final %</th><th rowspan="2">Grade</th></tr><tr>' +
      ex.map(e => '<th>' + (d.report.rule === 'WEIGHTED' && e.weight ? e.weight + '%' : '') + '</th>').join('') + '</tr>';
    subs.forEach(x => {
      rows += '<tr><td class="left">' + rcEsc(x.name) + '</td>' + ex.map((e, i) => { let c = (x.exams || [])[i]; return '<td>' + (c ? rcEsc(cell(c)) + '<small style="font-size:7px;color:#64748b">/' + c.max + '</small>' : '-') + '</td>'; }).join('') + '<td>' + dash(x.pct) + '</td><td>' + dash(x.grade) + '</td></tr>';
    });
    foot = '<tr class="tot"><td class="left" colspan="' + (ex.length + 1) + '">OVERALL PERCENTAGE</td><td>' + dash(s.pct) + '</td><td>' + dash(s.grade) + '</td></tr>';
  } else if(L === 'B'){
    title = 'SCHOLASTIC ACHIEVEMENT - ' + upper;
    head = '<colgroup><col style="width:23%"><col style="width:9%"><col style="width:9%"><col style="width:8%"><col style="width:8%"><col style="width:9%"><col style="width:12%"><col style="width:11%"><col style="width:11%"></colgroup><tr><th rowspan="2">Subject</th><th colspan="2">Written</th><th colspan="2">I/A</th><th rowspan="2">Max</th><th rowspan="2">Total</th><th rowspan="2">%</th><th rowspan="2">Grade</th></tr><tr><th>Max</th><th>Got</th><th>Max</th><th>Got</th></tr>';
    subs.forEach(x => {
      let c = (x.exams || []).filter(z => z)[0], ab = c && c.absent;
      rows += '<tr><td class="left">' + rcEsc(x.name) + '</td>' + (c ? '<td>' + c.theoryMax + '</td><td>' + (ab ? 'AB' : dash(c.marks)) + '</td><td>' + (c.iaMax ? c.iaMax : '-') + '</td><td>' + (c.iaMax ? (ab ? 'AB' : dash(c.ia)) : '-') + '</td><td>' + c.max + '</td><td>' + (ab ? 'AB' : dash(c.total)) + '</td>' : '<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>') + '<td>' + dash(x.pct) + '</td><td>' + dash(x.grade) + '</td></tr>';
    });
    foot = '<tr class="tot"><td class="left" colspan="5">TOTAL</td><td>' + dash(s.totals.max) + '</td><td>' + dash(s.totals.total) + '</td><td>' + dash(s.pct) + '</td><td>' + dash(s.grade) + '</td></tr>';
  } else {
    title = 'SCHOLASTIC ACHIEVEMENT - ' + upper;
    head = '<colgroup><col style="width:34%"><col style="width:16%"><col style="width:18%"><col style="width:16%"><col style="width:16%"></colgroup><tr><th>Subject</th><th>Max Marks</th><th>Marks Obtained</th><th>%</th><th>Grade</th></tr>';
    subs.forEach(x => {
      let c = (x.exams || []).filter(z => z)[0];
      rows += '<tr><td class="left">' + rcEsc(x.name) + '</td><td>' + (c ? c.max : '-') + '</td><td>' + (c ? rcEsc(cell(c)) : '-') + '</td><td>' + dash(x.pct) + '</td><td>' + dash(x.grade) + '</td></tr>';
    });
    foot = '<tr class="tot"><td class="left">TOTAL</td><td>' + dash(s.totals.max) + '</td><td>' + dash(s.totals.total) + '</td><td>' + dash(s.pct) + '</td><td>' + dash(s.grade) + '</td></tr>';
  }
  return '<div class="tw sch"><span class="sec">' + rcEsc(title) + '</span><table>' + head + rows + foot + '</table></div>';
}
function perExamTable(title, rows, ex){
  if(!rows.length) return '';
  return '<div class="tw"><span class="sec">' + title + '</span><table><tr><th>' + 'Area' + '</th>' + ex.map(e => '<th>' + rcEsc(e.short || e.name) + '</th>').join('') + '</tr>' +
    rows.map(r => '<tr><td class="left">' + rcEsc(r.name) + '</td>' + r.perExam.map(c => '<td>' + dash(c.value) + '</td>').join('') + '</tr>').join('') + '</table></div>';
}
function decoBox(dc){ return '<div class="deco"><img src="' + rcEsc(dc.image) + '" alt="">' + (dc.caption ? '<span>' + rcEsc(dc.caption) + '</span>' : '') + '</div>'; }

function cardHtml(d, s){
  let P = d.cfg.parts, sc = d.school, ex = d.report.exams, h = '<div class="page">';
  if(d.draft) h += '<div class="wm">DRAFT</div>';
  h += '<div class="hdr">' + (sc.header ? '<img src="' + rcEsc(sc.header) + '" alt="">' : '<div class="logo">' + (sc.logo ? '<img src="' + rcEsc(sc.logo) + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="">' : 'LOGO') + '</div><div class="ph">' + rcEsc(sc.name) + '<small>' + rcEsc(sc.address) + '</small></div>') + '</div>';
  h += '<div class="ctitle">' + rcEsc((d.cfg.title || d.report.name).toUpperCase()) + '<br>ACADEMIC SESSION : ' + rcEsc(sc.session) + '</div><div class="inner">';
  if(P.info){
    h += '<div class="info"><div class="l"><div class="rows">' + s.details.map(r => '<div class="il"><b>' + rcEsc(r.label) + '</b>: <span>' + rcEsc(r.value) + '</span></div>').join('') + '</div>' +
      (P.photo ? '<div class="photo">' + (s.photo ? '<img src="' + rcEsc(s.photo) + '" alt="" onerror="this.parentNode.innerHTML=\'STUDENT<br>PHOTO\'">' : 'STUDENT<br>PHOTO') + '</div>' : '') + '</div></div>';
  }
  if(P.scholastic) h += tableFor(d, s);
  let left = '', right = '', f = s.final;
  if(P.coscholastic) left += perExamTable('CO-SCHOLASTIC ACHIEVEMENT', s.co.map(c => ({name:c.name, perExam:c.perExam})), ex);
  if(P.gradeScale && d.gradeScale.length) left += '<div class="tw"><span class="sec">GRADE SCALE - Based on Percentage</span><table><tr><th>Percentage</th><th>Grade</th></tr>' + d.gradeScale.map(g => '<tr><td class="left">' + g.from + ' - ' + g.to + '</td><td>' + rcEsc(g.grade) + '</td></tr>').join('') + '</table></div>';
  if(P.attendance){
    let w = Number(f.workingDays), p = Number(f.presentDays), ok = f.workingDays !== '' && f.presentDays !== '' && !isNaN(w) && !isNaN(p);
    left += '<div class="tw"><span class="sec">ATTENDANCE</span><table>' + [['Total Working Days', ok ? w : '-'], ['Days Present', ok ? p : '-'], ['Days Absent', ok ? Math.round((w - p) * 2) / 2 : '-'], ['Attendance %', ok && w > 0 ? (Math.round(p / w * 1000) / 10) : '-']].map(r => '<tr><td class="left">' + r[0] + '</td><td style="width:35%">' + r[1] + '</td></tr>').join('') + '</table></div>';
  }
  if(P.psd) left += perExamTable('PERSONAL &amp; SOCIAL DEVELOPMENT', s.psd, ex);
  d.decos.filter(x => x.side === 'LEFT').forEach(x => left += decoBox(x));
  if(P.pctbox || d.cfg.showRank){
    right += '<div class="pos">' + (P.pctbox ? '<div>PERCENTAGE<b>' + (s.pct === null ? '-' : s.pct + '%') + '</b></div><div>GRADE<b>' + dash(s.grade) + '</b></div>' : '') + (d.cfg.showRank ? '<div>POSITION<b>' + ordinal(s.rank) + '</b></div>' : '') + '</div>';
  }
  if(P.result) right += '<div class="result"><small>RESULT</small><b>' + (f.result ? rcEsc(f.result) : '-') + '</b></div>';
  if(P.remark) right += '<div class="remark"><b>Class Teacher\'s Remarks</b><br>' + rcEsc(f.remark) + '</div>';
  d.decos.filter(x => x.side === 'RIGHT').forEach(x => right += decoBox(x));
  if(P.signs){
    let ct = d.classTeacher || {};
    right += '<div class="signs"><div class="sign">' + (ct.sign ? '<img src="' + rcEsc(ct.sign) + '" alt="">' : '') + rcEsc(ct.name || 'Class Teacher') + '<br>Class Teacher</div><div class="sign">Parent / Guardian</div><div class="sign">' + (sc.principalSign ? '<img src="' + rcEsc(sc.principalSign) + '" alt="">' : '') + rcEsc(sc.principalName) + '</div></div>';
  }
  h += '<div class="bottom"><div class="bl">' + left + '</div><div class="br">' + right + '</div></div></div>';
  if(sc.footer) h += '<div class="foot">' + rcEsc(sc.footer) + '</div>';
  return h + '</div>';
}


/* auto-fit: shrink each A4 page to the width of its container, never enlarge */
function rcFit(container, pad){
  var avail = container.clientWidth - (pad === undefined ? 24 : pad);
  container.querySelectorAll('.cw').forEach(function(cw){
    var sc = cw.firstChild, page = sc.firstChild; if(!page) return;
    var w = page.offsetWidth, h = page.offsetHeight, s = Math.min(1, avail / w);
    sc.style.transform = 'scale(' + s + ')'; sc.style.width = w + 'px';
    cw.style.width = (w * s) + 'px'; cw.style.height = (h * s) + 'px';
  });
}
function rcCardsHtml(model, list){ return list.map(function(s){ return '<div class="cw"><div class="scaler">' + cardHtml(model, s) + '</div></div>'; }).join(''); }
