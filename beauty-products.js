export const PAGE_SIZE = 10;

const image = (filename) => `/assets/beauty-products/${filename}`;

export const BEAUTY_PRODUCTS = [
  { id: 'barrier-recovery-serum', name: 'Barrier Recovery Serum', category: 'skincare', categoryLabel: 'SKINCARE · SERUM', markets: ['VN', 'TW', 'US'], keywords: ['수분 장벽', '민감 피부', '데일리 루틴'], formats: ['Routine Reel', 'Before & After'], slots: 12, image: image('barrier-serum.webp'), description: '가볍게 흡수되는 수분 장벽 세럼으로 데일리 루틴과 사용 전후 비교 콘텐츠에 적합합니다.' },
  { id: 'daily-sun-fluid-spf', name: 'Daily Sun Fluid SPF', category: 'skincare', categoryLabel: 'SKINCARE · SUNCARE', markets: ['VN', 'TW'], keywords: ['산뜻한 마무리', '야외 테스트', 'GRWM'], formats: ['Outdoor Test', 'GRWM'], slots: 8, image: image('daily-sun-fluid.webp'), description: '백탁과 끈적임을 줄인 데일리 선 플루이드로 야외 테스트 콘텐츠에 어울립니다.' },
  { id: 'skin-fit-cushion', name: 'Skin Fit Cushion', category: 'makeup', categoryLabel: 'MAKEUP · BASE', markets: ['VN', 'TW', 'US'], keywords: ['얇은 밀착', '세미 글로우', '룩 매칭'], formats: ['Half-face Test', 'GRWM'], slots: 15, image: image('skin-fit-cushion.webp'), description: '얇고 정돈된 피부 표현을 위한 쿠션으로 반쪽 얼굴 테스트와 룩 매칭에 적합합니다.' },
  { id: 'layering-rose-lip-tint', name: 'Layering Rose Lip Tint', category: 'makeup', categoryLabel: 'MAKEUP · LIP', markets: ['VN', 'TW'], keywords: ['레이어링 발색', '퍼스널 컬러', '숏폼'], formats: ['Color Swatch', 'Short-form'], slots: 20, image: image('rose-lip-tint.webp'), description: '한 번과 여러 번 발랐을 때 다른 무드를 만드는 로즈 립 틴트입니다.' },
  { id: 'cooling-hydrogel-eye-patch', name: 'Cooling Hydrogel Eye Patch', category: 'skincare', categoryLabel: 'SKINCARE · EYE CARE', markets: ['US', 'TW'], keywords: ['쿨링 케어', '촬영 준비', '트래블'], formats: ['Prep Routine', 'Travel Reel'], slots: 10, image: image('hydrogel-eye-patch.webp'), description: '촬영 전 눈가 컨디션을 빠르게 정돈하는 하이드로겔 아이 패치입니다.' },
  { id: 'scalp-balance-ampoule', name: 'Scalp Balance Ampoule', category: 'hair-body', categoryLabel: 'HAIR · SCALP', markets: ['VN', 'US'], keywords: ['두피 루틴', '장기 사용', '헤어'], formats: ['Scalp Routine', 'Diary Review'], slots: 6, image: image('scalp-care-ampoule.webp'), description: '두피에 직접 사용하는 가벼운 앰플로 헤어 루틴과 장기 사용 기록에 적합합니다.' },
  { id: 'peptide-firming-cream', name: 'Peptide Firming Cream', category: 'skincare', categoryLabel: 'SKINCARE · CREAM', markets: ['TW', 'US'], keywords: ['탄력 케어', '나이트 루틴', '리치 텍스처'], formats: ['Night Routine', 'Texture Review'], slots: 9, image: image('beauty-product-collection-a.webp'), sprite: { x: 0, y: 0 }, description: '밀도 있는 제형과 탄력 케어 포인트를 보여주는 나이트 크림입니다.' },
  { id: 'cica-cloud-cleanser', name: 'Cica Cloud Cleanser', category: 'skincare', categoryLabel: 'SKINCARE · CLEANSER', markets: ['VN', 'TW'], keywords: ['저자극 세안', '거품 텍스처', '민감 피부'], formats: ['Wash Test', 'Routine Reel'], slots: 14, image: image('beauty-product-collection-a.webp'), sprite: { x: 1, y: 0 }, description: '부드러운 거품과 세안 후 당김을 비교하기 좋은 약산성 클렌저입니다.' },
  { id: 'vitamin-glow-ampoule', name: 'Vitamin Glow Ampoule', category: 'skincare', categoryLabel: 'SKINCARE · AMPOULE', markets: ['VN', 'US'], keywords: ['광채', '칙칙함 케어', '모닝 루틴'], formats: ['Glow Check', 'Morning GRWM'], slots: 11, image: image('beauty-product-collection-a.webp'), sprite: { x: 2, y: 0 }, description: '맑은 광채와 피부 톤 변화를 중심으로 소개하는 데일리 앰플입니다.' },
  { id: 'rice-milk-toner', name: 'Rice Milk Toner', category: 'skincare', categoryLabel: 'SKINCARE · TONER', markets: ['VN', 'TW', 'US'], keywords: ['결 정돈', '레이어링', 'K-원료'], formats: ['Layering Routine', 'Ingredient Story'], slots: 18, image: image('beauty-product-collection-a.webp'), sprite: { x: 3, y: 0 }, description: '쌀 유래 성분과 여러 번 덧바르는 사용법을 보여주기 좋은 토너입니다.' },
  { id: 'probiotic-sleeping-mask', name: 'Probiotic Sleeping Mask', category: 'skincare', categoryLabel: 'SKINCARE · MASK', markets: ['TW', 'US'], keywords: ['수면팩', '다음 날 피부', '나이트'], formats: ['Overnight Test', 'Morning Check'], slots: 7, image: image('beauty-product-collection-a.webp'), sprite: { x: 0, y: 1 }, description: '잠들기 전과 다음 날 아침 피부 변화를 연결하는 슬리핑 마스크입니다.' },
  { id: 'pore-reset-clay-stick', name: 'Pore Reset Clay Stick', category: 'skincare', categoryLabel: 'SKINCARE · PORE', markets: ['VN', 'TW'], keywords: ['모공 케어', '간편 도포', '피지'], formats: ['Close-up Test', 'Satisfying Reel'], slots: 16, image: image('beauty-product-collection-a.webp'), sprite: { x: 1, y: 1 }, description: '간편한 스틱 도포와 세정 장면이 숏폼에 잘 드러나는 클레이 마스크입니다.' },
  { id: 'marine-water-gel', name: 'Marine Water Gel', category: 'skincare', categoryLabel: 'SKINCARE · GEL', markets: ['VN', 'US'], keywords: ['쿨링 수분', '젤 텍스처', '여름'], formats: ['Texture Reel', 'Summer Routine'], slots: 13, image: image('beauty-product-collection-a.webp'), sprite: { x: 2, y: 1 }, description: '시원한 젤 텍스처와 빠른 흡수를 강조하는 여름용 수분 젤입니다.' },
  { id: 'ceramide-body-lotion', name: 'Ceramide Body Lotion', category: 'hair-body', categoryLabel: 'BODY · LOTION', markets: ['TW', 'US'], keywords: ['바디 장벽', '무향', '데일리'], formats: ['Body Routine', 'Texture Review'], slots: 8, image: image('beauty-product-collection-a.webp'), sprite: { x: 3, y: 1 }, description: '건조한 바디 피부의 장벽 루틴을 소개하기 좋은 무향 로션입니다.' },
  { id: 'velvet-air-blush', name: 'Velvet Air Blush', category: 'makeup', categoryLabel: 'MAKEUP · BLUSH', markets: ['VN', 'TW', 'US'], keywords: ['소프트 포커스', '레이어링', '컬러'], formats: ['Color Swatch', 'Full Look'], slots: 17, image: image('beauty-product-collection-b.webp'), sprite: { x: 0, y: 0 }, description: '얇게 겹쳐 바르는 컬러와 소프트 포커스 효과를 보여주는 블러셔입니다.' },
  { id: 'brow-detail-pencil', name: 'Brow Detail Pencil', category: 'makeup', categoryLabel: 'MAKEUP · BROW', markets: ['VN', 'TW'], keywords: ['초슬림', '결 표현', '지속력'], formats: ['Brow Tutorial', 'Wear Test'], slots: 12, image: image('beauty-product-collection-b.webp'), sprite: { x: 1, y: 0 }, description: '눈썹 결을 한 올씩 표현하는 초슬림 브로우 펜슬입니다.' },
  { id: 'glass-skin-primer', name: 'Glass Skin Primer', category: 'makeup', categoryLabel: 'MAKEUP · PRIMER', markets: ['TW', 'US'], keywords: ['광채 베이스', '밀착', '메이크업 전'], formats: ['Base Prep', 'Half-face Test'], slots: 10, image: image('beauty-product-collection-b.webp'), sprite: { x: 2, y: 0 }, description: '메이크업 전 피부 광채와 밀착 차이를 비교하기 좋은 프라이머입니다.' },
  { id: 'soft-matte-lip-mousse', name: 'Soft Matte Lip Mousse', category: 'makeup', categoryLabel: 'MAKEUP · LIP', markets: ['VN', 'US'], keywords: ['블러 립', '고발색', '트랜스퍼'], formats: ['Lip Swatch', 'Transfer Test'], slots: 22, image: image('beauty-product-collection-b.webp'), sprite: { x: 3, y: 0 }, description: '가벼운 무스 텍스처와 선명한 블러 효과를 보여주는 립 컬러입니다.' },
  { id: 'micro-fix-mascara', name: 'Micro Fix Mascara', category: 'makeup', categoryLabel: 'MAKEUP · EYE', markets: ['VN', 'TW'], keywords: ['처짐 방지', '미세 브러시', '롱래시'], formats: ['Wear Test', 'Eye Tutorial'], slots: 14, image: image('beauty-product-collection-b.webp'), sprite: { x: 0, y: 1 }, description: '미세 브러시와 장시간 컬 고정력을 테스트하기 좋은 마스카라입니다.' },
  { id: 'tone-up-color-base', name: 'Tone-up Color Base', category: 'makeup', categoryLabel: 'MAKEUP · BASE', markets: ['VN', 'TW', 'US'], keywords: ['톤 보정', '컬러 베이스', '비교'], formats: ['Color Correcting', 'GRWM'], slots: 18, image: image('beauty-product-collection-b.webp'), sprite: { x: 1, y: 1 }, description: '피부 톤 고민에 따라 색상을 선택하는 컬러 베이스입니다.' },
  { id: 'mochi-powder-pact', name: 'Mochi Powder Pact', category: 'makeup', categoryLabel: 'MAKEUP · POWDER', markets: ['TW', 'US'], keywords: ['보송 밀착', '모공 블러', '휴대성'], formats: ['Touch-up Reel', 'Wear Test'], slots: 9, image: image('beauty-product-collection-b.webp'), sprite: { x: 2, y: 1 }, description: '메이크업 수정과 모공 블러 효과를 빠르게 보여주는 파우더 팩트입니다.' },
  { id: 'dual-shade-contour', name: 'Dual Shade Contour', category: 'makeup', categoryLabel: 'MAKEUP · CONTOUR', markets: ['VN', 'US'], keywords: ['입체 윤곽', '두 가지 톤', '튜토리얼'], formats: ['Face Mapping', 'Tutorial'], slots: 11, image: image('beauty-product-collection-b.webp'), sprite: { x: 3, y: 1 }, description: '두 가지 음영으로 얼굴 윤곽을 설계하는 메이크업 제품입니다.' },
  { id: 'silk-repair-hair-mask', name: 'Silk Repair Hair Mask', category: 'hair-body', categoryLabel: 'HAIR · TREATMENT', markets: ['VN', 'TW', 'US'], keywords: ['손상모', '윤기', '홈케어'], formats: ['Before & After', 'Hair Routine'], slots: 15, image: image('beauty-product-collection-c.webp'), sprite: { x: 0, y: 0 }, description: '손상모의 윤기와 빗질 변화를 전후 비교로 보여주는 헤어 마스크입니다.' },
  { id: 'root-volume-mist', name: 'Root Volume Mist', category: 'hair-body', categoryLabel: 'HAIR · STYLING', markets: ['VN', 'TW'], keywords: ['뿌리 볼륨', '스타일링', '지속력'], formats: ['Styling Tutorial', 'Hold Test'], slots: 13, image: image('beauty-product-collection-c.webp'), sprite: { x: 1, y: 0 }, description: '뿌리 볼륨을 살리는 사용법과 지속력을 보여주는 스타일링 미스트입니다.' },
  { id: 'fig-body-wash', name: 'Fig Mood Body Wash', category: 'hair-body', categoryLabel: 'BODY · WASH', markets: ['TW', 'US'], keywords: ['무드 향', '거품', '샤워 루틴'], formats: ['Shower Routine', 'Scent Story'], slots: 7, image: image('beauty-product-collection-c.webp'), sprite: { x: 2, y: 0 }, description: '감각적인 향과 풍성한 거품을 중심으로 소개하는 바디 워시입니다.' },
  { id: 'hand-veil-cream', name: 'Hand Veil Cream', category: 'hair-body', categoryLabel: 'BODY · HAND CARE', markets: ['VN', 'US'], keywords: ['빠른 흡수', '휴대성', '향'], formats: ['Desk Routine', 'Texture Test'], slots: 10, image: image('beauty-product-collection-c.webp'), sprite: { x: 3, y: 0 }, description: '끈적임 없이 빠르게 흡수되는 사용감을 보여주는 핸드 크림입니다.' },
  { id: 'sea-salt-scalp-scrub', name: 'Sea Salt Scalp Scrub', category: 'hair-body', categoryLabel: 'HAIR · SCALP', markets: ['TW', 'US'], keywords: ['딥 클렌징', '두피 스케일링', '쿨링'], formats: ['Scalp Reset', 'How-to'], slots: 6, image: image('beauty-product-collection-c.webp'), sprite: { x: 0, y: 1 }, description: '두피 딥 클렌징 과정과 상쾌한 사용감을 소개하는 스크럽입니다.' },
  { id: 'camellia-hair-oil', name: 'Camellia Hair Oil', category: 'hair-body', categoryLabel: 'HAIR · OIL', markets: ['VN', 'TW', 'US'], keywords: ['동백 오일', '윤기', '열 보호'], formats: ['Shine Test', 'Styling Reel'], slots: 16, image: image('beauty-product-collection-c.webp'), sprite: { x: 1, y: 1 }, description: '동백 오일의 윤기와 스타일링 전후 차이를 보여주는 헤어 오일입니다.' },
  { id: 'cloud-body-mist', name: 'Cloud Body Mist', category: 'hair-body', categoryLabel: 'BODY · FRAGRANCE', markets: ['VN', 'TW'], keywords: ['레이어링 향', '데일리', '라이프스타일'], formats: ['Scent Layering', 'Lifestyle Reel'], slots: 19, image: image('beauty-product-collection-c.webp'), sprite: { x: 2, y: 1 }, description: '가볍게 덧뿌리는 향과 일상 장면을 연결하기 좋은 바디 미스트입니다.' },
  { id: 'moonlight-glitter-liner', name: 'Moonlight Glitter Liner', category: 'makeup', categoryLabel: 'MAKEUP · EYE', markets: ['VN', 'TW', 'US'], keywords: ['포인트 글리터', '페스티벌', '지속력'], formats: ['Eye Look', 'Night Wear Test'], slots: 21, image: image('beauty-product-collection-b.webp'), sprite: { x: 0, y: 1 }, description: '빛에 따라 반짝이는 포인트와 지속력을 보여주는 글리터 라이너입니다.' },
];

