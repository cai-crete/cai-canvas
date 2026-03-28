/**
 * PLANNERS Generate — GEMS Protocol 2-Step API
 * Adapted from cai-planners (cai-crete/cai-planners) gemini.ts
 *
 * Step 1: selectExpertSquad — 지능형 전문가 스쿼드 선정
 * Step 2: generateDiscussion — 변증법적 토론 + 전략 기획서 생성
 */

import { EXPERTS } from './plannerExperts';
import { SYNERGY_MATRIX, EXPERT_SUPPORT_MAP, EXPERT_PROFILES_COMPACT, MODE_SQUAD_MAP } from './plannerSynergyData';

const PLANNERS_API = 'https://cai-planners.vercel.app/api/generate';

const MODEL_ANALYSIS          = 'gemini-2.5-pro';
const MODEL_ANALYSIS_FALLBACK = 'gemini-2.0-flash';
const MODEL_SELECTOR          = 'gemini-2.0-flash';
const MODEL_SELECTOR_FALLBACK = 'gemini-1.5-flash';

async function callApi(payload: { model: string; contents: unknown; config?: unknown }) {
  const res = await fetch(PLANNERS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return await res.json() as { text: string };
}

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ExpertTurnData {
  expertId: string;
  role: 'thesis' | 'antithesis' | 'synthesis' | 'support';
  keywords: string[];
  shortContent: string;
  fullContent: string;
}

export interface DiscussionResult {
  metacognitiveDefinition: {
    selectedMode: string;
    projectDefinition: string;
    activeSquadReason: string;
  };
  workflowSimulationLog: string;
  thesis: ExpertTurnData;
  antithesis: ExpertTurnData;
  synthesis: ExpertTurnData;
  support: ExpertTurnData;
  shortFinalOutput: string;
  finalOutput: string;
  transparencyReport: {
    selfHealingLog: string;
    truthfulnessCheck: string;
    realImpact: string;
    nextActionSuggestion: string;
  };
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface SquadSelection {
  detectedMode: 'A' | 'B' | 'C';
  thesisId: string;
  antithesisId: string;
  synthesisId: string;
  supportId: string;
  reason: string;
}

// ─── Step 1: Expert Squad Selection ──────────────────────────────────────────

export async function selectExpertSquad(context: string, availableIds: string[]): Promise<SquadSelection> {
  const availableProfiles = EXPERT_PROFILES_COMPACT.filter(e => availableIds.includes(e.id));
  const validCombos = SYNERGY_MATRIX.filter(combo => combo.core.every(id => availableIds.includes(id)));

  const modeMapSummary = Object.entries(MODE_SQUAD_MAP)
    .map(([mode, sq]) => `Mode ${mode} (${sq.label}): Core=[${sq.core.join(',')}] Support=${sq.support} | 트리거: ${sq.trigger}`)
    .join('\n');

  const prompt = `
당신은 GEMS 프로토콜의 전문가 스쿼드 선정 AI입니다.
사용자의 기획 컨텍스트를 분석하여 다음 2가지를 수행하십시오.

# [Task 1] Mode 판단
- Mode A: 신규 사업 기획. 0에서 1을 만드는 과업.
- Mode B: 기존 사업 개선. 이미 존재하는 것을 더 낫게.
- Mode C: 위기 대응. 급변하는 환경 속 생존.
※ 탐구적·개념적·학술적 주제라면 Mode A.

# [Task 2] Mode 기반 고정 Squad
판단된 Mode에 따라 아래 고정 Squad 테이블에서 4인을 선정하십시오.
단, 해당 ID가 선택 가능한 목록에 없을 경우에만 시너지 매트릭스로 보완합니다.

## Mode 기반 Squad 테이블
${modeMapSummary}

## 시너지 매트릭스 (보완용)
${JSON.stringify(validCombos.length > 0 ? validCombos.slice(0, 5) : SYNERGY_MATRIX.slice(0, 5), null, 2)}

# 선택 가능한 전문가 목록
${JSON.stringify(availableProfiles, null, 2)}

# 사용자 기획 컨텍스트
${context}
`.trim();

  const schema = {
    type: 'object',
    properties: {
      detectedMode:   { type: 'string', description: 'A, B, C 중 하나' },
      thesisId:       { type: 'string' },
      antithesisId:   { type: 'string' },
      synthesisId:    { type: 'string' },
      supportId:      { type: 'string' },
      reason:         { type: 'string' },
    },
    required: ['detectedMode', 'thesisId', 'antithesisId', 'synthesisId', 'supportId', 'reason'],
  };

  let response: { text: string };
  try {
    response = await callApi({ model: MODEL_SELECTOR, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
  } catch {
    response = await callApi({ model: MODEL_SELECTOR_FALLBACK, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
  }

  try {
    const result = JSON.parse(response.text ?? '{}') as SquadSelection;
    const allIds = [result.thesisId, result.antithesisId, result.synthesisId, result.supportId];
    if (allIds.every(id => availableIds.includes(id))) return result;
  } catch { /* fall through */ }

  return buildFallbackSquad(availableIds);
}

function buildFallbackSquad(availableIds: string[]): SquadSelection {
  const validCombo = SYNERGY_MATRIX.find(combo => combo.core.every(id => availableIds.includes(id))) ?? SYNERGY_MATRIX[0];
  const [thesisId, antithesisId, synthesisId] = validCombo.core;
  const coreSet = new Set([thesisId, antithesisId, synthesisId]);
  const supportId =
    Object.entries(EXPERT_SUPPORT_MAP)
      .filter(([id]) => availableIds.includes(id) && !coreSet.has(id))
      .sort((a, b) => b[1] - a[1])[0]?.[0] ??
    availableIds.find(id => !coreSet.has(id)) ??
    availableIds[3];
  return { detectedMode: 'A', thesisId, antithesisId, synthesisId, supportId, reason: '시너지 매트릭스 최우선 조합 자동 적용' };
}

// ─── Step 2: Discussion Generation ───────────────────────────────────────────

export async function generateDiscussion(context: string, selectedExpertIds: string[]): Promise<DiscussionResult> {
  const squad = await selectExpertSquad(context, selectedExpertIds);

  const getExpert = (id: string) => {
    const e = EXPERTS.find(e => e.id === id);
    if (!e) throw new Error(`Expert not found: ${id}`);
    return e;
  };

  const thesis     = getExpert(squad.thesisId);
  const antithesis = getExpert(squad.antithesisId);
  const synthesis  = getExpert(squad.synthesisId);
  const support    = getExpert(squad.supportId);

  const modeLabel: Record<string, string> = {
    A: 'Mode A — 신규 사업 기획 (Zero to One)',
    B: 'Mode B — 기존 사업 개선 (Optimization)',
    C: 'Mode C — 위기 대응 (Crisis Survival)',
  };

  const prompt = `
# GEMS Protocol — Active Metacognitive Architect (ES-MoE v4.5)

당신은 능동형 메타인지 설계자(Active Metacognitive Architect)이며,
사용자의 입력을 실제 리소스가 투입될 '비즈니스 실행 지시서(Work Order)'로 간주합니다.

## Layer 0: 불문율
1. 깊이: 표면적 답변을 거부하고 본질을 탐구한다.
2. 진실: 불확실성을 있는 그대로 노출하고 모르면 모른다고 인정한다.
3. 도움: 즉각적 실용성과 장기적 성장을 동시에 추구한다.
4. 창조: 예측 가능한 답변과 뻔한 결론을 거부한다.
5. 균형: 이론적 엄밀성과 실용적 적용성의 최적 균형점을 찾는다.

## Layer 1: 작동 모드
시스템이 판단한 프로젝트 모드: **${modeLabel[squad.detectedMode] ?? modeLabel['A']}**

## Layer 2: 소집된 전문가 스쿼드 — 역할 간섭 방지 프로토콜

### [제안 Thesis] ${thesis.personaName} (${thesis.name})
방법론: ${thesis.framework}
역할 제한: 전략적 방향과 진단만 제공. 구체적 실행 로드맵 작성 금지.

### [반박 Antithesis] ${antithesis.personaName} (${antithesis.name})
방법론: ${antithesis.framework}
역할 제한: ${thesis.personaName}의 제안에서 논리적 맹점·인과 오류만 집요하게 공격. 단순 동의 발언 금지.

### [통합 Synthesis] ${synthesis.personaName} (${synthesis.name})
방법론: ${synthesis.framework}
역할 제한: 제안과 반박의 충돌을 흡수하여 제3의 대안 창조. 추상적 개념 논의만 하는 것 금지.

### [검증 Support] ${support.personaName} (${support.name})
방법론: ${support.framework}
역할 제한: 인과 관계 검증, 가정의 타당성 심문, 숨겨진 리스크 노출에만 집중.

## Layer 3: 출력 규약

### 8.1 Metacognitive Definition
- selectedMode, projectDefinition(1문장), activeSquadReason

### 8.2 Workflow Simulation Log
[${thesis.personaName}] → [${antithesis.personaName}] → [${synthesis.personaName}] → [${support.personaName}]
자연스럽고 이해하기 쉬운 일상적 대화체로 작성. 단순 동의 없이 반드시 추가 관점 포함.

### 8.3 Final Output: 통합 전략 기획서
마크다운 형식. 문단 분리 필수.
1. Executive Summary (핵심 명제 3줄)
2. Strategic Layer (현황 진단 + 가치 제안 + 포지셔닝)
3. Tactical Layer (역산 기획 기반 실행 로드맵 Phase 1~3)
4. Execution & Risk (기회비용, 리드타임, 경쟁자 반격 시나리오)

### 8.4 Metacognitive Transparency Report
- selfHealingLog, truthfulnessCheck(가장 취약한 고리), realImpact, nextActionSuggestion

### 8.5 shortFinalOutput
8.3의 핵심 요약 브리핑 4~5줄. 사용자에게 직접 말하는 대화체.

## 전문가 발언 품질 기준
- keywords: 핵심 키워드 5개 (명사형)
- shortContent: 핵심 주장 1줄. 실명 관점에서 일상적 어투.
- fullContent: 3~5문장. 마크다운 기호 금지. 자연스러운 대화체. 끝에 날카로운 질문 포함.

## 사용자 기획 컨텍스트
${context}
`.trim();

  const expertSchema = {
    type: 'object',
    properties: {
      expertId:     { type: 'string' },
      role:         { type: 'string' },
      keywords:     { type: 'array', items: { type: 'string' } },
      shortContent: { type: 'string' },
      fullContent:  { type: 'string' },
    },
    required: ['expertId', 'role', 'keywords', 'shortContent', 'fullContent'],
  };

  const config = {
    responseMimeType: 'application/json',
    temperature: 0.85,
    responseSchema: {
      type: 'object',
      properties: {
        metacognitiveDefinition: {
          type: 'object',
          properties: {
            selectedMode:      { type: 'string' },
            projectDefinition: { type: 'string' },
            activeSquadReason: { type: 'string' },
          },
          required: ['selectedMode', 'projectDefinition', 'activeSquadReason'],
        },
        workflowSimulationLog: { type: 'string' },
        thesis:     expertSchema,
        antithesis: expertSchema,
        synthesis:  expertSchema,
        support:    expertSchema,
        shortFinalOutput: { type: 'string' },
        finalOutput:      { type: 'string' },
        transparencyReport: {
          type: 'object',
          properties: {
            selfHealingLog:       { type: 'string' },
            truthfulnessCheck:    { type: 'string' },
            realImpact:           { type: 'string' },
            nextActionSuggestion: { type: 'string' },
          },
          required: ['selfHealingLog', 'truthfulnessCheck', 'realImpact', 'nextActionSuggestion'],
        },
      },
      required: ['metacognitiveDefinition', 'workflowSimulationLog', 'thesis', 'antithesis', 'synthesis', 'support', 'shortFinalOutput', 'finalOutput', 'transparencyReport'],
    },
  };

  let response: { text: string };
  try {
    response = await callApi({ model: MODEL_ANALYSIS, contents: prompt, config });
  } catch (primaryErr) {
    console.warn('[plannerGenerate] Primary model failed, using fallback:', primaryErr);
    response = await callApi({ model: MODEL_ANALYSIS_FALLBACK, contents: prompt, config });
  }

  if (!response.text) throw new Error('No response from API');

  const result = JSON.parse(response.text) as DiscussionResult;

  // Sanitize newline escape sequences
  const san = (s: string) => (s ?? '')
    .replace(/\\nWn/g, '\n').replace(/\\Wn/g, '\n').replace(/₩n/g, '\n')
    .replace(/\\n/g, '\n').replace(/\\W/g, '\n').replace(/\r\n/g, '\n')
    .replace(/\n\n+/g, '\n\n');

  result.finalOutput           = san(result.finalOutput);
  result.shortFinalOutput      = san(result.shortFinalOutput);
  result.workflowSimulationLog = san(result.workflowSimulationLog);
  if (result.thesis)     result.thesis.fullContent     = san(result.thesis.fullContent);
  if (result.antithesis) result.antithesis.fullContent = san(result.antithesis.fullContent);
  if (result.synthesis)  result.synthesis.fullContent  = san(result.synthesis.fullContent);
  if (result.support)    result.support.fullContent    = san(result.support.fullContent);

  // Force-assign expertId and role (defensive)
  result.thesis.expertId     = thesis.id;     result.thesis.role     = 'thesis';
  result.antithesis.expertId = antithesis.id; result.antithesis.role = 'antithesis';
  result.synthesis.expertId  = synthesis.id;  result.synthesis.role  = 'synthesis';
  result.support.expertId    = support.id;    result.support.role    = 'support';

  result.thesis.keywords     = result.thesis.keywords     ?? [];
  result.antithesis.keywords = result.antithesis.keywords ?? [];
  result.synthesis.keywords  = result.synthesis.keywords  ?? [];
  result.support.keywords    = result.support.keywords    ?? [];

  return result;
}
