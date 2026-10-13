import assert from 'node:assert/strict';

export async function assertGameRules(page,panel) {
 const button=page.locator(`${panel} [data-game-rules]`);
 assert.equal(await button.count(),1,'one shared rules action');
 const before=await page.locator(panel).boundingBox();
 await button.click();
 const tip=page.locator('.game-rules-tooltip');await tip.waitFor();
 assert.ok((await tip.innerText()).length>0);
 const rect=await tip.boundingBox(),viewport=page.viewportSize();
 assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=viewport.width+1&&rect.y+rect.height<=viewport.height+1,'tooltip stays in viewport');
 assert.deepEqual(await page.locator(panel).boundingBox(),before,'rules reserve no panel space');
 await page.keyboard.press('Escape');await tip.waitFor({state:'detached'});
 assert.equal(await page.locator(panel).isVisible(),true,'Escape dismisses rules before the game');
 await button.click();await tip.waitFor();await button.click();await tip.waitFor({state:'detached'});
 await page.mouse.move(0,0);await button.hover();await tip.waitFor();
 await page.mouse.move(0,0);await tip.waitFor({state:'detached'});
 await button.focus();await page.keyboard.press('Enter');await tip.waitFor();
 await page.locator(`${panel} h2`).click();await tip.waitFor({state:'detached'});
}