export function getMatchingProducts({ category = 'all', market = 'all' } = {}, products = BEAUTY_PRODUCTS) {
  return products.filter((product) => {
    const categoryMatch = category === 'all' || product.category === category;
    const marketMatch = market === 'all' || product.markets.length === 0 || product.markets.includes(market);
    return categoryMatch && marketMatch;
  });
}

export function getVisibleProductState(filters = {}, visibleLimit = PAGE_SIZE, products = BEAUTY_PRODUCTS) {
  const matchingProducts = getMatchingProducts(filters, products);
  const safeLimit = Math.max(PAGE_SIZE, visibleLimit);
  const visibleProducts = matchingProducts.slice(0, safeLimit);

  return {
    visibleProducts,
    totalCount: matchingProducts.length,
    remainingCount: Math.max(0, matchingProducts.length - visibleProducts.length),
  };
}

const MARKET_NAMES = { VN: '베트남', TW: '대만', US: '미국' };

const normalizeCategory = (value = '') => {
  const category = String(value).trim().toLowerCase();
  if (category.includes('스킨') || /skin|cleanser|serum|cream|sun/.test(category)) return 'skincare';
  if (category.includes('메이크업') || /makeup|lip|eye|base|cheek/.test(category)) return 'makeup';
  if (category.includes('헤어') || category.includes('바디') || /hair|body|fragrance/.test(category)) return 'hair-body';
  return 'other';
};

