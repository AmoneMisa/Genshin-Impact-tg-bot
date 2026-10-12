import assert from 'node:assert/strict';

export async function assertItemGrid(page) {
  await page.locator('.item-grid').first().waitFor({state: 'visible'});
  await page.waitForFunction(() => [...document.querySelectorAll('.item-grid')].every(grid =>
    grid.children.length % getComputedStyle(grid).gridTemplateColumns.split(' ').length === 0));
  const grids = await page.evaluate(() => [...document.querySelectorAll('.item-grid')].map(grid => {
    const style = getComputedStyle(grid);
    const cells = [...grid.children];
    return {gap: style.gap, padding: style.padding, background: style.backgroundColor,
      overflow: grid.scrollWidth > grid.clientWidth + 1,
      invalid: cells.filter(cell => {
        const box = cell.getBoundingClientRect(), css = getComputedStyle(cell);
        return Math.abs(box.width - box.height) > 1 || css.borderRadius !== '0px'
          || css.backgroundImage !== 'none' || !cell.classList.contains('item-grid-cell');
      }).length};
  }));
  assert.ok(grids.length > 0);
  for (const grid of grids) assert.deepEqual(grid,
    {gap: '0px', padding: '0px', background: 'rgb(16, 19, 15)', overflow: false, invalid: 0});
}
