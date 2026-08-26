export const ADMIN_PAGE_SIZE = 20;

export function adminPageMeta(total: number, requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  const start = total === 0 ? 0 : (currentPage - 1) * ADMIN_PAGE_SIZE + 1;
  const end = total === 0 ? 0 : Math.min(total, currentPage * ADMIN_PAGE_SIZE);

  return {
    currentPage,
    totalPages,
    start,
    end,
    pages: Array.from({ length: totalPages }, (_, index) => index + 1),
  };
}

export function paginateAdminItems<T>(items: T[], requestedPage: number) {
  const { start, end } = adminPageMeta(items.length, requestedPage);
  return start === 0 ? [] : items.slice(start - 1, end);
}

export function reconcilePageSelection(
  selectedIds: Iterable<string>,
  currentPageIds: Iterable<string>,
  removedIds: Iterable<string> = [],
) {
  const page = new Set(currentPageIds);
  const removed = new Set(removedIds);
  return [...selectedIds].filter((id) => page.has(id) && !removed.has(id));
}

export function isAdminCatalogueCreator(creator: { onboarding_source: string }) {
  return creator.onboarding_source === "admin";
}

export function isCreatorApprovalApplication(creator: {
  onboarding_source: string;
  user_id: string | null;
  approval_status: string;
}) {
  return creator.onboarding_source === "self_registered"
    && Boolean(creator.user_id)
    && creator.approval_status === "pending";
}
