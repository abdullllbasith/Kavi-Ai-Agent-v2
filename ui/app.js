const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const toast = (message) => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
let sessionReady = false;
let pendingProduct = null;

const views = { chat: ['chatView', 'Agent Workspace'], plans: ['plansView', 'Plans'], memory: ['memoryView', 'Memory'], orders: ['ordersView', 'Orders'] };
$$('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  $$('.nav-item[data-view]').forEach(x => x.classList.toggle('active', x === btn));
  Object.entries(views).forEach(([key, [id]]) => $('#' + id).classList.toggle('hidden', key !== view));
  $('#viewTitle').textContent = views[view][1]; $('#sidebar').classList.remove('open');
}));
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#newChat').addEventListener('click', () => { $('#messages').innerHTML = ''; pendingProduct = null; toast('Started a new Kavi conversation'); });
$('#toggleActivity').addEventListener('click', (e) => { const list = e.target.closest('.agent-activity').querySelector('.activity-list'); const hidden = list.classList.toggle('hidden'); e.target.textContent = hidden ? 'Show' : 'Hide'; });

async function ensureSession() {
  if (sessionReady) return;
  const response = await fetch('/api/session', { method: 'GET', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Could not establish a secure session.');
  sessionReady = true;
}

async function sendMessage(messageOverride) {
  const input = $('#messageInput'); const value = (messageOverride ?? input.value).trim(); if (!value) return;
  appendMessage('user', value); input.value = ''; setAgentBusy(true);
  try {
    await ensureSession();
    const response = await fetch('/api/chat', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: value }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Kavi could not process the request.');
    renderAgentState(payload.state);
  } catch (error) { appendMessage('assistant', error instanceof Error ? error.message : 'Kavi could not process the request.'); toast('Request failed safely'); }
  finally { setAgentBusy(false); }
}

function appendMessage(role, text) {
  const row = document.createElement('div'); row.className = `message ${role}`;
  const avatar = role === 'assistant' ? 'K' : 'AB';
  row.innerHTML = `<div class="message-avatar">${avatar}</div><div><div class="message-meta">${role === 'assistant' ? 'Kavi' : 'You'} <span>just now</span></div><div class="bubble">${escapeHtml(text)}</div></div>`;
  $('#messages').appendChild(row); row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderAgentState(state) {
  if (state.goal) {
    const title = document.querySelector('.goal-content strong'); if (title) title.textContent = state.goal.objective;
    const criteria = document.querySelector('.criteria'); if (criteria) criteria.innerHTML = state.goal.successCriteria.map((x, i) => `<span>${i < state.observations.length ? '✓' : '●'} ${escapeHtml(x)}</span>`).join('');
  }
  const status = state.status.replaceAll('_', ' ');
  if (state.pendingQuestion) appendMessage('assistant', state.pendingQuestion);
  else if (state.status === 'completed') appendMessage('assistant', state.lastEvaluation?.reason || 'Your goal is complete.');
  else if (state.status === 'failed') appendMessage('assistant', state.lastEvaluation?.reason || 'I could not complete the goal safely.');
  else appendMessage('assistant', `I’m ${status}. ${state.lastEvaluation?.reason || 'I’m continuing with the next safe step.'}`);
  updateContext(state);
}

function updateContext(state) {
  const progress = state.goal ? Math.round(Math.min(1, state.observations.length / Math.max(1, state.goal.successCriteria.length)) * 100) : 0;
  const label = document.querySelector('.context-section .section-title span'); if (label) label.textContent = `${progress}%`;
  const bar = document.querySelector('.progress i'); if (bar) bar.style.width = `${progress}%`;
  const checks = $$('.check-item'); (state.goal?.successCriteria || []).forEach((criterion, i) => { if (checks[i]) { checks[i].classList.toggle('done', i < state.observations.length); checks[i].classList.toggle('active', i === state.observations.length); checks[i].lastChild.textContent = ` ${criterion}`; } });
}

function setAgentBusy(busy) { document.querySelector('.online').textContent = busy ? 'Agent working' : 'Agent online'; document.querySelector('.status-dot').classList.toggle('busy', busy); }
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

$$('.add').forEach(btn => btn.addEventListener('click', () => { pendingProduct = btn.dataset.product; $('#confirmProduct').textContent = pendingProduct; $('#confirmPrice').textContent = pendingProduct.includes('Headphones') ? 'LKR 4,490' : pendingProduct.includes('Watch') ? 'LKR 4,750' : 'LKR 3,990'; $('#confirmModal').classList.remove('hidden'); }));
const closeModal = () => { $('#confirmModal').classList.add('hidden'); pendingProduct = null; };
$('#closeModal').addEventListener('click', closeModal); $('#cancelModal').addEventListener('click', closeModal);
$('#confirmAction').addEventListener('click', async () => { const product = pendingProduct; closeModal(); await sendMessage(`Add ${product} to my cart. I confirm this exact action.`); });
$('#sendMessage').addEventListener('click', () => sendMessage());
$('#messageInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
$('#createPlan').addEventListener('click', () => toast('Plans are created through the Kavi agent workspace.'));
$$('.memory-row>button').forEach(btn => btn.addEventListener('click', () => { btn.closest('.memory-row').remove(); toast('Memory removed from this UI view'); }));
$$('.recent').forEach(btn => btn.addEventListener('click', () => { $('#messageInput').value = btn.textContent; $('#messageInput').focus(); }));
ensureSession().catch(() => toast('Secure session will be created when you send a message.'));
