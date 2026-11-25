import { describe, expect, it } from 'vitest';
import { TenantNotActiveError, tenantContextForInstallation } from '../src/index.js';

describe('tenantContextForInstallation (INV-1, TEN-005, TEN-006)', () => {
  it('builds a context for an active installation', () => {
    const ctx = tenantContextForInstallation(
      { tenantId: 't-1', installationId: 1, status: 'active' },
      'worker-1',
    );
    expect(ctx).toEqual({
      tenantId: 't-1',
      installationId: 1,
      actor: { type: 'app', id: 'worker-1' },
    });
  });

  it.each(['suspended', 'removed'] as const)('refuses a %s installation: no tenant context, no access', (status) => {
    expect(() =>
      tenantContextForInstallation({ tenantId: 't-2', installationId: 2, status }, 'worker-1'),
    ).toThrow(TenantNotActiveError);
  });
});
