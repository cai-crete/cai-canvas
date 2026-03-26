const fs = require('fs');

const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const newObj = `const STYLE_DESCRIPTIONS: Record<string, { title: { ko: string, en: string }, keywords: { ko: string, en: string }[] }> = {
  'A': {
    title: { ko: '장중한 메스의 규칙', en: 'Vitruvian Tectonics' },
    keywords: [
      { en: 'Fragment', ko: '분절' },
      { en: 'Stagger', ko: '엇갈림' },
      { en: 'Deep Set Recess', ko: '창호의 깊이감' },
      { en: 'Contextual Material Derivation', ko: '맥락적 재료 파생' },
      { en: 'Diffuse Timelessness', ko: '확산된 시간성' }
    ]
  },
  'B': {
    title: { ko: '순수한 기하학적형태', en: 'Geometric Purity' },
    keywords: [
      { en: 'Orthogonal Grid', ko: '직교 그리드' },
      { en: 'Layered Transparency', ko: '레이어 투명성' },
      { en: 'Elevated Massing', ko: '띄워진 매스' },
      { en: 'Absolute Whiteness', ko: '절대 백색' },
      { en: 'Hard Sunlight Chiaroscuro', ko: '강렬한 명암법' }
    ]
  },
  'C': {
    title: { ko: '가구식 구조', en: 'Particlization' },
    keywords: [
      { en: 'Divide', ko: '분할' },
      { en: 'Kigumi Joinery', ko: '결구 접합' },
      { en: 'Deep Eaves', ko: '깊은 처마' },
      { en: 'Blurred Edge', ko: '흐릿한 경계' },
      { en: 'Komorebi Lighting', ko: '목과 빛' }
    ]
  },
  'D': {
    title: { ko: '고지식한 조형성', en: 'Incised Geometry' },
    keywords: [
      { en: 'Platonic Extrusion', ko: '플라톤적 돌출' },
      { en: 'Strategic Incision', ko: '전략적 절개' },
      { en: 'Horizontal Striping', ko: '수평 줄무늬' },
      { en: 'Brick Pattern Variation', ko: '벽돌 패턴 변주' },
      { en: 'Grounded Solidity', ko: '접지된 견고함' }
    ]
  },
  'E': {
    title: { ko: '조형적인 유선형', en: 'Sculptural Fluidity' },
    keywords: [
      { en: 'Collide & Explode', ko: '충돌과 폭발' },
      { en: 'Curve & Crumple', ko: '곡면과 구김' },
      { en: 'Metallic Skin', ko: '금속 피부' },
      { en: 'Asymmetric Fragmentation', ko: '비대칭 파편화' },
      { en: 'Oblique Sunlight Drama', ko: '비스듬한 햇빛 드라마' }
    ]
  },
  'F': {
    title: { ko: '다이어그램의 구조화', en: 'Diagrammatic Formalism' },
    keywords: [
      { en: 'Dual Grid Superimposition', ko: '이중 그리드 중첩' },
      { en: 'Transformation Sequence', ko: '변형 연산 시퀀스' },
      { en: 'Indexical Trace', ko: '지표적 흔적' },
      { en: 'Anti-Compositional Logic', ko: '반구성 논리' },
      { en: 'White Neutrality', ko: '백색 중립성' }
    ]
  },
  'G': {
    title: { ko: '노출된 하이테크', en: 'Tectonic Transparency' },
    keywords: [
      { en: 'Kit of Parts', ko: '부품 조립' },
      { en: 'Multi-Layered Facade', ko: '다층 입면' },
      { en: 'Floating Roof', ko: '떠 있는 지붕' },
      { en: 'Exposed Services', ko: '노출 설비' },
      { en: 'Adaptive Permeability', ko: '적응적 투과성' }
    ]
  }
};`;

const regex = /const STYLE_DESCRIPTIONS[\s\S]*?^};/m;
if (regex.test(code)) {
  code = code.replace(regex, newObj + "\n");
  fs.writeFileSync(path, code, 'utf8');
  console.log('SUCCESS: Updated STYLE_DESCRIPTIONS');
} else {
  console.log('FAILED: Could not find STYLE_DESCRIPTIONS block matching regex');
}
