import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto('file:///root/artemis-lunar-siege/index.html');
await pg.waitForTimeout(600);
await pg.screenshot({ path: '/tmp/s1_menu.png' });

// manual
await pg.click('#btn-manual'); await pg.waitForTimeout(300);
await pg.screenshot({ path: '/tmp/s2_manual.png' });
await pg.click('#btn-manual-back');

// korean toggle
await pg.click('#lang button[data-l="ko"]'); await pg.waitForTimeout(200);
await pg.screenshot({ path: '/tmp/s3_ko.png' });
await pg.click('#lang button[data-l="en"]');

// start + play with movement
await pg.click('#btn-start');
for (const k of ['d','s','a','w']) { await pg.keyboard.down(k); await pg.waitForTimeout(900); await pg.keyboard.up(k); }
await pg.waitForTimeout(1500);
await pg.screenshot({ path: '/tmp/s4_play.png' });

// force a level up, take all three cards a few times
async function drain(page, shot) {
  let n = 0;
  while (await page.evaluate(() => MODE) === 'levelup' && n < 80) {
    if (shot && n === 0) { await page.screenshot({ path: shot }); }
    await page.keyboard.press(String(1 + (n % 3)));
    await page.waitForTimeout(90); n++;
  }
  return n;
}
for (let i = 0; i < 6; i++) {
  await pg.evaluate(() => gainXP(120));
  await pg.waitForTimeout(150);
  await drain(pg, i === 0 ? '/tmp/s5_levelup.png' : null);
}
console.log('mode after draining levelups:', await pg.evaluate(() => MODE));
await pg.waitForTimeout(1200);
await pg.screenshot({ path: '/tmp/s6_loaded.png' });
console.log('loadout:', await pg.evaluate(() => JSON.stringify({ w: G.weapons, p: G.passives, lv: G.p.lv })));

// jump to harvester
await pg.evaluate(() => { G.t = 598; });
await pg.waitForTimeout(2500);
console.log('boss after 10min:', await pg.evaluate(() => G.boss && G.boss.kind));
await pg.screenshot({ path: '/tmp/s7_harvester.png' });

// force legendary availability + monarch
await pg.evaluate(() => {
  for (const k in WEAPONS) { if (!G.weapons[k]) addWeapon(k); G.weapons[k].lv = 8; }
  for (const k in PASSIVES) G.passives[k] = 5;
  recalc(); G.boss = null; G.harvDone = true; G.t = 899.5;
});
await pg.waitForTimeout(2500);
console.log('boss after 15min:', await pg.evaluate(() => G.boss && G.boss.kind));
console.log('enemies:', await pg.evaluate(() => G.E.length), 'kills:', await pg.evaluate(() => G.kills));
await pg.screenshot({ path: '/tmp/s8_monarch.png' });

// legendary card check
await pg.evaluate(() => gainXP(200));
await pg.waitForTimeout(200);
console.log('legendary card offered:', await pg.evaluate(() => CARDS.some(c => c.k === 'leg')), JSON.stringify(await pg.evaluate(() => CARDS)));
await pg.screenshot({ path: '/tmp/s9_legendary.png' });
await drain(pg, null);
console.log('legendary taken:', await pg.evaluate(() => Object.keys(G.weapons).filter(k => G.weapons[k].leg)));
await pg.waitForTimeout(900);
await pg.screenshot({ path: '/tmp/s9b_legfx.png' });

// kill monarch -> win screen
await pg.evaluate(() => { damageBoss(999999); });
await pg.waitForTimeout(400);
console.log('mode:', await pg.evaluate(() => MODE), 'end:', await pg.evaluate(() => G.end));
await pg.screenshot({ path: '/tmp/s10_win.png' });

// fps probe
await pg.click('#btn-again');
await pg.evaluate(() => { for (let i = 0; i < 300; i++) mkEnemy('crawler'); });
const fps = await pg.evaluate(() => new Promise(r => { let n = 0, t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); };
  requestAnimationFrame(f); }));
console.log('fps with 300 enemies:', fps);

// lose condition
await pg.evaluate(() => { G.base.hp = 0.1; damageBase(1); });
await pg.waitForTimeout(300);
console.log('lose mode:', await pg.evaluate(() => MODE), await pg.evaluate(() => G.end));
await pg.screenshot({ path: '/tmp/s11_lose.png' });

// mobile viewport
const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
m.on('pageerror', e => errs.push('MOBILE PAGEERROR: ' + e.message));
await m.goto('file:///root/artemis-lunar-siege/index.html');
await m.waitForTimeout(500); await m.screenshot({ path: '/tmp/m1_menu.png' });
await m.click('#btn-start'); await m.waitForTimeout(400);
await m.touchscreen.tap(200, 600);
await m.evaluate(() => gainXP(60)); await m.waitForTimeout(300);
await m.screenshot({ path: '/tmp/m2_levelup.png' });
await drain(m, null); await m.waitForTimeout(800);
await m.screenshot({ path: '/tmp/m3_play.png' });

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
await b.close();