const categoryLabel = (category) => ({
  skincare: 'SKINCARE',
  makeup: 'MAKEUP',
  'hair-body': 'HAIR · BODY',
  other: 'BEAUTY',
})[category] || 'BEAUTY';

export function normalizePublicBeautyProduct(product) {
  const category = normalizeCategory(product.category);
  const details = [product.color, product.price ? `${product.price}원` : ''].filter(Boolean);
  return {
    id: product.id,
    name: product.name,
    category,
    categoryLabel: `${categoryLabel(category)} · ${product.brandName || 'K-MODU'}`,
    markets: [],
    keywords: details.length ? details : ['브랜드 등록 상품'],
    formats: ['등록 상품'],
    slots: 0,
    image: product.imageUrl,
    description: product.description || `${product.brandName || 'K-MODU'}의 공개 뷰티 상품입니다.`,
    brandName: product.brandName || 'K-MODU',
    isPublicProduct: true,
  };
}

function createProductCard(product, index) {
  const article = document.createElement('article');
  article.className = 'beauty-product-item';
  article.dataset.category = product.category;
  article.dataset.market = product.markets.join(' ');

  const button = document.createElement('button');
  button.className = 'beauty-product-card';
  button.type = 'button';
  button.setAttribute('aria-label', `${product.name} 매칭 상세보기`);
  const spriteClass = product.sprite ? ' class="is-sprite"' : '';
  const spriteStyle = product.sprite ? ` style="--sprite-offset-x:${product.sprite.x * -25}%;--sprite-offset-y:${product.sprite.y * -50}%"` : '';
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const marketLabel = product.markets.length ? product.markets.join(' · ') : 'GLOBAL';
  const statusLabel = product.isPublicProduct ? '공개 상품' : `${product.slots} CREATOR TEAMS`;
  const actionLabel = product.isPublicProduct ? '제품 상세보기 →' : '매칭 상세보기 →';
  button.innerHTML = `
    <span class="beauty-product-image">
      <img${spriteClass}${spriteStyle} src="${safe(product.image)}" alt="${safe(product.name)} 제품 이미지" width="720" height="720" ${index > 4 ? 'loading="lazy"' : ''} decoding="async" />
      <span class="beauty-recruiting-badge">${product.isPublicProduct ? 'NEW PRODUCT' : 'RECRUITING'}</span>
      <span class="beauty-save-mark" aria-hidden="true">♡</span>
    </span>
    <span class="beauty-product-meta"><b>${safe(product.categoryLabel.split(' · ')[0])}</b><em>${safe(marketLabel)}</em></span>
    <strong>${safe(product.name)}</strong>
    <small>${safe(product.keywords.join(' · '))}</small>
    <span class="beauty-product-format">${product.formats.slice(0, 2).map((format) => `<i>${safe(format)}</i>`).join('')}</span>
    <span class="beauty-product-status"><b>${safe(statusLabel)}</b><em>${safe(actionLabel)}</em></span>
  `;

  article.append(button);
  return { article, button };
}

