// Smart Study Planner - uses localStorage to persist tasks
const STORAGE_KEY = 'smart_study_planner.tasks.v1';

function uid() {
  return Math.random().toString(36).slice(2,9);
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    console.error('Failed to load tasks', e);
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  const tasks = loadTasks().sort((a,b)=> new Date(a.due||0)-new Date(b.due||0));
  tasks.forEach(task=>{
    const li = document.createElement('li');
    li.className = 'task';
    const left = document.createElement('div'); left.className='left';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!task.done; cb.className='checkbox';
    cb.addEventListener('change', ()=>{ task.done = cb.checked; saveTasks(tasks); renderTasks(); });
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML = `<strong>${escapeHtml(task.title)}</strong><div>${escapeHtml(task.subject || '')} ${task.due ? '— due ' + formatDateTime(task.due) : ''}</div>`;
    left.appendChild(cb); left.appendChild(meta);
    const right = document.createElement('div');
    const tag = document.createElement('span'); tag.className = 'tag ' + (task.priority||'medium'); tag.textContent = task.priority || 'medium';
    const del = document.createElement('button'); del.textContent='Delete'; del.style.marginLeft='8px';
    del.addEventListener('click', ()=>{ if(confirm('Delete this task?')){ const all = loadTasks().filter(t=>t.id!==task.id); saveTasks(all); renderTasks(); }});
    right.appendChild(tag); right.appendChild(del);
    li.appendChild(left); li.appendChild(right);
    list.appendChild(li);
  });
  renderTimeline(tasks);
}

function renderTimeline(tasks) {
  const grid = document.getElementById('timelineGrid');
  grid.innerHTML = '';
  const now = new Date();
  const days = [];
  for(let i=0;i<7;i++){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i);
    days.push(d);
    const div = document.createElement('div'); div.className='day';
    div.innerHTML = '<strong>'+d.toLocaleDateString()+'</strong>';
    const dayTasks = tasks.filter(t=>t.due && sameDay(new Date(t.due), d));
    dayTasks.forEach(t=>{
      const p = document.createElement('div');
      p.textContent = (t.dueTime ? t.dueTime + ' — ' : '') + t.title;
      p.style.fontSize = '0.9rem';
      div.appendChild(p);
    });
    grid.appendChild(div);
  }
}

function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function formatDateTime(d){ const dt = new Date(d); return dt.toLocaleString(); }

function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.getElementById('taskForm').addEventListener('submit', e=>{
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  if(!title) return alert('Please enter a title');
  const subject = document.getElementById('subject').value.trim();
  const dueDate = document.getElementById('dueDate').value;
  const dueTime = document.getElementById('dueTime').value;
  let due = null;
  if(dueDate){
    due = dueDate + (dueTime ? 'T'+dueTime : '');
  }
  const priority = document.getElementById('priority').value;
  const reminder = document.getElementById('reminder').checked;
  const tasks = loadTasks();
  const task = { id: uid(), title, subject, due, dueTime, priority, reminder, created: new Date().toISOString(), done:false };
  tasks.push(task);
  saveTasks(tasks);
  document.getElementById('taskForm').reset();
  renderTasks();
  if(reminder) scheduleReminder(task);
});

function scheduleReminder(task){
  // reminder works only while page is open. Request permission first.
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default') Notification.requestPermission();
  if(Notification.permission !== 'granted') return;
  if(!task.due) return;
  const dueMs = new Date(task.due).getTime();
  const now = Date.now();
  const ms = dueMs - now;
  if(ms <= 0) return;
  setTimeout(()=> {
    new Notification('Study Reminder', { body: task.title + (task.subject ? ' — '+task.subject : '') });
  }, Math.min(ms, 24*60*60*1000)); // clamp to 24h to avoid very long timeouts
}

function initReminders(){
  const tasks = loadTasks();
  tasks.forEach(t=> { if(t.reminder) scheduleReminder(t); });
}

// Export/Import
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const data = localStorage.getItem(STORAGE_KEY) || '[]';
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'smart_study_planner_export.json'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importFile').addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try {
      const parsed = JSON.parse(reader.result);
      if(Array.isArray(parsed)){
        saveTasks(parsed);
        renderTasks();
        alert('Imported '+parsed.length+' tasks');
      } else {
        alert('Invalid file: expected an array of tasks');
      }
    } catch(err){
      alert('Failed to import: '+err);
    }
  };
  reader.readAsText(f);
});

window.addEventListener('load', ()=>{ renderTasks(); initReminders(); });


// Dark Mode Toggle
document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const btn = document.getElementById("themeToggle");
    if (document.body.classList.contains("dark-mode")) {
        btn.textContent = "☀️ Light Mode";
    } else {
        btn.textContent = "🌙 Dark Mode";
    }
});


// Request notification permission on load
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function scheduleNotification(task, time) {
    const taskTime = new Date(time).getTime();
    const now = new Date().getTime();
    const delay = taskTime - now;

    if (delay > 0) {
        setTimeout(() => {
            if (Notification.permission === "granted") {
                new Notification("⏰ Task Reminder", {
                    body: `Time to study: ${task}`,
                });
            }
        }, delay);
    }
}

// Hook into task addition button
const addTaskBtn = document.getElementById("addTaskBtn");
if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => {
        const taskInput = document.getElementById("taskInput").value;
        const taskTime = document.getElementById("taskTime").value;
        if (taskInput && taskTime) {
            scheduleNotification(taskInput, taskTime);
        }
    });
}
