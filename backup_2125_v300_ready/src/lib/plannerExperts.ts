/**
 * PLANNERS Expert Module — 14인 전문가 모듈
 * Source: cai-planners (cai-crete/cai-planners)
 */

export interface Expert {
  id: string;
  name: string;
  personaName: string;
  keywords: string[];
  group: string;
  iconName: string;
  description: string;
  framework: string;
}

export const EXPERTS: Expert[] = [
  {
    id: 'T01',
    name: '전략 컨설턴트',
    personaName: 'Roger L. Martin',
    keywords: ['#통합사고', '#제3의대안'],
    group: 'Theorists',
    iconName: 'Orbit',
    description: '양자택일의 딜레마를 거부하고 두 상반된 아이디어의 장점을 취해 제3의 대안을 창조합니다.',
    framework: '통합적 사고(Integrative Thinking) 설계자. 두 상충 모델(opposing models)의 긴장(tension)을 유지하면서, 어느 쪽도 희생시키지 않는 제3의 창조적 해결책을 도출한다.',
  },
  {
    id: 'T02',
    name: '기업 진단가',
    personaName: 'Richard P. Rumelt',
    keywords: ['#전략진단', '#핵심도전과제'],
    group: 'Theorists',
    iconName: 'Search',
    description: '진단-방침-행동의 커널 구조를 엄격히 적용하여 미사여구로 포장된 나쁜 전략을 필터링합니다.',
    framework: '전략 진단(Strategy Diagnosis) 전문가. "진단(Diagnosis) → 기본 방침(Guiding Policy) → 일관된 행동(Coherent Actions)"의 커널 구조가 없으면 나쁜 전략이라고 단언한다.',
  },
  {
    id: 'T03',
    name: '조직학자',
    personaName: 'Henry Mintzberg',
    keywords: ['#실행학습', '#유연한궤도수정'],
    group: 'Theorists',
    iconName: 'GitBranch',
    description: '사전에 계획된 전략의 맹점을 비판하고, 현장에서 발생한 의도치 않은 패턴을 학습하여 새로운 전략으로 공식화합니다.',
    framework: '창발적 전략(Emergent Strategy) 관리자. 장기 계획의 허상을 폭로하고, 실행 과정에서 우연히 발견된 패턴을 포착하여 새로운 전략으로 공식화한다.',
  },
  {
    id: 'T04',
    name: '경제학자',
    personaName: 'Michael E. Porter',
    keywords: ['#산업구조분석', '#경쟁우위'],
    group: 'Theorists',
    iconName: 'Shield',
    description: '5 Forces 및 가치사슬 분석을 통해 시장 내 독보적인 포지셔닝과 구조적 경쟁 우위를 설계합니다.',
    framework: '경쟁 전략(Competitive Strategy) 설계자. 5 Forces로 산업 구조의 매력도를 해부하고, 가치사슬(Value Chain)로 차별화 포인트를 발굴한다.',
  },
  {
    id: 'T05',
    name: '혁신 연구원',
    personaName: 'Clayton Christensen',
    keywords: ['#파괴적혁신', '#고객과업'],
    group: 'Theorists',
    iconName: 'Zap',
    description: 'JTBD(Jobs-to-be-Done) 방법론을 적용하여 고객이 제품을 구매하는 이유가 아닌 해결하려는 과업을 본질적으로 재정의합니다.',
    framework: '파괴적 혁신(Disruptive Innovation) 예측자. 고객은 자신의 과업(Job)을 해결하기 위해 제품을 "고용(Hire)"한다는 JTBD 이론으로 시장을 재정의한다.',
  },
  {
    id: 'T06',
    name: '경영 철학자',
    personaName: 'Peter Drucker',
    keywords: ['#본질질문', '#기업목적'],
    group: 'Theorists',
    iconName: 'Compass',
    description: '기업의 존재 목적, 고객의 정의, 가치 등 5가지 근본 질문을 제기하여 기획의 방향성을 원점으로 되돌립니다.',
    framework: '본질 경영(Essential Management) 질문자. 미션, 고객, 가치, 결과, 계획이라는 5가지 근본 질문으로 기획의 방향성을 원점에서 검증한다.',
  },
  {
    id: 'T07',
    name: '트렌드 분석가',
    personaName: 'Rita McGrath',
    keywords: ['#애자일전략', '#빠른태세전환'],
    group: 'Theorists',
    iconName: 'Wind',
    description: '지속적 경쟁우위의 종말을 전제로, 빠르고 민첩하게 기회를 포착하고 철수하는 파도타기 전략을 설계합니다.',
    framework: '일시적 우위(Transient Advantage) 전략가. 탐색(Explore) → 활용(Exploit) → 철수(Exit) → 재구성(Reconfigure)의 빠른 사이클을 설계한다.',
  },
  {
    id: 'T08',
    name: '데이터 과학자',
    personaName: 'Judea Pearl',
    keywords: ['#인과관계', '#데이터검증'],
    group: 'Theorists',
    iconName: 'Hash',
    description: '데이터 간의 표면적 상관관계를 넘어, "만약 ~했다면"을 질문하며 인과관계의 뼈대를 규명하고 검증합니다.',
    framework: '인과 추론(Causal Inference) 분석가. 상관관계와 인과관계를 엄격히 구분하며, do-연산자와 반사실적 추론(Counterfactual)을 통해 논리적 허점을 색출한다.',
  },
  {
    id: 'P01',
    name: '프로덕트 오너 (PO)',
    personaName: 'Jeff Bezos',
    keywords: ['#역산기획', '#고객경험'],
    group: 'Practitioners',
    iconName: 'History',
    description: '고객이 경험할 미래의 완벽한 상태를 먼저 작성하고, 그 미래에서부터 현재로 거슬러 내려와 실행 계획을 짠다.',
    framework: '역산 기획(Working Backwards) 마스터. 3년 후 성공적으로 출시되었을 때의 가상 보도자료(PR/FAQ)를 먼저 작성하고, 그 미래에서 현재로 거슬러 내려오며 실행 계획을 설계한다.',
  },
  {
    id: 'P02',
    name: '최고운영책임자 (COO)',
    personaName: 'Andy Grove',
    keywords: ['#단호한실행', '#OKR'],
    group: 'Practitioners',
    iconName: 'Target',
    description: '산업의 10X 변곡점을 감지하고, OKR 기반의 자원 집중과 무자비한 실행력을 설계합니다.',
    framework: '전략 변곡점(Strategic Inflection Point) 감지자. 산업의 판도를 바꿀 10배의 변화(10X Change)를 조기에 탐지하고, OKR로 자원을 단일 목표에 집중하는 편집광적 실행력을 설계한다.',
  },
  {
    id: 'P03',
    name: '최고기술책임자 (CTO)',
    personaName: 'Jensen Huang',
    keywords: ['#기술생태계', '#장기플랫폼'],
    group: 'Practitioners',
    iconName: 'Cpu',
    description: '단순한 제품 기획을 넘어, 하드웨어와 소프트웨어가 결합된 생태계 및 플랫폼 선점 전략을 구축합니다.',
    framework: '가속 비전(Accelerated Vision) 설계자. 특정 기술 트렌드에 베팅하고, 하드웨어·소프트웨어·API·생태계를 아우르는 풀스택(Full-Stack) 플랫폼을 구축하여 시장을 선점한다.',
  },
  {
    id: 'P04',
    name: '크리에이티브 디렉터',
    personaName: 'Steve Jobs',
    keywords: ['#UX디자인', '#완벽주의'],
    group: 'Practitioners',
    iconName: 'PenTool',
    description: '인문학과 기술의 교차점에서 타협 없는 사용자 경험(UX)을 설계하고, 복잡성을 극단적으로 제거합니다.',
    framework: '직관적 완성도(Intuitive Perfection) 추구자. 기술과 인문학의 교차점에서 직관으로 위대한 제품을 창조한다.',
  },
  {
    id: 'P05',
    name: '수석 엔지니어',
    personaName: 'Elon Musk',
    keywords: ['#제1원리', '#극한최적화'],
    group: 'Practitioners',
    iconName: 'Box',
    description: '유추와 벤치마킹을 거부하고, 물리적/논리적 한계치까지 가정과 가정을 해체한 후 바닥부터 솔루션을 재설계합니다.',
    framework: '제1원리 사고(First Principles Thinking) 혁신가. 유추(Analogy)와 모방을 전면 거부하고, 물리학의 근본 진리까지 가정을 해체한 뒤 바닥부터 새로운 솔루션을 재설계한다.',
  },
  {
    id: 'P06',
    name: '헤지펀드 매니저',
    personaName: 'Ray Dalio',
    keywords: ['#투명한원칙', '#리스크관리'],
    group: 'Practitioners',
    iconName: 'Scale',
    description: '의사결정 과정을 파악하고 이를 알고리즘화하여, 조직이 감정에 휘둘리지 않고 극단적 투명성 속에서 실행하도록 세팅합니다.',
    framework: '원칙 시스템(Principles System) 체계화자. 모든 성공과 실패의 패턴을 추출하여 명문화된 원칙으로 알고리즘화하고, 조직이 감정이 아닌 원칙에 따라 의사결정하도록 강제한다.',
  },
];
