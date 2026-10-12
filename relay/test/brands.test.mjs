import test from 'node:test';
import assert from 'node:assert/strict';
import { brandOptions, normQuery, brandsRoute } from '../src/brands.js';
const P = (brand, name, size, price, extra = {}) => Object.assign({ brand, name, displayName: size, saleType: 'UNITS', singlePrice: { price } }, extra);
test('normQuery', () => { assert.equal(normQuery('  Lemon   Juice! '), 'lemon juice'); assert.equal(normQuery('a'), ''); });
test('distinct brands, phrase first, real prices only, GF from store tag', () => {
  const o = brandOptions([
    P('Pams', 'Lemon Baking Juice', '250ml', 239),
    P('Picky', 'Apple Lemon Honey Juice', '800ml', 649),
    P('Real Foods', 'Lemon Juice', '250ml', 459, { facets: [{ itemDescription: 'Gluten Free' }] }),
    P('Real Foods', 'Lemon Juice', '500ml', 799),
    P('The Limery', 'Pure NZ Lemon Juice', '300ml', 619, { promotions: [{ bestPromotion: true, rewardType: 'NEW_PRICE', rewardValue: 589, cardDependencyFlag: true }] }),
    P('NoPrice', 'Lemon Juice', '1l', undefined),
    P('Other', 'Orange Juice', '1l', 300)
  ], 'lemon juice');
  assert.deepEqual(o.map(x => x.brand), ['Real Foods', 'The Limery', 'NoPrice', 'Pams', 'Picky']);
  assert.equal(o[0].gf, true); assert.equal(o[3].gf, false);
  assert.equal(o[1].promo, 5.89); assert.equal(o[1].club, true);
  assert.equal(o[2].price, null);
});
test('route needs the shared key and a query', async () => {
  assert.equal((await brandsRoute({ key: 'short', q: 'milk' }, {}))[0], 403);
  assert.equal((await brandsRoute({ key: 'k'.repeat(40), q: '' }, {}))[0], 400);
});
