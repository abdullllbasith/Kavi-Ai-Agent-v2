const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const toast = (message) => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };

const views = { chat: ['chatView', 'Agent Workspace'], plans: ['plansView', 'Plans'], memory: ['memoryView', 'Memory'], orders: ['ordersView', 'Orders'] };
$$('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  $$('.nav-item[data-view]').forEach(x => x.classList.toggle('active', x === btn));
  Object.entries(views).forEach(([key, [id]]) => $('#' + id).classList.toggle('hidden', key !== view));
  $('#viewTitle').textContent = views[view][1];
  $('#sidebar').classList.remove('open');
}));

$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#newChat').addEventListener('click', () => { $('#messages').scrollTop = 0; toast('Started a new Kavi conversation'); });

$('#toggleActivity').addEventListener('click', (e) => {
  const list = e.target.closest('.agent-activity').querySelector('.activity-list');
  const hidden = list.classList.toggle('hidden');
  e.target.textContent = hidden ? 'Show' : 'Hide';
});

let pendingProduct = null;
$$('.add').forEach(btn => btn.addEventListener('click', () => {
  pendingProduct = btn.dataset.product;
  $('#confirmProduct').textContent = pendingProduct;
  $('#confirmPrice').textContent = pendingProduct.includes('Headphones') ? 'LKR 4,490' : pendingProduct.includes('Watch') ? 'LKR 4,750' : 'LKR 3,990';
  $('#confirmModal').classList.remove('hidden');
}));
const closeModal = () => { $('#confirmModal').classList.add('hidden'); pendingProduct = null; };
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);
$('#confirmAction').addEventListener('click', () => { const product = pendingProduct; closeModal(); toast(`${product} added — authorization confirmed`); });

$('#sendMessage').addEventListener('click', sendMessage);
$('#messageInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
function sendMessage() {
  const input = $('#messageInput'); const value = input.value.trim(); if (!value) return;
  const row = document.createElement('div'); row.className = 'message user'; row.innerHTML = `<div class="message-avatar" style="background:#242a34;color:#d9dfe8">AB</div><div><div class="message-meta">You <span>just now</span></div><div class="bubble">${escapeHtml(value)}</div></div>`;
  $('#messages').appendChild(row); input.value = ''; toast('Kavi received your request');
  setTimeout(() => { const reply = document.createElement('div'); reply.className = 'message assistant'; reply.innerHTML = `<div class="message-avatar">K</div><div><div class="message-meta">Kavi <span>just now</span></div><div class="bubble">Got it. I’ll turn that into a goal, check the relevant constraints, and work through the best next action.</div></div>`; $('#messages').appendChild(reply); reply.scrollIntoView({ behavior:'smooth', block:'center' }); }, 650);
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

$('#createPlan').addEventListener('click', () => toast('New plan creation will connect to the agent planner')); 
$$('.memory-row>button').forEach(btn => btn.addEventListener('click', () => { btn.closest('.memory-row').remove(); toast('Memory removed'); }));
$$('.recent').forEach(btn => btn.addEventListener('click', () => toast(`Opening “${btn.textContent}”`)));
