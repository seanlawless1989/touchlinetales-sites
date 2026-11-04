// Touchline Tales owner page: touchlinetales.club/admin/
// One page for the owner to see how every team site is being used. Each Supabase project is signed in to separately
// (the shared Newton Aycliffe project, and Darlington's own project), then public.tt_overview() returns counts and
// dates for every team in that project (supabase/28_platform_admin.sql in nayfcu9). Only emails in public.tt_admins
// get anything back, and it never includes children's names or anything else about a player.
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// Supabase projects (the anon keys are public, like on every team site)
const PROJECTS={
  nayfc:{label:"Shared project (Newton Aycliffe, Washington)",url:"https://elqwksyqwezhkekdqivn.supabase.co",
    key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts",
    code:true},
  darlington:{label:"Darlington project",url:"https://edfunxqjepmfwtwqqjut.supabase.co",
    key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZnVueHFqZXBtZnd0d3FxanV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTMxMzUsImV4cCI6MjEwNzk4OTEzNX0.yOdjO4zovUmTjUAmQcnrFLPTvEiUoHhNrXrW5u5NDC0",
    code:false}   // its sign-in email only has a link, no code
};
// Team sites. Add a line here for each new team (project + the schema its data lives in).
const SITES=[
  {name:"Newton Aycliffe U9s",short:"NA U9s",project:"nayfc",schema:"public",url:"https://touchlinetales.club/newton-aycliffe-u9s/",club:"newton-aycliffe"},
  {name:"Newton Aycliffe U11s Wildcats",short:"NA Wildcats",project:"nayfc",schema:"na_u11_wildcats",url:"https://touchlinetales.club/newton-aycliffe-u11s-wildcats/",club:"newton-aycliffe"},
  {name:"Newton Aycliffe U11s Pumas",short:"NA Pumas",project:"nayfc",schema:"na_u11_pumas",url:"https://touchlinetales.club/newton-aycliffe-u11s-pumas/",club:"newton-aycliffe"},
  {name:"Washington Wolves U11s",short:"Wolves U11s",project:"nayfc",schema:"washington_wolves_u11s",url:"https://touchlinetales.club/washington-wolves-u11s/"},
  {name:"Darlington United U14s",short:"Darlington U14s",project:"darlington",schema:"public",url:"https://touchlinetales.club/darlington-united-u14s/"}
];
const CLUBS=[{name:"Newton Aycliffe club admin",url:"https://touchlinetales.club/newton-aycliffe/admin/"}];

const ST={};   // per project: {sb, user, data, err, sent}
const q=new URLSearchParams(location.search);
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,4000)}
const n=v=>v==null?"–":Number(v).toLocaleString("en-GB");
function ago(d){if(!d)return "never";const t=new Date(String(d).length===10?d+"T12:00:00":d),days=Math.floor((Date.now()-t)/864e5);
  if(days<=0){const h=Math.floor((Date.now()-t)/36e5);return h<1?"just now":h<24&&String(d).length>10?h+"h ago":"today"}
  return days===1?"yesterday":days<14?days+" days ago":t.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
const day=d=>d?new Date(d+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}):"none";
const latest=(...ds)=>ds.filter(Boolean).map(d=>String(d).length===10?d+"T12:00:00":d).sort().pop()||null;

// ---------- drawing ----------
function bars(days){if(!days||!days.length)return "";const m=Math.max(1,...days.map(d=>d.views));
  return `<div class="bars" aria-label="Visits, last 14 days">${days.map(d=>`<i style="height:${Math.max(2,Math.round(d.views/m*100))}%" title="${esc(day(d.day))}: ${d.views} views, ${d.visitors} devices"></i>`).join("")}</div>`}
function flags(s){const f=[];
  if(s.ready===false)f.push("Setup not finished: visitors see 'being set up'");
  if(!s.coaches_in)f.push("No coach has signed in yet");
  else if(!s.coaches7)f.push("No coach signed in this week");
  if(s.games_past>0&&!s.games_logged)f.push("No games logged yet");
  if(s.next_game==null&&s.games_upcoming===0)f.push("No upcoming games on the calendar");
  if(s.views!=null&&!s.views7)f.push("No visits this week");
  return f}
