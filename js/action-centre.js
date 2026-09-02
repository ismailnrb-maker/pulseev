/* ============================================================
   AI ACTION CENTRE
   Transparent operational rules, offline workflow parity and UI.
   Generative AI is used only for explanations and message drafts.
   ============================================================ */

const ActionCentreEngine = (() => {
  const priorityOrder = {critical: 0, high: 1, medium: 2};
  const regionByState = {MH:'West',GJ:'West',GA:'West',DL:'North',UP:'North',RJ:'North',HR:'North',PB:'North',KA:'South',TS:'South',TN:'South',KL:'South',AP:'South',WB:'East',OD:'East',BR:'East',AS:'East'};
  const stateKey = 'ev_action_cases_v1';
  const auditKey = 'ev_action_audit_v1';
  const campaignKey = 'ev_service_campaigns_v1';

  const dateOnly = value => value ? new Date(`${String(value).slice(0,10)}T00:00:00Z`) : null;
  const daysBetween = (later, earlier) => Math.floor((later - earlier) / 86400000);
  const regionFor = location => regionByState[String(location || '').split(',').pop().trim().toUpperCase()] || 'Unknown';
  const priorityFor = score => score >= 85 ? 'critical' : score >= 65 ? 'high' : 'medium';
  const overdueServices = v => (v.services || []).filter(s => !s.completedKm && Number(v.currentKm || 0) > Number(s.dueKm || 0));
  const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const simpleHash = value => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  };
  const fingerprint = c => simpleHash(JSON.stringify([c.caseType,[...c.vehicleIds].sort(),c.riskScore,c.evidence]));
  const addBusinessTime = (start, priority) => {
    const kolkataOffsetMinutes=330;
    let cursor=new Date(new Date(start).getTime()+kolkataOffsetMinutes*60000);
    const nextOpen=value=>{value.setUTCSeconds(0,0);while([0,6].includes(value.getUTCDay()))value.setUTCDate(value.getUTCDate()+1);if(value.getUTCHours()<9)value.setUTCHours(9,0,0,0);else if(value.getUTCHours()>=18){value.setUTCDate(value.getUTCDate()+1);value.setUTCHours(9,0,0,0);while([0,6].includes(value.getUTCDay()))value.setUTCDate(value.getUTCDate()+1);}return value;};
    cursor=nextOpen(cursor);
    let remaining={critical:4,high:9,medium:27}[priority];
    while(remaining){const close=new Date(cursor);close.setUTCHours(18,0,0,0);const available=Math.max(0,(close-cursor)/3600000);if(remaining<=available){cursor=new Date(cursor.getTime()+remaining*3600000);remaining=0;}else{remaining-=available;cursor.setUTCDate(cursor.getUTCDate()+1);cursor.setUTCHours(9,0,0,0);cursor=nextOpen(cursor);}}
    return new Date(cursor.getTime()-kolkataOffsetMinutes*60000);
  };
  const fallbackExplanation = c => `${c.reason} Evidence: ${c.evidence.join('; ')}.`;

  function latestContact(v) {
    const dates = (v.contactHistory || []).map(x => dateOnly(x.date)).filter(Boolean);
    return dates.length ? new Date(Math.max(...dates)) : null;
  }

  function forecast(v, today) {
    const points = (v.kmLog || []).map(x => ({date:dateOnly(`${x.month}-01`),km:Number(x.km || 0)})).filter(x => x.date).sort((a,b) => a.date-b.date);
    let rate = 0;
    if (points.length >= 2 && points.at(-1).km > points[0].km) rate = (points.at(-1).km - points[0].km) / Math.max(1, daysBetween(points.at(-1).date, points[0].date));
    else if (dateOnly(v.deliveryDate)) rate = Number(v.currentKm || 0) / Math.max(1, daysBetween(today, dateOnly(v.deliveryDate)));
    const next = (v.services || []).filter(s => !s.completedKm && Number(s.dueKm) > Number(v.currentKm || 0)).sort((a,b) => a.dueKm-b.dueKm)[0];
    if (!next || rate <= 0) return null;
    const days = Math.ceil((Number(next.dueKm) - Number(v.currentKm || 0)) / rate);
    return days >= 0 && days <= 30 ? {nextDueKm:Number(next.dueKm),days,dailyRate:Math.round(rate*10)/10} : null;
  }

  function buildCandidates(vehicles, now = new Date()) {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const candidates = [];
    vehicles.forEach(v => {
      const overdue = overdueServices(v);
      const battery = v.batteryReplacement || {};
      const warranty = dateOnly(v.warrantyExpiryDate);
      const warrantyDays = warranty ? daysBetween(warranty, today) : null;
      const contact = latestContact(v);
      const contactGap = contact ? daysBetween(today, contact) : 999;
      const reported = dateOnly(battery.reportedAt || v.issueReportedDate);
      const recallDays = reported ? daysBetween(today, reported) : 0;
      if (battery.affected && battery.status === 'pending' && warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 45 && contactGap >= 7) {
        const score = Math.min(100, 35 + 20 + 15 + (overdue.length ? 15 : 0) + (recallDays >= 14 ? 7 : 0));
        const evidence = ['Battery recall remains pending',`Warranty expires in ${warrantyDays} days`,`Last customer-contact attempt was ${contactGap} days ago`,`Recall has been open for ${recallDays} days`];
        if (overdue.length) evidence.push(`${overdue.length} service milestone is also overdue`);
        candidates.push({caseKey:`battery_recall:${v.id}`,caseType:'battery_recall',riskScore:score,category:'Battery & Warranty',vehicleIds:[v.id],evidence,reason:'A pending battery recall overlaps with an approaching warranty deadline and a customer-contact gap.',recommendation:'Assign a senior technician, reserve replacement stock and contact the customer.'});
      }
      const regDate = dateOnly((v.registrationDates || {}).documents_pending);
      const regDays = regDate ? daysBetween(today, regDate) : 0;
      if (v.registrationStatus === 'documents_pending' && regDays > 30) {
        candidates.push({caseKey:`registration_delay:${v.id}`,caseType:'registration_delay',riskScore:70+Math.min(14,Math.floor((regDays-30)/7)*3),category:'Registration',vehicleIds:[v.id],evidence:[`Documents-pending stage has remained open for ${regDays} days`,'RTO registration is not complete'],reason:'The registration workflow has exceeded the 30-day documents-pending threshold.',recommendation:'Escalate to the dealer or RTO owner and confirm the missing document plan.'});
      }
      if (overdue.length >= 2) {
        const delay = Math.max(...overdue.map(s => Number(v.currentKm)-Number(s.dueKm)));
        const score = Math.min(84,72+Math.min(12,(overdue.length-2)*6)+Math.min(10,Math.floor(delay/1500)));
        candidates.push({caseKey:`multiple_services:${v.id}`,caseType:'multiple_services',riskScore:score,category:'Service',vehicleIds:[v.id],evidence:[`${overdue.length} service milestones are overdue`,`Odometer is ${Number(v.currentKm).toLocaleString()} km`,`Furthest threshold exceeded by ${delay.toLocaleString()} km`],reason:'The vehicle has crossed multiple service thresholds without recorded completion.',recommendation:'Schedule a priority inspection and reconcile the missing service history.'});
      }
      const projection = forecast(v,today);
      if (projection) {
        candidates.push({caseKey:`service_forecast:${v.id}`,caseType:'service_forecast',riskScore:60-Math.min(15,Math.floor(projection.days/2)),category:'Service Forecast',vehicleIds:[v.id],evidence:[`Next milestone: ${projection.nextDueKm.toLocaleString()} km`,`Projected in ${projection.days} days`,`Observed use: ${projection.dailyRate} km/day`],reason:'Recent odometer usage indicates the next service milestone will likely be reached this month.',recommendation:'Send a proactive service reminder and reserve an appointment window.'});
      }
    });
    const groups = {};
    vehicles.filter(v => v.issueCode).forEach(v => { const key=`${regionFor(v.customerLocation)}:${v.issueCode}`; (groups[key] ||= []).push(v); });
    Object.entries(groups).forEach(([key,group]) => {
      if (group.length < 3) return;
      const [region,...issueParts]=key.split(':'); const issueCode=issueParts.join(':');
      candidates.push({caseKey:`regional_pattern:${key}`,caseType:'regional_pattern',riskScore:Math.min(98,88+(group.length-3)*2),category:'Pattern Detection',region,issueCode,vehicleIds:group.map(v=>v.id),evidence:[`${group.length} vehicles share issue ${issueCode}`,`All cases cluster in the ${region} region`,'The pattern exceeds the three-vehicle campaign threshold'],reason:'The same operational issue is recurring across several vehicles in one region.',recommendation:'Create a regional service campaign and assign a campaign owner.'});
    });
    return candidates.map(c => ({...c,priority:priorityFor(c.riskScore),fingerprint:fingerprint(c)}));
  }

  function sync(vehicles) {
    const now = new Date();
    const stored = load(stateKey,{});
    const active = new Set();
    const candidates = buildCandidates(vehicles,now);
    candidates.forEach(c => {
      active.add(c.caseKey);
      const old=stored[c.caseKey];
      if (!old) stored[c.caseKey]={id:`offline-${simpleHash(c.caseKey)}`,status:'open',assignedOwner:'Unassigned',detectedAt:now.toISOString(),assignedAt:null,actionedAt:null,resolvedAt:null,createdAt:now.toISOString(),slaDeadline:addBusinessTime(now,c.priority).toISOString(),fingerprint:c.fingerprint};
      else if (old.fingerprint !== c.fingerprint) { old.fingerprint=c.fingerprint; if (['resolved','auto_closed'].includes(old.status)) { old.status='open'; old.detectedAt=now.toISOString(); old.resolvedAt=null; old.slaDeadline=addBusinessTime(now,c.priority).toISOString(); addAudit(old.id,'risk-engine','reopened',{reason:'Evidence changed'}); } }
    });
    Object.entries(stored).forEach(([key,item]) => { if (!active.has(key) && !['resolved','auto_closed'].includes(item.status)) { item.status='auto_closed'; item.resolvedAt=now.toISOString(); addAudit(item.id,'risk-engine','auto_closed',{reason:'Underlying signal cleared'}); } });
    save(stateKey,stored);
    const vehicleMap=Object.fromEntries(vehicles.map(v=>[v.id,v]));
    return candidates.map(c => {
      const state=stored[c.caseKey]; const affected=c.vehicleIds.map(id=>vehicleMap[id]).filter(Boolean); const primary=affected[0];
      return {...c,id:state.id,status:state.status,assignedOwner:state.assignedOwner,slaDeadline:state.slaDeadline,detectedAt:state.detectedAt||state.createdAt,assignedAt:state.assignedAt,actionedAt:state.actionedAt,resolvedAt:state.resolvedAt,createdAt:state.createdAt,updatedAt:state.updatedAt||state.createdAt,explanation:fallbackExplanation(c),explanationSource:'rules',customer:primary?{name:primary.customerName,phone:primary.customerPhone}:null,vehicle:primary?{id:primary.id,vin:primary.vin,model:primary.model,location:primary.customerLocation}:null,affectedVehicles:affected.map(v=>({id:v.id,vin:v.vin,model:v.model,location:v.customerLocation}))};
    }).filter(c => !['resolved','auto_closed'].includes(c.status)).sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]||b.riskScore-a.riskScore||a.slaDeadline.localeCompare(b.slaDeadline)||a.createdAt.localeCompare(b.createdAt));
  }

  function addAudit(caseId,actor,eventType,details={}) { const audit=load(auditKey,[]); audit.unshift({id:`audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,caseId,actor,eventType,details,createdAt:new Date().toISOString()}); save(auditKey,audit.slice(0,50)); }
  function getPayload(vehicles) { const all=sync(vehicles); const summary={critical:all.filter(c=>c.priority==='critical').length,high:all.filter(c=>c.priority==='high').length,medium:all.filter(c=>c.priority==='medium').length,active:all.length,overdueSla:all.filter(c=>new Date(c.slaDeadline)<new Date()).length}; return {cases:all.slice(0,5),summary,audit:load(auditKey,[]).slice(0,12),generatedAt:new Date().toISOString(),engineVersion:'action-centre-v1'}; }
  function enrich(vehicles) { const result=getPayload(vehicles); const topCounts={critical:result.cases.filter(c=>c.priority==='critical').length,high:result.cases.filter(c=>c.priority==='high').length,medium:result.cases.filter(c=>c.priority==='medium').length}; result.brief=result.cases.length?`The five highest-priority cases contain ${topCounts.critical} critical, ${topCounts.high} high and ${topCounts.medium} medium cases. Address the highest-scoring SLA first, then review clustered issues for coordinated action.`:'No active operational risks currently meet the Action Centre thresholds.'; result.briefSource='rules'; return result; }
  function draftWhatsapp(vehicles,caseId) { const c=sync(vehicles).find(x=>x.id===caseId); if(!c) throw new Error('Action case not found'); const first=(c.customer?.name||'Customer').split(' ')[0]; return {draft:`Hello ${first}, your ${c.vehicle?.model||'vehicle'} needs attention for a scheduled lifecycle check. Please reply with a convenient appointment time so our service team can assist you.`,source:'rules',phone:c.customer?.phone||''}; }
  function performAction(vehicles,caseId,type,payload={}) { const cases=sync(vehicles); const c=cases.find(x=>x.id===caseId); if(!c) throw new Error('Action case not found'); const stored=load(stateKey,{}); const state=stored[c.caseKey]; const now=new Date().toISOString(); if(type==='assign_technician'){state.assignedOwner=payload.owner;state.status='assigned';state.assignedAt=now;} else if(type==='create_campaign'){state.assignedOwner=payload.owner;state.status='in_progress';state.assignedAt=state.assignedAt||now;const campaigns=load(campaignKey,[]);campaigns.unshift({id:`SC-${Date.now()}`,name:payload.name,region:payload.region,issueCode:c.issueCode||c.caseType,vehicleIds:c.vehicleIds,owner:payload.owner,status:'planned',createdAt:now});save(campaignKey,campaigns);} else if(type==='escalate'){state.assignedOwner=payload.owner;state.status='escalated';state.assignedAt=state.assignedAt||now;} else if(type==='resolve'){state.status='resolved';state.resolvedAt=now;} else if(type==='log_contact'){const v=vehicles.find(v=>v.id===payload.vehicleId);if(v){v.contactHistory=[...(v.contactHistory||[]),{date:now.slice(0,10),channel:payload.channel||'whatsapp',outcome:payload.outcome||'opened',note:payload.note||''}];}if(state.status==='open')state.status='in_progress';} else throw new Error('Unsupported action type'); state.actionedAt=now; state.updatedAt=now; save(stateKey,stored); addAudit(caseId,localStorage.getItem('ev_auth_username')||'offline-user',type,payload); return getPayload(vehicles); }
  return {buildCandidates,addBusinessTime,getPayload,enrich,draftWhatsapp,performAction};
})();


const ActionCentreView = (() => {
  let payload = null;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const pretty = value => String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const indiaTime = value => new Date(value).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
  const slaText = value => { const date=new Date(value); const overdue=date<new Date(); return `${overdue?'Overdue · ':''}${indiaTime(value)} IST`; };
  const timeText = value => value ? `${indiaTime(value)} IST` : '—';

  async function render(container) {
    container.innerHTML='<div class="action-loading"><div class="spinner"></div><p>Prioritising lifecycle signals…</p></div>';
    try { payload=await Store.getActionCentre(); draw(container,payload); const enriched=await Store.enrichActionCentre(false); if(enriched){payload=enriched;draw(container,payload);} }
    catch(err){container.innerHTML=`<div class="empty-state"><h3>Action Centre unavailable</h3><p>${esc(err.message)}</p><button class="btn btn-secondary" onclick="ActionCentreView.refresh()">Try again</button></div>`;}
  }

  function draw(container,data){
    const demo=localStorage.getItem('ev_demo_read_only')==='true';
    const brief=data.brief||'Reviewing the current rule-based priority queue.';
    const criticalBadge=document.getElementById('badge-action-critical');
    if(criticalBadge) criticalBadge.textContent=data.summary?.critical||0;
    container.innerHTML=`
      <div class="page-header action-page-header"><div><div class="eyebrow">Decision support · Human approved</div><h1>AI Action Centre</h1><p class="page-subtitle">Structured rules detect operational risk, while generative AI explains the evidence, drafts communication and creates management summaries.</p></div><button class="btn btn-secondary" onclick="ActionCentreView.refresh(true)">Refresh brief</button></div>
      <div class="action-summary-grid">
        ${[['critical','Critical'],['high','High'],['medium','Medium']].map(([k,label])=>`<div class="action-stat ${k}"><span>${label}</span><strong>${data.summary?.[k]||0}</strong></div>`).join('')}
        <div class="action-stat sla"><span>Overdue SLA</span><strong>${data.summary?.overdueSla||0}</strong></div>
      </div>
      <section class="card management-brief"><div><span class="ai-source ${data.briefSource==='openai'?'live':'rules'}">${data.briefSource==='openai'?'AI-assisted':'Rules-based'}</span><h3>Management brief</h3><p>${esc(brief)}</p></div><div class="brief-mark">✦</div></section>
      <div class="action-layout"><section><div class="section-heading"><div><h2>Prioritised action queue</h2><p>Top five active cases, ranked by transparent operational risk.</p></div><span class="badge badge-primary">${data.cases?.length||0} shown</span></div>
        <div class="action-case-list">${(data.cases||[]).map(c=>caseCard(c,demo)).join('')||'<div class="card empty-state"><h3>No active cases</h3><p>No lifecycle signals currently meet the configured thresholds.</p></div>'}</div>
      </section><aside class="card audit-panel"><div class="card-header"><div><h3 class="card-title">Action & audit log</h3><p class="card-subtitle">Immutable operational decisions</p></div></div><div class="audit-list">${(data.audit||[]).map(event=>`<div class="audit-item"><span class="audit-dot"></span><div><strong>${esc(pretty(event.eventType))}</strong><p>${esc(event.actor)} · ${new Date(event.createdAt).toLocaleString()}</p></div></div>`).join('')||'<p class="text-muted">No approved actions yet.</p>'}</div></aside></div>
      <div class="decision-flow">${['Lifecycle signals','Risk engine','Prioritised queue','AI explanation','Human approval','Action & audit'].map((x,i)=>`<div><span>${i+1}</span>${x}</div>${i<5?'<b>→</b>':''}`).join('')}</div>`;
  }

  function caseCard(c,demo){
    const affected=c.affectedVehicles?.length||1;
    return `<article class="action-case ${c.priority}">
      <div class="case-score"><span>${pretty(c.priority)} risk</span><strong>${c.riskScore}</strong><small>Risk score</small></div>
      <div class="case-content"><div class="case-topline"><span class="badge case-priority ${c.priority}">${pretty(c.priority)}</span><span class="badge badge-primary">${esc(c.category)}</span><span class="case-status">${pretty(c.status)}</span></div>
      <h3>${affected>1?`${affected} affected vehicles · ${esc(c.vehicle?.location||'Regional cluster')}`:`${esc(c.customer?.name||'Customer')} · ${esc(c.vehicle?.model||'EV')}`}</h3>
      <p class="case-vehicle">${affected>1?esc(c.affectedVehicles.map(v=>v.vin).join(' · ')):esc(c.vehicle?.vin||'')}</p>
      <p class="case-explanation">${esc(c.explanation||c.reason)}</p>
      <div class="case-evidence">${(c.evidence||[]).map(item=>`<span>✓ ${esc(item)}</span>`).join('')}</div>
      <div class="case-recommendation"><b>Recommended action</b><p>${esc(c.recommendation)}</p></div>
      <div class="case-meta"><div><span>Assigned owner</span><strong>${esc(c.assignedOwner||'Unassigned')}</strong></div><div><span>SLA deadline</span><strong class="${new Date(c.slaDeadline)<new Date()?'text-rose':''}">${esc(slaText(c.slaDeadline))}</strong></div><div><span>Explanation</span><strong>${c.explanationSource==='openai'?'AI-assisted':'Rules-based'}</strong></div></div>
      <div class="case-timestamps"><span>Detected <b>${esc(timeText(c.detectedAt))}</b></span><span>Assigned <b>${esc(timeText(c.assignedAt))}</b></span><span>Last action <b>${esc(timeText(c.actionedAt))}</b></span></div>
      <div class="case-actions"><button class="btn btn-secondary btn-sm" onclick="ActionCentreView.whatsapp('${c.id}')">Draft WhatsApp</button><button class="btn btn-secondary btn-sm" ${demo?'disabled title="Sign in to approve actions"':''} onclick="ActionCentreView.assign('${c.id}')">Assign Technician</button>${c.caseType==='regional_pattern'?`<button class="btn btn-primary btn-sm" ${demo?'disabled':''} onclick="ActionCentreView.campaign('${c.id}')">Create Campaign</button>`:''}<button class="btn btn-secondary btn-sm" ${demo?'disabled':''} onclick="ActionCentreView.escalate('${c.id}')">Escalate</button><button class="btn btn-success btn-sm" ${demo?'disabled':''} onclick="ActionCentreView.resolve('${c.id}')">Mark Resolved</button></div>
      </div></article>`;
  }

  const findCase=id=>(payload?.cases||[]).find(c=>c.id===id);
  async function refresh(force=false){const container=document.getElementById('active-page-view');try{payload=force?await Store.enrichActionCentre(true):await Store.getActionCentre();draw(container,payload);}catch(e){App.showToast(e.message,'error');}}
  async function run(id,type,data,message){try{if(!confirm(message))return;payload=await Store.performCaseAction(id,type,data);draw(document.getElementById('active-page-view'),payload);App.showToast('Action approved and recorded.','success');}catch(e){App.showToast(e.message,'error');}}
  function assign(id){const owner=prompt('Assign technician:','Arjun Patel');if(owner?.trim())run(id,'assign_technician',{owner:owner.trim()},`Assign this case to ${owner.trim()}?`);}
  function campaign(id){const c=findCase(id);const region=c?.region||'Regional';const name=prompt('Campaign name:',`${c?.category||'Service'} Response Campaign`);if(!name)return;const owner=prompt('Campaign owner:','Regional Service Lead');if(owner)run(id,'create_campaign',{name:name.trim(),region,owner:owner.trim()},`Create ${name.trim()} for ${c?.affectedVehicles?.length||0} vehicles?`);}
  function escalate(id){const owner=prompt('Escalation owner:','Dealer / RTO Owner');if(!owner)return;const note=prompt('Escalation note:');if(note)run(id,'escalate',{owner:owner.trim(),note:note.trim()},'Escalate this case and record the decision?');}
  function resolve(id){const note=prompt('Resolution note:');if(note)run(id,'resolve',{note:note.trim()},'Mark this case as resolved?');}
  async function whatsapp(id){try{const c=findCase(id);const response=await Store.draftWhatsapp(id);const edited=prompt(`Editable WhatsApp draft (${response.source==='openai'?'AI-assisted':'Rules-based'}):`,response.draft);if(!edited)return;const demo=localStorage.getItem('ev_demo_read_only')==='true';if(demo){App.showToast('Preview ready. Demo mode does not open WhatsApp or record an action.','info');return;}if(!confirm('Open this approved draft in WhatsApp? This records “opened”, not “sent”.'))return;await Store.performCaseAction(id,'log_contact',{vehicleId:c.vehicle.id,channel:'whatsapp',outcome:'opened',note:'Approved draft opened in WhatsApp'});const digits=String(response.phone||'').replace(/\D/g,'');window.open(`https://wa.me/${digits}?text=${encodeURIComponent(edited)}`,'_blank','noopener');await refresh();}catch(e){App.showToast(e.message,'error');}}
  return {render,refresh,assign,campaign,escalate,resolve,whatsapp};
})();
