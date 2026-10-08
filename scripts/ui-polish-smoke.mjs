/* global process, console, URL, document, innerWidth, innerHeight */
// Uses an existing Playwright installation without adding an application dependency.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:4173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Only a local app is permitted');
const out = 'docs/evidence/m1-ui-polish'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const user = { id: 'u1', name: 'Ana Silva', email: 'ana@example.test' };
const organization = { id: 'o1', name: 'Equipe de homologação' };
const permissions = ['conversations.read', 'conversations.assign', 'conversations.transfer', 'conversations.supervise', 'conversations.archive', 'contacts.read', 'messages.read', 'messages.send', 'notes.read', 'notes.create', 'tags.read', 'tags.manage'];
const long = 'NomeMuitoLongoSemEspacos'.repeat(5);
const contact = { id: 'c1', name: long, primaryIdentifier: `${long}@example.test` };
const conversation = { id: 'conv1', contactId: 'c1', contactName: long, lastMessagePreview: long, provider: 'DEMO', tagIds: ['t1'], status: 'OPEN', assignedUserId: null, archivedAt: null, createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', lastMessageAt: '2026-10-08T00:00:00Z', visibility: 'FULL' };
const members = Array.from({ length: 30 }, (_, i) => ({ userId: `u${i + 2}`, name: `${long} ${i}`, email: `${long}${i}@example.test`, status: 'ACTIVE', canReceiveAssignment: true }));
const pageData = (items) => ({ items, nextCursor: null });
const results = [];
try {
  for (const [width, height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844]]) {
    const page = await browser.newPage({ viewport: { width, height } }); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/v1/')) {
        const path = url.pathname.slice(7); let data;
        if (path === '/me') data = { user, currentOrganizationId: 'o1', csrfToken: 'local-test' };
        else if (path === '/me/organizations') data = { organizations: [organization] };
        else if (path === '/app/bootstrap') data = { user, organization, membership: { id: 'm1', role: 'test', consumesSeat: true }, permissions };
        else if (path === '/conversations') data = pageData([conversation]);
        else if (path === '/conversations/conv1') data = conversation;
        else if (path === '/contacts/c1') data = contact;
        else if (path === '/tags') data = pageData([{ id: 't1', name: long }, { id: 't2', name: long }]);
        else if (path === '/team/members') data = pageData(members);
        else if (path.endsWith('/notes')) data = pageData([{ id: 'n1', authorUserId: 'u1', body: long, createdAt: conversation.createdAt }]);
        else if (path.endsWith('/messages')) data = pageData(Array.from({ length: 20 }, (_, i) => ({ id: `msg${i}`, conversationId: 'conv1', direction: i % 2 ? 'OUTBOUND' : 'INBOUND', senderUserId: i % 2 ? 'u1' : null, body: long, status: 'SENT', type: 'TEXT', createdAt: conversation.createdAt })));
        else throw new Error(`Unexpected mocked API: ${path}`);
        return route.fulfill({ json: data });
      }
      if (url.origin !== new URL(base).origin) return route.abort();
      return route.continue();
    });
    await page.routeWebSocket('**/*', socket => socket.close());
    await page.goto(`${base}/app/conversations/conv1`); await page.getByRole('textbox', { name: 'Escrever mensagem' }).waitFor();
    if (width <= 1050) await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
    const combo = page.getByRole('combobox', { name: 'Atribuir a uma pessoa' }); await combo.click();
    await page.getByRole('listbox').waitFor();
    const metrics = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      const context = document.querySelector('.conversation-context'); const history = document.querySelector('.message-history');
      return { viewport: [innerWidth, innerHeight], documentOverflow: document.documentElement.scrollWidth > innerWidth, contextOverflow: context.scrollWidth > context.clientWidth, dropdown: rect('.user-select-popup'), send: rect('.message-composer .primary-button'), history: rect('.message-history'), historyScrollable: history.scrollHeight > history.clientHeight };
    });
    const d = metrics.dropdown; const s = metrics.send;
    if (metrics.documentOverflow || metrics.contextOverflow || d.x < 0 || d.right > width || d.y < 0 || d.bottom > height || s.bottom > height - (width <= 720 ? 62 : 0) || metrics.history.height < 100 || errors.length) throw new Error(JSON.stringify({ width, height, metrics, errors }));
    await page.screenshot({ path: `${out}/${width}x${height}.png`, fullPage: true });
    await combo.press('Escape'); await combo.press('ArrowDown'); await combo.press('Enter');
    if (await combo.getAttribute('aria-expanded') !== 'false') throw new Error('Keyboard selection did not close');
    results.push({ width, height, ...metrics, errors }); await page.close();
  }
  writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