function stat(v,label,sub){return `<div class="stat"><b>${v}</b><span>${label}</span>${sub?`<small>${sub}</small>`:""}</div>`}
function siteCard(site,s){
  const last=latest(s.coach_last,s.last_active,s.match_edit,s.avail_last,s.parent_last_link,s.last_view);
  const f=flags(s);
  return `<article class="card site">
    <div class="sitehead"><div><h2>${esc(site.name)}</h2><div class="hint">${esc(s.schema)} · last activity ${esc(ago(last))}</div></div>
      <span class="pill ${s.ready!==false?"ok":"wait"}">${s.ready!==false?"Live":"Being set up"}</span></div>
    <div class="btns"><a class="mini" href="${esc(site.url)}" target="_blank" rel="noopener">Open site</a><a class="mini" href="${esc(site.url)}?coach" target="_blank" rel="noopener">Coach sign-in</a></div>
    ${f.length?`<div class="note">${f.map(esc).join("<br>")}</div>`:""}
    <div class="stats">
      ${stat(`${n(s.coaches_in)}/${n(s.coaches)}`,"coaches signed in",`${n(s.coaches7)} this week · last ${esc(ago(s.coach_last))}`)}
      ${stat(n(s.parent_phones),"parent phones",`${n(s.children_linked)} of ${n(s.players)} children linked · ${n(s.parents7)} this week`)}
      ${stat(n(s.views7),"visits this week",`${n(s.visitors7)} devices · ${n(s.views)} since ${esc(s.views_since?day(s.views_since):"start")}`)}
      ${stat(`${n(s.games_logged)}/${n(s.games_past)}`,"games logged",`last ${esc(day(s.last_logged))} · next ${esc(day(s.next_game))}`)}
      ${stat(n(s.avail),"availability answers",`${n(s.avail7)} this week · training ${n(s.train_avail)}`)}
      ${stat(n(s.alert_phones),"alert phones",`${n(s.alert_ok30)} reached in 30 days`)}
      ${stat(n(s.reports),"match reports",`${n(s.cheers)} cheers · ${n(s.photos)} photos`)}
    </div>
    ${bars((s.days||[]).slice(-14))}<div class="hint">Visits, last 14 days (coaches' phones aren't counted)</div>
    <details><summary>Coaches (${n(s.coaches)})</summary><div class="rows">${(s.coach_list||[]).map(c=>`<div class="row"><span>${esc(c.email)}</span><span class="hint">${c.last?"signed in "+esc(ago(c.last)):"never signed in"}</span></div>`).join("")||'<div class="hint">None on the list.</div>'}</div></details>
  </article>`}

