import type { TenantContext } from '@parmana/tenant-context';
import type { UnitOfWork } from './stores.js';

export class RepositoryAccessDeniedError extends Error {
  readonly code = 'repository_access_denied';
  constructor(readonly githubRepoId: number) {
    super(`repository ${githubRepoId} is not accessible to this tenant`);
    this.name = 'RepositoryAccessDeniedError';
  }
}

/**
 * Selected-repository enforcement (GH-003, GH-014). Call before any GitHub read
 * or write for a repository. A repository outside the tenant's active inventory
 * is refused before any API request is made.
 */
export async function assertRepositoryAccess(uow: UnitOfWork, ctx: TenantContext, githubRepoId: number): Promise<void> {
  const active = await uow.runForTenant(ctx.tenantId, (tx) => tx.isRepositoryActive(ctx.tenantId, githubRepoId));
  if (!active) {
    throw new RepositoryAccessDeniedError(githubRepoId);
  }
}
