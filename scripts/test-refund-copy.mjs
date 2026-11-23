import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('FAQ omits all Back to Questions return links',()=>{
  const html=read('faq/index.html');
  assert.doesNotMatch(html,/Back to Questions|href="#questions"/);
  assert.match(html,/id="questions"/);
});
test('FAQ exposes refund request and deadline questions in its navigation',()=>{
  const html=read('faq/index.html');
  for(const id of ['refund-request','refund-deadline']){
    assert.match(html,new RegExp(`href="#${id}"`));
    assert.match(html,new RegExp(`id="${id}"`));
  }
});
for(const file of ['faq/index.html','refunds/index.html'])test(`${file} gives actionable requests and qualified deadlines`,()=>{
  const html=read(file);
  assert.match(html,/Paddle\.net<\/a> and choose Request refund/);
  assert.match(html,/billing email.*receipt or transaction reference/);
  assert.match(html,/within 14 days of the transaction date for a discretionary refund/);
  assert.match(html,/Approval is not guaranteed/);
  assert.match(html,/Statutory withdrawal and defect rights may have different deadlines and take precedence/);
  assert.match(html,/https:\/\/www\.paddle\.com\/legal\/refund-policy/);
  assert.doesNotMatch(html,/guaranteed refund within 14 days|all refunds are automatically approved/i);
});
test('edited refund policy carries its actual revision date',()=>{
  assert.match(read('refunds/index.html'),/Last updated November 23, 2026/);
});
