// STEM Fit final release script.js (AI-powered)
// Handles: nav, accessibility toggles, calorie calculator, plan generator (AI), rehab relief, export/print, exercise modal display.
// Uses fetch('exercises.json') with fallback to embedded DB.

let exercisesDB = null;
let exercisesMap = {}; // fast lookup by id

// Fetch exercises.json; fallback to window.EMBEDDED_DB if fetch blocked (file://)
async function loadExercises(){
  try{
    const res = await fetch('exercises.json');
    if(!res.ok) throw new Error('Network response not ok');
    exercisesDB = await res.json();
    console.log('Loaded exercises.json', exercisesDB.length, 'entries');
  }catch(err){
    console.warn('Failed to fetch exercises.json — using embedded DB if present.', err);
    exercisesDB = window.EMBEDDED_DB || [];
  }
  // build lookup map
  exercisesDB.forEach(ex => { exercisesMap[ex.id] = ex; });
  // expose for debugging
  window.exercisesDB = exercisesDB;
  return exercisesDB;
}

// Navigation and accessibility
function initNav(){
  const navToggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      const show = navList.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', String(show));
    });
  }
  // skip link handling for focus
  const skip = document.querySelector('.skip-link');
  if(skip){
    skip.addEventListener('click', ()=>{
      const main = document.getElementById('main');
      if(main){ main.setAttribute('tabindex','-1'); main.focus(); }
    });
  }
  // header toggles
  const contrast = document.getElementById('contrast-toggle');
  if(contrast) contrast.addEventListener('change', ()=> document.body.classList.toggle('high-contrast', contrast.checked));
  const fontToggle = document.getElementById('font-toggle');
  if(fontToggle) fontToggle.addEventListener('change', ()=> document.body.classList.toggle('large-font', fontToggle.checked));
}

// Calorie calculator functions
function bmr_mifflin(sex,w,h,age){ return (sex==='male')? 10*w + 6.25*h - 5*age + 5 : 10*w + 6.25*h - 5*age -161; }
function bmr_harris(sex,w,h,age){ return (sex==='male')? 13.397*w + 4.799*h - 5.677*age + 88.362 : 9.247*w + 3.098*h - 4.330*age + 447.593; }
function bmr_katch(w,bodyfat=0.25){ return 370 + 21.6*(w*(1-bodyfat)); }

function initCalorieCalc(){
  const btn = document.getElementById('calc-btn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const h = Number(document.getElementById('height').value);
    const w = Number(document.getElementById('weight').value);
    const age = Number(document.getElementById('age').value);
    const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
    const activity = Number(document.getElementById('activity').value) || 1.55;
    const goal = document.getElementById('cc-goal')?.value || 'maintain';
    const formula = document.querySelector('input[name="formula"]:checked')?.value || 'mifflin';
    const err = document.getElementById('cc-error');
    err.textContent='';
    if(!h||!w||!age){ err.textContent='Please enter valid height, weight, and age.'; return; }
    let bmr = 0;
    if(formula==='mifflin') bmr = bmr_mifflin(sex,w,h,age);
    else if(formula==='harris') bmr = bmr_harris(sex,w,h,age);
    else if(formula==='katch') bmr = bmr_katch(w);
    else bmr = bmr_mifflin(sex,w,h,age);
    const tdee = Math.round(bmr * activity);
    let adj = 0;
    if(goal==='cut') adj = -500; else if(goal==='bulk') adj = 300;
    const goalCals = Math.max(1000, tdee + adj);
    document.getElementById('bmr').textContent = `Basal Metabolic Rate: ${Math.round(bmr)} kcal`;
    document.getElementById('tdee').textContent = `Estimated Daily Calories (TDEE): ${tdee} kcal`;
    document.getElementById('goal-cals').textContent = `Recommended Calories for your Goal: ${goalCals} kcal`;
    document.getElementById('cc-results').hidden = false;
  });
}

// Utility: get selected equipment and pain
function getSelectedValues(name){
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i=>i.value);
}

// ========================== AI PLAN GENERATOR ==============================
async function generatePlanAI(userOptions){
  const exercises = await loadExercises();

  const res = await fetch("/.netlify/functions/ai-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ options: userOptions, exercises })
  });

  if(!res.ok) throw new Error("AI request failed");
  return await res.json();
}

// render functions for plan and rehab lists
function renderPlan(plan){
  const container = document.getElementById('plan-body');
  if(!container) return;
  container.innerHTML='';

  const meta = document.createElement('p'); 
  meta.className='muted'; 
  meta.textContent = `Level: ${plan.meta.level} • Goal: ${plan.meta.goal} • ${plan.days.length} sessions/week`;
  container.appendChild(meta);

  plan.days.forEach((d,i)=>{
    const dayCard = document.createElement('section'); 
    dayCard.className='card'; 
    dayCard.style.margin='12px 0';

    const hd = document.createElement('div'); 
    hd.className='card-head neon-bar'; 
    hd.innerHTML = `<h4>Day ${i+1}: ${d.sessionType}</h4>`;

    const bd = document.createElement('div'); 
    bd.className='card-body';

    // Warmups
    d.warmup?.forEach(w=> { 
      const p = document.createElement('p'); 
      p.textContent = `Warm-up: ${w.name} (${w.reps||""})`; 
      bd.appendChild(p); 
    });

    // Exercises
    d.exercises?.forEach(ex=>{
      const dbEx = exercisesMap[ex.id] || {};
      const exName = dbEx.name || ex.name || ex.id || "Unknown Exercise";
      const btn = document.createElement('button'); 
      btn.className='exercise-card'; 
      btn.type='button'; 
      btn.style.width='100%';
      btn.innerHTML = `<strong>${exName}</strong><div class="muted">${ex.sets||"?"} × ${ex.reps||"?"}${ex.isRehab?'<em> • Rehab</em>':''}</div>`;
      btn.addEventListener('click', ()=> showExerciseDetails(ex.id));
      bd.appendChild(btn);
    });

    dayCard.appendChild(hd); 
    dayCard.appendChild(bd);
    container.appendChild(dayCard);
  });
}