function loginCard(k){const p=PROJECTS[k],st=ST[k];
  if(st.sent)return `<form class="card stack" data-code="${k}" data-email="${esc(st.sent)}"><h3>${esc(p.label)}</h3>
    <p class="hint">${p.code?`We've emailed a 6-digit code to ${esc(st.sent)}. Type it here, or tap the link in the email.`:`We've emailed a sign-in link to ${esc(st.sent)}. Open it on this device and you'll land back here signed in.`}</p>
    ${p.code?`<input name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="10"><div class="btns"><button class="btn">Sign in</button><button type="button" class="mini" data-again="${k}">Start again</button></div>`:`<div class="btns"><button type="button" class="mini" data-again="${k}">Start again</button></div>`}</form>`;
  return `<form class="card stack" data-login="${k}"><h3>${esc(p.label)}</h3>
    <p class="hint">${st.err?esc(st.err):"Sign in with your owner email."}</p>
    <input name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
    <div class="btns"><button class="btn">Email me ${p.code?"a code":"a link"}</button></div></form>`}

function render(){
  const main=$("#main"),rows=[];let any=false;
  const tot={sites:0,coaches7:0,parents:0,views7:0,games:0,alerts:0};
  const extra=[],vis=[];
  for(const k of Object.keys(PROJECTS)){const st=ST[k];
    if(!st.data){rows.push(loginCard(k));continue}
    any=true;const by={};(st.data.sites||[]).forEach(s=>by[s.schema]=s);
    SITES.filter(x=>x.project===k).forEach(site=>{const s=by[site.schema];delete by[site.schema];
      if(!s){rows.push(`<article class="card"><h2>${esc(site.name)}</h2><p class="hint">No data area called ${esc(site.schema)} in the ${esc(PROJECTS[k].label)}.</p></article>`);return}
      tot.sites++;tot.coaches7+=s.coaches7||0;tot.parents+=s.parent_phones||0;tot.views7+=s.views7||0;tot.games+=s.games_logged||0;tot.alerts+=s.alert_phones||0;
      vis.push({site,s});rows.push(siteCard(site,s))});
    Object.values(by).forEach(s=>extra.push({k,s}));
  }
  const who=Object.keys(PROJECTS).filter(k=>ST[k].user).map(k=>`<span>${esc(PROJECTS[k].label.split(" (")[0])}: ${esc(ST[k].user.email)} <button class="mini" data-out="${k}">Sign out</button></span>`).join("");
  $("#who").innerHTML=who;
  main.innerHTML=(any?`<section class="card"><div class="stats top">
      ${stat(n(tot.sites),"team sites")}${stat(n(tot.coaches7),"coaches in this week")}${stat(n(tot.parents),"parent phones")}
      ${stat(n(tot.views7),"views this week")}${stat(n(tot.games),"games logged")}${stat(n(tot.alerts),"alert phones")}</div>
      <div class="btns">${CLUBS.map(c=>`<a class="mini" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>`).join("")}<button class="mini" id="refresh">Refresh</button></div>
      <p class="hint">Counts only, never children's names. Updated ${esc(new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}))}.</p></section>`:
      `<section class="card"><h2>Owner sign-in</h2><p class="hint">This page shows how every team site is being used. Only the Touchline Tales owner can see anything here. Each database is signed in to once on this device.</p></section>`)
    +visitsCard(vis)+rows.join("")
    +(extra.length?`<details class="card"><summary>Other data areas with no site listed (${extra.length})</summary><div class="rows">${extra.map(({k,s})=>`<div class="row"><span>${esc(s.schema)} <span class="hint">(${esc(PROJECTS[k].label)})</span></span><span class="hint">${n(s.coaches)} coaches · ${n(s.games)} games · ${n(s.views)} visits</span></div>`).join("")}</div></details>`:"");
}

// every team site's visits added together, plus a table and a stacked chart of the last 30 days
const COLS=["#13804A","#2235E8","#D2232A","#F2C230","#7A3FB0","#0E8C8C","#E07B00"];
function visitsCard(list){if(!list.length)return "";
  const sum=k=>list.reduce((t,x)=>t+(x.s[k]||0),0);
  const days={};list.forEach((x,i)=>(x.s.days||[]).forEach(d=>{(days[d.day]=days[d.day]||[])[i]=d.views}));
  const keys=Object.keys(days).sort(),mx=Math.max(1,...keys.map(k=>days[k].reduce((t,v)=>t+(v||0),0)));
  const chart=`<div class="sbars" aria-label="Visits to all team sites, last 30 days">${keys.map(k=>{const tot=days[k].reduce((t,v)=>t+(v||0),0);
    return `<span title="${esc(day(k))}: ${tot} views">${list.map((x,i)=>days[k][i]?`<i style="height:${days[k][i]/mx*100}%;background:${COLS[i%COLS.length]}"></i>`:"").join("")}</span>`}).join("")}</div>
    <div class="legend">${list.map((x,i)=>`<span><i style="background:${COLS[i%COLS.length]}"></i>${esc(x.site.short||x.site.name)}</span>`).join("")}</div>`;
  const rows=list.slice().sort((a,b)=>(b.s.views7||0)-(a.s.views7||0)||(b.s.views||0)-(a.s.views||0));
  return `<section class="card"><h2>Website visits, all team sites</h2>
    <div class="stats top">${stat(n(sum("views_today")),"views today",`${n(sum("visitors_today"))} devices`)}${stat(n(sum("views7")),"last 7 days",`${n(sum("visitors7"))} device-days`)}
      ${stat(n(sum("views30")),"last 30 days",`${n(sum("visitors30"))} device-days`)}${stat(n(sum("views")),"all time",`${n(sum("visitors"))} device-days`)}</div>
    ${chart}
    <div class="tbl"><table><thead><tr><th>Site</th><th>Today</th><th>7 days</th><th>30 days</th><th>All time</th><th>Last visit</th></tr></thead><tbody>
    ${rows.map(x=>`<tr><td>${esc(x.site.short||x.site.name)}</td><td>${n(x.s.views_today)}</td><td>${n(x.s.views7)}</td><td>${n(x.s.views30)}</td><td>${n(x.s.views)}</td><td>${esc(ago(x.s.last_view))}</td></tr>`).join("")}
    <tr class="sum"><td>All sites</td><td>${n(sum("views_today"))}</td><td>${n(sum("views7"))}</td><td>${n(sum("views30"))}</td><td>${n(sum("views"))}</td><td></td></tr></tbody></table></div>
    <p class="hint">A view is each time someone opens a team site; a device is counted once per day. Coaches' phones aren't counted. Each site started counting on a different day.</p></section>`}

