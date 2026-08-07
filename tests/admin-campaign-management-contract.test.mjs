import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('campaign schema supports the complete admin lifecycle without a delete path', async () => {
  const schema = await source('db/schema.sql');

  assert.match(schema, /status text NOT NULL DEFAULT 'draft' CHECK \(status IN \('draft', 'recruiting', 'active', 'closed'\)\)/);
  assert.doesNotMatch(schema, /DELETE FROM campaigns/i);
});

test('admin campaign domain exposes typed mutation interfaces', async () => {
  const [types, domain] = await Promise.all([
    source('src/lib/types.ts'),
    source('src/lib/creator-campaigns.ts'),
  ]);

  for (const typeName of ['AdminCampaignInput', 'AdminCampaignStatus', 'AdminParticipationAction']) {
    assert.match(types, new RegExp(`export type ${typeName}\\b`));
  }

  for (const functionName of [
    'listAdminCampaigns',
    'getAdminCampaign',
    'createAdminCampaign',
    'updateAdminCampaign',
    'setAdminCampaignStatus',
    'transitionParticipationAsAdmin',
  ]) {
    assert.match(domain, new RegExp(`export async function ${functionName}\\b`));
  }
});

test('admin participation transitions lock rows and persist an event in their transaction', async () => {
  const domain = await source('src/lib/creator-campaigns.ts');
  const match = domain.match(/export async function transitionParticipationAsAdmin[\s\S]*?(?=\nexport async function|\n$)/);

  assert.ok(match, 'transitionParticipationAsAdmin must exist');
  assert.match(match[0], /withDatabaseTransaction/);
  assert.match(match[0], /campaign_participations[\s\S]*FOR UPDATE/);
  assert.match(match[0], /insertCampaignEvent/);
});