// show exercise details in a simple modal-like alert (kept lightweight)
function showExerciseDetails(id){
  const ex = exercisesMap[id] || {name:id, instructions:'No details available.'};
  let detail = `Exercise: ${ex.name}\nPrimary: ${(ex.primary_muscles||[]).join(', ')}\nInstructions: ${ex.instructions || '—'}\nPrecautions: ${ex.precautions || '—'}`;
  if(ex.video){
    detail += `\nVideo: ${ex.video} (suggested: ${ex.video_suggested || 'trusted source'})`;
  }
  if(confirm(detail + "\n\nOpen video (if available) and print full info to console? (Cancel to close)")){
    console.log('Full exercise object:', ex);
    if(ex.video){ 
      try { window.open(ex.video, '_blank'); } catch(e){ console.warn('Could not open video link', e); }
    }
  }
}

// relief exercises for rehab page
function initRelief(){
  const sel = document.getElementById('relief-select');
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    const area = sel.value;
    const out = document.getElementById('relief-output');
    out.innerHTML='';
    if(!area) return;
    let items = [];
    if(area==='neck') items = [
      {name:'Chin tucks', dosage:'2×10', notes:'Keep movement small, pain-free.'},
      {name:'Upper trap stretch', dosage:'3×30s each side', notes:'Avoid pulling on head.'},
      {name:'Levator scapulae stretch', dosage:'3×30s each side', notes:'Breathe deeply.'},
      {name:'Gentle cervical rotations', dosage:'2×10', notes:'Slow controlled movements.'}
    ];
    if(area==='shoulder') items = [
      {name:'Band external rotation', dosage:'3×10', notes:'Start light; stop if sharp pain.'},
      {name:'Scapular wall slides', dosage:'2×12', notes:'Focus scapula control.'},
      {name:'Band pull-aparts', dosage:'3×12', notes:'Controlled tempo.'}
    ];
    if(area==='knee') items = [
      {name:'Step-ups', dosage:'3×8–12 each leg', notes:'Use box height that allows control.'},
      {name:'Terminal knee extension (TKE)', dosage:'3×12', notes:'Straighten knee fully.'},
      {name:'Clamshells', dosage:'3×15', notes:'Use a light band.'}
    ];
    if(area==='low back') items = [
      {name:'Bird dog', dosage:'3×10 each side', notes:'Focus neutral spine.'},
      {name:'Glute bridge', dosage:'3×12', notes:'Squeeze glutes at top.'},
      {name:'Dead bug', dosage:'3×10 each side', notes:'Controlled core engagement.'}
    ];
    const ul = document.createElement('ul');
    items.forEach(it=>{ const li = document.createElement('li'); li.innerHTML = `<strong>${it.name}</strong> — ${it.dosage} <span class="muted">(${it.notes})</span>`; ul.appendChild(li); });
    out.appendChild(ul);
  });
}

// export/print
function initExport(){
  const btn = document.getElementById('export-btn');
  if(btn) btn.addEventListener('click', ()=> window.print());
}

// wire up generator form
function initGenerator(){
  const btn = document.getElementById('generate-btn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const opts = {
      gender: document.getElementById('gender')?.value || 'male',
      level: document.getElementById('level')?.value || 'beginner',
      days: Number(document.getElementById('days')?.value || 3),
      goal: document.getElementById('goal-training')?.value || 'hypertrophy',
      emphasis: document.getElementById('emphasis')?.value || 'balanced',
      equipment: getSelectedValues('equip'),
      pain: getSelectedValues('pain')
    };
    try {
      const plan = await generatePlanAI(opts);
      renderPlan(plan);
    } catch(err){
      alert("AI plan generation failed: " + err.message);
    }
  });
}

// safety acknowledgement stored via rehab page (simple)
function initSafetyAck(){
  const viewRehab = document.getElementById('view-rehab');
  if(viewRehab) viewRehab.addEventListener('click', ()=>{
    if(!confirm('This tool provides general education — not medical advice. For red flags seek medical attention. Continue?')) return;
    localStorage.setItem('safety-ok','1');
    alert('Safety acknowledged. You can now generate plans that include rehab exercises.');
  });
}

// initialize all
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadExercises();
  initNav();
  initCalorieCalc();
  initRelief();
  initExport();
  initGenerator();
  initSafetyAck();
  document.querySelectorAll('.skip-link').forEach(s=> s.addEventListener('focus', ()=> s.style.left='12px'));
});

// expose AI generator for console debugging
window.generatePlanAI = generatePlanAI;
