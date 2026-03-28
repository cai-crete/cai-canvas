/**
 * 시너지 데이터 — AI 전문가 선정기(Selector)에게 전달하는 경량화된 JSON 데이터
 * Source: cai-planners (cai-crete/cai-planners)
 */

export const SYNERGY_MATRIX = [
  { rank: 1, score: 0.94, core: ['P01', 'T05', 'T08'], scenario: '신제품 기획, 고객 검증, 예측 리스크 검증', keywords: ['신제품', '고객', '서비스', '출시', '검증', '예측', 'JTBD', '역산'] },
  { rank: 2, score: 0.92, core: ['P05', 'T01', 'T02'], scenario: '혁신 돌파, 통합 사고, 품질 진단', keywords: ['혁신', '제1원리', '돌파', '제조', '기술', '진단', '전략', '통합'] },
  { rank: 3, score: 0.90, core: ['P02', 'T07', 'T03'], scenario: '위기 대응, 민첩한 전환, 창발적 학습', keywords: ['위기', '변곡점', '민첩', '전환', '불확실', '대응', '긴급', '피벗'] },
  { rank: 4, score: 0.88, core: ['P06', 'T06', 'T04'], scenario: '원칙 수립, 본질 경영, 경쟁 전략', keywords: ['원칙', '시스템', '경쟁', '포지셔닝', '본질', '조직', '경영', '의사결정'] },
  { rank: 5, score: 0.87, core: ['P03', 'P04', 'P01'], scenario: 'AI·기술 플랫폼, UX, 역산 로드맵', keywords: ['AI', '플랫폼', 'UX', '기술', '하드웨어', '생태계', '디자인', '사용자경험'] },
  { rank: 6, score: 0.85, core: ['T04', 'T02', 'P02'], scenario: '경쟁 분석, 진단, 변곡점 감지', keywords: ['경쟁', '시장분석', '5forces', '가치사슬', '진단', '변곡점', 'OKR'] },
  { rank: 7, score: 0.84, core: ['T01', 'T05', 'P04'], scenario: '통합 사고, JTBD, 사용자 직관', keywords: ['JTBD', '사용자', '직관', '고객과업', '대안', '융합', '경험설계'] },
  { rank: 8, score: 0.83, core: ['T08', 'P06', 'P05'], scenario: '인과 분석, 원칙 알고리즘, 제1원리', keywords: ['인과', '데이터', '알고리즘', '원칙', '제1원리', '논리', '인과관계'] },
  { rank: 9, score: 0.82, core: ['T07', 'T03', 'P03'], scenario: '일시적 우위, 창발, 기술 플랫폼', keywords: ['일시적우위', '창발', '스타트업', '플랫폼', '기회', '민첩', '학습'] },
  { rank: 10, score: 0.81, core: ['P01', 'T04', 'T05'], scenario: '역산 기획, 가치사슬, 파괴적 혁신', keywords: ['역산', '가치사슬', '파괴적혁신', '역방향', '시장진입', '혁신'] },
];

export const EXPERT_SUPPORT_MAP: Record<string, number> = {
  T08: 1.0,
  T02: 0.9,
  P06: 0.8,
  T06: 0.7,
  T03: 0.6,
  T07: 0.5,
};

export const EXPERT_PROFILES_COMPACT = [
  { id: 'T01', name: 'Roger Martin',     keywords: ['통합적사고', '대립융합', '제3의길', '양자택일거부'] },
  { id: 'T02', name: 'Richard Rumelt',   keywords: ['진단방침행동', '나쁜전략', '커널구조', '레버리지'] },
  { id: 'T03', name: 'Henry Mintzberg',  keywords: ['창발적전략', '불확실성', '유연성', '패턴인식'] },
  { id: 'T04', name: 'Michael Porter',   keywords: ['경쟁전략', '5forces', '가치사슬', '포지셔닝'] },
  { id: 'T05', name: 'Clay Christensen', keywords: ['파괴적혁신', 'JTBD', '고객과업', '혁신'] },
  { id: 'T06', name: 'Peter Drucker',    keywords: ['본질경영', '고객정의', '조직목적', '가치'] },
  { id: 'T07', name: 'Rita McGrath',     keywords: ['일시적우위', '민첩', '피벗', '빠른실행'] },
  { id: 'T08', name: 'Judea Pearl',      keywords: ['인과추론', '리스크검증', '가정분석', '데이터'] },
  { id: 'P01', name: 'Jeff Bezos',       keywords: ['역산기획', '고객경험', '신제품', '출시'] },
  { id: 'P02', name: 'Andy Grove',       keywords: ['OKR', '변곡점', '실행력', '위기대응'] },
  { id: 'P03', name: 'Jensen Huang',     keywords: ['AI플랫폼', '기술생태계', '하드웨어', '가속'] },
  { id: 'P04', name: 'Steve Jobs',       keywords: ['UX', '사용자경험', '단순화', '직관'] },
  { id: 'P05', name: 'Elon Musk',        keywords: ['제1원리', '혁신돌파', '제조', '기술한계'] },
  { id: 'P06', name: 'Ray Dalio',        keywords: ['원칙시스템', '알고리즘의사결정', '투명성', '조직'] },
];

export const MODE_SQUAD_MAP: Record<string, { core: string[]; support: string; label: string; trigger: string }> = {
  A: { core: ['T05', 'P01', 'P05'], support: 'T08', label: 'Innovation Team',  trigger: '신제품 출시, 스타트업 창업, 신시장 진출, 0에서 1을 만드는 과업' },
  B: { core: ['T04', 'T02', 'P06'], support: 'T08', label: 'Efficiency Team',  trigger: '프로세스 효율화, 비용 절감, 수익성 개선, 조직 개편, 마케팅 최적화' },
  C: { core: ['P02', 'T07', 'T03'], support: 'P01', label: 'Survival Team',    trigger: '경쟁사 급부상, 시장 급변, 매출 급락, 규제 쇼크, PR 위기, 피벗 필요' },
};
