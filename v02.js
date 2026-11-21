/* AMITY LIFE QUEST V0.2 - no backend, compatible with V0.1 state */
(function(){
'use strict';
const VERSION='0.2.0';
const cats=['日常','健康','學習','創作','家庭','其他'];
function node(tag,txt,cls){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;}
function card(title){const e=node('section',undefined,'card');e.append(node('b',title));return e;}
function addLine(p,s){p.append(node('p',s,'muted'));}
function dateString(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function before(d,n){return dateString(new Date(dateAt(d).getTime()-n*86400000));}
function uniqueDone(){return state.events.filter(e=>e.active);}
function statsFor(days){let total=0,done=0,xp=0,eligible=0;for(let i=0;i<days;i++){const d=before(today(),i),list=tasksOn(d);if(typeOfDay(d)==='rest')continue;if(list.length)eligible++;total+=list.length;done+=list.filter(t=>eventFor(t.id,d)).length;xp+=uniqueDone().filter(e=>e.date===d).reduce((s,e)=>s+(Number(e.xp)||0),0);}return {total,done,xp,eligible,pct:total?Math.round(done/total*100):0};}
function streak(){let n=0;for(let i=0;i<366;i++){const d=before(today(),i),list=tasksOn(d);if(typeOfDay(d)==='rest'||!list.length)continue;if(list.some(t=>eventFor(t.id,d)))n++;else if(i===0)continue;else break;}return n;}
function bond(){const dates=new Set([...state.events.map(e=>e.date),...state.moods.map(e=>e.date),...state.amity.map(e=>e.date)]);let points=0;for(const d of dates){let x=0;const list=tasksOn(d),n=list.filter(t=>eventFor(t.id,d)).length;if(n)x+=5;if(list.length&&n===list.length)x+=5;if(state.moods.some(m=>m.date===d))x+=2;if(state.amity.some(a=>a.date===d&&a.kind!=='mood'))x+=1;points+=Math.min(13,x);}const levels=[0,100,300,600,1000];let level=1;for(let i=1;i<levels.length;i++)if(points>=levels[i])level=i+1;return {points,level,next:levels[level]||null};}
const achievementRules=[
 ['first','冒險開始','完成第一項任務',()=>uniqueDone().length>=1],
 ['ten','踏實前進','累積完成 10 項任務',()=>uniqueDone().length>=10],
 ['fifty','堅持的力量','累積完成 50 項任務',()=>uniqueDone().length>=50],
 ['level5','初露鋒芒','冒險者達到 LV 5',()=>calc().level>=5],
 ['mood','心情筆記','第一次分享心情',()=>state.moods.length>=1],
 ['bond2','熟悉的陪伴','Amity 羈絆達 LV 2',()=>bond().level>=2]
];
function migrate(){if(!state.achievements||typeof state.achievements!=='object'||Array.isArray(state.achievements))state.achievements={};if(!state.profile)state.profile={nickname:'冒險者',anchor:'2026-11-14',challenge:today()};if(!Array.isArray(state.moods))state.moods=[];if(!Array.isArray(state.amity))state.amity=[];if(!Array.isArray(state.events))state.events=[];if(!Array.isArray(state.tasks))state.tasks=[];}
function unlock(){let changed=false;for(const [id,title,desc,check] of achievementRules){if(!state.achievements[id]&&check()){state.achievements[id]={date:today(),title};changed=true;}}if(changed&&typeof db!=='undefined'&&db)save().catch(()=>{});}
function bondPanel(){const b=bond(),p=card('♡ Amity 羈絆 LV '+b.level);addLine(p,'累積 '+b.points+' 羈絆點'+(b.next?' · 下一級 '+b.next+' 點':' · 已達目前最高級'));addLine(p,'完成任務、分享心情、每日首次互動可累積羈絆；同一天有上限，不會因休息扣分。');return p;}
function achievementPanel(){const p=card('🏅 成就收藏');for(const [id,title,desc] of achievementRules){const got=state.achievements[id];addLine(p,(got?'🏆 ':'🔒 ')+title+'｜'+desc+(got?' · '+got.date:''));}return p;}
function statsPanel(){const p=card('📊 任務統計');for(const n of [7,30]){const s=statsFor(n);addLine(p,'最近 '+n+' 天：'+s.done+'/'+s.total+' 項完成 · '+s.pct+'% · 任務 XP 原始合計 '+s.xp);}addLine(p,'目前連續有效日 '+streak()+' 天（完全休息及無任務日不計入，也不打斷）。');return p;}
function makeButton(label,fn){const b=node('button',label,'secondary');b.type='button';b.addEventListener('click',fn);return b;}
const oldRender=render;
render=function(){migrate();unlock();oldRender();const main=document.getElementById('main');if(!main)return;
 if(state.tab==='home'){main.append(bondPanel());addLine(main,'AMITY LIFE QUEST · V'+VERSION);}
 if(state.tab==='hero'){main.append(achievementPanel());}
 if(state.tab==='talk'){main.append(bondPanel());}
 if(state.tab==='record'){main.append(statsPanel());main.append(achievementPanel());}
 if(state.tab==='quest'){
   const title=main.querySelector('.title');if(title){const b=makeButton('＋ 常用任務範本',()=>templateModal());title.parentNode.append(b);}
   const buttons=[...main.querySelectorAll('[data-edit]')];
   for(const [i,b] of buttons.entries()){const row=b.closest('.card.row'),task=state.tasks.find(t=>t.id===b.dataset.edit);if(!row||!task)continue;const caption=node('div','分類：'+(task.category||'日常'),'muted');row.firstElementChild.append(caption);const up=makeButton('↑',()=>move(task.id,-1)),down=makeButton('↓',()=>move(task.id,1));up.style.padding=down.style.padding='7px';up.setAttribute('aria-label','上移任務');down.setAttribute('aria-label','下移任務');row.append(up,down);}
 }
};
async function move(id,dir){const i=state.tasks.findIndex(t=>t.id===id),j=i+dir;if(i<0||j<0||j>=state.tasks.length)return;[state.tasks[i],state.tasks[j]]=[state.tasks[j],state.tasks[i]];await save();render();}
const oldForm=form;
form=function(task){oldForm(task);const f=document.getElementById('taskForm');if(!f)return;const label=node('label','任務分類');const select=node('select');select.name='category';for(const c of cats){const opt=node('option',c);opt.value=c;if((task?.category||'日常')===c)opt.selected=true;select.append(opt);}f.insertBefore(label,f.firstChild);f.insertBefore(select,label.nextSibling);};
const templates=[
 {name:'喝水',target:1,unit:'次',attribute:'endurance',difficulty:'easy',category:'健康',applies:'all'},
 {name:'運動 20 分鐘',target:20,unit:'分鐘',attribute:'strength',difficulty:'normal',category:'健康',applies:'off'},
 {name:'學習 15 分鐘',target:15,unit:'分鐘',attribute:'wisdom',difficulty:'normal',category:'學習',applies:'all'},
 {name:'創作 30 分鐘',target:30,unit:'分鐘',attribute:'focus',difficulty:'hard',category:'創作',applies:'off'},
 {name:'整理生活空間',target:1,unit:'次',attribute:'discipline',difficulty:'easy',category:'日常',applies:'off'}
];
function templateModal(){const p=document.createElement('div');p.append(node('h3','選擇常用任務範本'));for(const t of templates){const b=makeButton(t.name+'（'+t.category+'）',()=>addTemplate(t));b.style.display='block';b.style.width='100%';b.style.marginBottom='8px';p.append(b);}p.append(makeButton('取消',()=>close()));modal(p.innerHTML);const sheet=document.getElementById('sheet');[...sheet.querySelectorAll('button')].forEach((b,i)=>b.onclick=i<templates.length?()=>addTemplate(templates[i]):()=>close());}
async function addTemplate(t){const difficulty=t.difficulty;state.tasks.push({...t,id:uid(),frequency:'daily',weekdays:[0,1,2,3,4,5,6],start:today(),end:'',archived:false,xp:{easy:20,normal:40,hard:80}[difficulty],points:{easy:1,normal:2,hard:3}[difficulty]});await save();close();state.tab='quest';render();}
const oldMessage=message;
message=function(){const base=oldMessage(),b=bond(),d=today(),m=state.moods.filter(x=>x.date===d).at(-1)?.value;const t=tasksOn(d),done=t.filter(x=>eventFor(x.id,d)).length;if(m==='疲倦'||m==='低落')return '今天辛苦了。別急著把所有任務做完，我在這裡陪你。♡';if(typeOfDay(d)==='rest')return '休息日也是冒險的一部分。今天就安心恢復吧。♡';if(t.length&&done===t.length)return b.level>=2?'全部完成！我就知道你辦得到。今天要好好獎勵自己喔。♡':'今日任務全清！哼，看來你比我想的還厲害。♡';if(done)return '已經完成 '+done+' 項任務了。'+(b.level>=2?'我有好好記住你的努力。♡':'慢慢來，我會陪你。');return base;};
})();