export function initBeautyProductBoard() {
  const grid = document.getElementById('beautyProductGrid');
  const marketSelect = document.getElementById('beautyMarketFilter');
  const categoryButtons = [...document.querySelectorAll('[data-beauty-category]')];
  const empty = document.getElementById('beautyEmpty');
  const results = document.getElementById('beautyProductResults');
  const loadMore = document.getElementById('beautyLoadMore');
  const loadMoreCount = document.getElementById('beautyLoadMoreCount');
  const sheet = document.getElementById('beautyProductSheet');
  const closeButton = document.getElementById('beautySheetClose');

  if (!grid || !marketSelect || !results || !loadMore || !sheet || !closeButton) return;

  const fields = {
    visual: sheet.querySelector('.beauty-product-sheet-visual'),
    image: document.getElementById('beautySheetImage'),
    category: document.getElementById('beautySheetCategory'),
    name: document.getElementById('beautySheetName'),
    description: document.getElementById('beautySheetDescription'),
    markets: document.getElementById('beautySheetMarkets'),
    format: document.getElementById('beautySheetFormat'),
    slots: document.getElementById('beautySheetSlots'),
    apply: document.getElementById('beautySheetApply'),
  };

  let category = 'all';
  let visibleLimit = PAGE_SIZE;
  let lastTrigger = null;
  let boardProducts = BEAUTY_PRODUCTS;

  const closeSheet = () => {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sheet-open');
    lastTrigger?.focus();
  };

  const openSheet = (product, trigger) => {
    lastTrigger = trigger;
    fields.image.src = product.image;
    fields.image.alt = `${product.name} 제품 이미지`;
    fields.image.classList.remove('is-sprite');
    fields.visual.classList.toggle('has-sprite', Boolean(product.sprite));
    fields.visual.style.backgroundImage = product.sprite ? `url("${product.image}")` : '';
    fields.visual.style.backgroundPosition = product.sprite ? `${product.sprite.x * (100 / 3)}% ${product.sprite.y * 100}%` : '';
    fields.visual.setAttribute('aria-label', product.sprite ? `${product.name} 제품 이미지` : '');
    fields.category.textContent = product.categoryLabel;
    fields.name.textContent = product.name;
    fields.description.textContent = product.description;
    fields.markets.textContent = product.markets.length ? product.markets.map((market) => MARKET_NAMES[market]).join(' · ') : '글로벌 협업 가능';
    fields.format.textContent = product.formats.join(' · ');
    fields.slots.textContent = product.isPublicProduct ? '문의' : String(product.slots);
    fields.apply.href = `mailto:hello@markbridge.co?subject=${encodeURIComponent(`K-MODU 뷰티 제품 협업 문의 · ${product.name}`)}`;
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sheet-open');
    closeButton.focus();
  };

  const render = () => {
    const state = getVisibleProductState({ category, market: marketSelect.value }, visibleLimit, boardProducts);
    grid.replaceChildren();

    state.visibleProducts.forEach((product, index) => {
      const { article, button } = createProductCard(product, index);
      button.addEventListener('click', () => openSheet(product, button));
      grid.append(article);
    });

    empty.hidden = state.totalCount > 0;
    results.textContent = `매칭 가능한 제품 ${state.totalCount}개 중 ${state.visibleProducts.length}개 표시`;
    loadMore.hidden = state.remainingCount === 0;
    loadMoreCount.textContent = state.remainingCount > 0 ? `다음 ${Math.min(PAGE_SIZE, state.remainingCount)}개 · ${state.remainingCount}개 남음` : '';
  };

  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      category = button.dataset.beautyCategory;
      visibleLimit = PAGE_SIZE;
      categoryButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });

  marketSelect.addEventListener('change', () => {
    visibleLimit = PAGE_SIZE;
    render();
  });

  loadMore.addEventListener('click', () => {
    visibleLimit += PAGE_SIZE;
    render();
    results.focus({ preventScroll: true });
  });

  closeButton.addEventListener('click', closeSheet);
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) closeSheet();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sheet.classList.contains('is-open')) closeSheet();
  });

  results.tabIndex = -1;
  render();

  fetch('/api/public/beauty-products', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('상품 목록을 불러오지 못했습니다.')))
    .then((payload) => {
      const publicProducts = Array.isArray(payload.products)
        ? payload.products.filter((product) => product?.id && product?.name && product?.imageUrl).map(normalizePublicBeautyProduct)
        : [];
      if (publicProducts.length > 0) {
        boardProducts = publicProducts;
        visibleLimit = PAGE_SIZE;
        render();
      }
    })
    .catch(() => {
      // 공개 API가 일시적으로 실패하면 기존 큐레이션 상품을 유지한다.
    });
}

if (typeof document !== 'undefined') {
  initBeautyProductBoard();
}