// ---------- data ----------
async function load(k){const st=ST[k];st.data=null;
  if(!st.user){render();return}
  const {data,error}=await st.sb.rpc("tt_overview");
  if(error){st.err=error.code==="PGRST202"?"This database isn't set up for the owner page yet (run 28_platform_admin.sql).":"Couldn't load the numbers. Try again.";render();return}
  if(data==null){st.err=`${st.user.email} isn't on the owner list for this database.`;await st.sb.auth.signOut();return}
  st.err="";st.data=data;render()}

document.addEventListener("submit",async e=>{e.preventDefault();const f=e.target;
  if(f.dataset.login){const k=f.dataset.login,st=ST[k],email=f.email.value.trim().toLowerCase();if(!email)return;
    const {error}=await st.sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname+"?p="+k}});
    if(error){toast(error.status===429?"Too many sign-in emails just now. Try again in a few minutes.":/database error|coach/i.test(error.message||"")?"That email isn't on the owner list.":"Couldn't send the email. Try again.");return}
    st.sent=email;render();setTimeout(()=>{const i=document.querySelector(`[data-code="${k}"] input`);i&&i.focus()},50);return}
  if(f.dataset.code){const k=f.dataset.code,token=(f.code.value||"").replace(/\D/g,"");if(token.length<6){toast("Type the code from the email.");return}
    const {error}=await ST[k].sb.auth.verifyOtp({email:f.dataset.email,token,type:"email"});if(error)toast("That code didn't work. Use the newest email.")}
});
document.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.out){await ST[d.out].sb.auth.signOut();return}
  if(d.again){ST[d.again].sent=null;render();return}
  if(b.id==="refresh"){await Promise.all(Object.keys(PROJECTS).map(load));toast("Updated.")}
});

(async function(){
  if(!window.supabase){$("#main").innerHTML='<div class="card">Couldn\'t load. Check your connection and refresh.</div>';return}
  const from=q.get("p");
  await Promise.all(Object.entries(PROJECTS).map(async([k,p])=>{
    // only the project a sign-in link was for reads the link's token from the address
    const sb=window.supabase.createClient(p.url,p.key,{auth:{storageKey:"sb-tt-owner-"+k,detectSessionInUrl:from===k}});
    const st=ST[k]={sb,user:null,data:null,err:"",sent:null};
    const {data:{session}}=await sb.auth.getSession();st.user=session?.user||null;
    sb.auth.onAuthStateChange((_e,s)=>{const u=s?.user||null;if((u&&u.id)!==(st.user&&st.user.id)){st.user=u;st.sent=null;load(k)}});
    await load(k);
  }));
  if(from)history.replaceState(null,"",location.pathname);
  render();
})();
})();
