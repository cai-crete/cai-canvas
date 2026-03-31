# CHANGE VIEWPOINT 프로토콜 분석 보고서

**작성일**: 2026-03-31
**분석 대상**: `src/App.tsx` — CHANGE VIEWPOINT 전체 파이프라인
**목적**: 입면도 전개도 정보 불일치 및 Blind spot 시점 변경 불량 원인 파악

---

## 1. 프로토콜 전체 순서

```
[PHASE 0] handleAnalyze — 이미지 재생성 (ANALYSIS 모델)
    ↓
[PHASE 1] analyzeViewpoint — BIM/AEPL v4 파라미터 추출 (ANALYSIS 모델)
    ↓
[PHASE 2] generateElevations — 5방향 직교 입면도 생성 (IMAGE_GEN 모델)
    │   → FRONT (06:00), TOP, RIGHT (03:00), LEFT (09:00), REAR (12:00)
    │   → 결과: elevationImages { front, top, right, left, rear }
    ↓
[PHASE 3] UI 패널 — 사용자 시점 조정
    │   → Angle (ANGLES[angleIndex]) / Altitude / Lens / Time 슬라이더
    │   → cvPrompt 자유 입력
    ↓
[PHASE 4] handleGenerate — 5-IVSP 시점 합성 (IMAGE_GEN 모델)
    │   → 원본 이미지 + 입면도 참조 이미지 → 신규 VIEW XX 생성
    └── VIEW XX 결과: type='generated', label='VIEW XX', motherId=sourceItem.id
```

---

## 2. 주요 데이터 흐름

| 데이터 | 설정 위치 | 저장 위치 | 사용 위치 |
|--------|----------|----------|----------|
| `analyzedOpticalParams` | analyzeViewpoint (line 1506) | item.parameters | handleGenerate v0 카메라 계산, GENERATE 버튼 활성화 |
| `elevationParams` | analyzeViewpoint (line 1507) | item.parameters | generateElevations 프롬프트, handleGenerate layerC |
| `elevationImages` | generateElevations (line ~1627) | item.parameters | handleGenerate 참조 이미지 주입, 라이브러리 패널 |
| `sitePlanImage` | handleAnalyze (line 1407), generateElevations | item.parameters | 라이브러리 패널 (미사용) |

---

## 3. 발견된 오류 및 오염 요소

---

### [BUG-1] 🔴 CRITICAL — AEPL Schema Key Mismatch

**위치**: `handleGenerate` `layerC_property` (~line 1787–1790)

**현상**: Phase 4 생성 프롬프트에 주입되는 BIM 파라미터가 모두 `'N/A'`

**원인**:

```ts
// AEPL v4 스키마가 실제로 저장하는 키 (analyzeViewpoint, line 1487-1488):
data.elevation_parameters['1_Geometry_MASTER']   ← 검증 조건
data.elevation_parameters['2_Property_SLAVE']    ← 검증 조건

// handleGenerate layerC_property가 읽는 키 (line 1787-1790):
localElevationParams['1_macro_geometry']?.mass_typology    ← 구버전 키 ✗
localElevationParams['1_macro_geometry']?.roof_form        ← 구버전 키 ✗
localElevationParams['3_material']?.base_material_type     ← 구버전 키 ✗
localElevationParams['4_fenestration']?.fenestration_type  ← 구버전 키 ✗
```

**결과**:
- Phase 1에서 추출한 재료/형태 BIM 데이터가 Phase 4 생성 프롬프트에 전달되지 않음
- `layerC_property` 블록 전체가 `'N/A'` 값으로 채워짐
- **입면도의 재료/형태 정보와 실제 생성 이미지 정보 불일치의 직접 원인**

**수정 방향**: `layerC_property` 키를 AEPL v4 기준으로 통일

```ts
// 수정안
localElevationParams['1_Geometry_MASTER']?.mass_typology
localElevationParams['1_Geometry_MASTER']?.roof_form
localElevationParams['2_Property_SLAVE']?.base_material_type
localElevationParams['2_Property_SLAVE']?.fenestration_type
```

---

### [BUG-2] 🔴 CRITICAL — `getSemanticAngle` 각도 형식 불일치

**위치**: `handleGenerate` > `getSemanticAngle` (~line 1742–1754)

**현상**: 일부 시점에서 시맨틱 설명이 누락되어 AI가 정확한 시점 컨텍스트를 받지 못함

**원인**:

```ts
// ANGLES 상수 (line 15):
['12:00', '1:30', '3:00', '04:30', '06:00', '07:30', '09:00', '10:30']
//        ↑         ↑
//   leading zero 없음

// getSemanticAngle switch 케이스 (line 1746–1747):
case '03:00': return '03:00 (Direct Right Side / Profile View)';   // ← '3:00' ≠ '03:00' ✗
case '01:30': return '01:30 (Rear-Right Corner View / ...)';        // ← '1:30' ≠ '01:30' ✗
```

| 각도 | ANGLES 값 | switch 케이스 | 매칭 | 결과 |
|------|----------|--------------|------|------|
| 12:00 | `'12:00'` | `'12:00'` | ✓ | 정상 |
| **1:30** | **`'1:30'`** | **`'01:30'`** | **✗** | **default (raw string)** |
| **3:00** | **`'3:00'`** | **`'03:00'`** | **✗** | **default (raw string)** |
| 04:30 | `'04:30'` | `'04:30'` | ✓ | 정상 |
| 06:00 | `'06:00'` | `'06:00'` | ✓ | 정상 |
| 07:30 | `'07:30'` | `'07:30'` | ✓ | 정상 |
| 09:00 | `'09:00'` | `'09:00'` | ✓ | 정상 |
| 10:30 | `'10:30'` | `'10:30'` | ✓ | 정상 |

**결과**:
- `1:30` (우측 후방 코너), `3:00` (정우측) 각도 선택 시 시맨틱 설명 없음
- 프롬프트의 `V₁ Target Vector`에 단순 `'1:30'`, `'3:00'` 문자열만 전달 → AI 시점 추론 품질 저하
- **Blind spot(후방/측면) 시점 변경 불량의 직접 원인 중 하나**

**수정 방향**: switch 케이스를 ANGLES 값과 일치시킴

```ts
case '3:00': return '3:00 (Direct Right Side / Profile View)';
case '1:30': return '1:30 (Rear-Right Corner View / 2-Point Perspective)';
```

---

### [BUG-3] 🟡 HIGH — PHASE 0 재생성 이미지 vs Phase 4 원본 이미지 불일치

**위치**: `handleAnalyze` (line 1378–1411) vs `handleGenerate` (line 1764–1768)

**현상**: BIM 분석/입면도는 재생성 이미지 기준, 최종 시점 생성은 원본 이미지 사용

**원인**:

```ts
// handleAnalyze:
let analysisImage = sourceItem.src;         // 원본
// PHASE 0: 재생성 API 호출
analysisImage = regenResult;                 // 재생성된 이미지로 교체
setSitePlanImage(analysisImage);             // 재생성 이미지 저장
await analyzeViewpoint(analysisImage, ...); // 재생성 이미지로 BIM 분석 + 입면도 생성

// handleGenerate:
let actualImageSrc = sourceItem.src;         // 원본 이미지 사용 ← PHASE 0 재생성과 다름
```

**결과**:
- 입면도(Phase 2)는 재생성 이미지 기반 기하학
- Phase 4 생성은 원본 이미지 기반 기하학
- 두 이미지의 구도/비율이 미세하게 다를 경우 참조 기하학과 실제 기하학 불일치
- **Blind spot 추론 정밀도 저하 원인**

---

### [BUG-4] 🟡 HIGH — 라이브러리 패널 component state 참조

**위치**: 라이브러리 패널 pages 2–6 (~line 3514)

**현상**: 열린 아이템과 다른 아이템 선택 시 잘못된 입면도 이미지 표시 가능

**원인**:

```ts
// 라이브러리 패널 (line 3514):
const imgSrc = elevationImages[currentView.key ...];   // component state 참조

// 라이브러리 page 1 (AEPL 파라미터, line 3483):
item.parameters.elevationParams[...]                    // item 직접 참조 ✓
```

페이지 1은 `item.parameters`를 직접 참조(정상), 페이지 2–6은 component state `elevationImages`를 참조.
다른 아이템 선택 → useEffect → `elevationImages` state 교체 → 열린 라이브러리에 다른 아이템 입면도 표시.

**수정 방향**: `elevationImages` → `item.parameters?.elevationImages`

---

### [BUG-5] 🟠 MEDIUM — `handleGenerate` 내 `elevationParams` fallback 오염

**위치**: `handleGenerate` (~line 1715–1717)

**원인**:

```ts
let localElevationParams = sourceItem.parameters?.elevationParams || elevationParams;
let localElevationImages  = sourceItem.parameters?.elevationImages  || elevationImages;
```

`sourceItem.parameters.elevationParams`가 null인 경우 component state `elevationParams`를 사용.
component state는 직전에 선택된 다른 아이템의 데이터일 수 있음 → 오염된 BIM 파라미터로 입면도 생성.

---

### [BUG-6] 🟠 MEDIUM — `sitePlanImage` 이중 설정 경합

**위치**: `handleAnalyze` (line 1407) → `generateElevations` (~line 1627)

**원인**:

```ts
// handleAnalyze:
setSitePlanImage(analysisImage);      // 재생성 이미지로 설정

// generateElevations (비동기 완료 후):
if (newImages.top) setSitePlanImage(newImages.top);  // TOP VIEW로 덮어씀

// analyzeViewpoint가 item.parameters에 저장할 때:
sitePlanImage: null,   // ← null로 먼저 저장 (line 1517)
// generateElevations 완료 후 덮어씀
```

비동기 타이밍에 따라 `item.parameters.sitePlanImage`가 null인 상태에서 저장될 가능성.

---

## 4. 오류 요약 매트릭스

| ID | 심각도 | 위치 | 증상 | 직접 원인 |
|----|-------|------|------|----------|
| BUG-1 | 🔴 CRITICAL | `layerC_property` line 1787 | 입면도 정보≠생성 이미지 | AEPL 키 구버전 사용 |
| BUG-2 | 🔴 CRITICAL | `getSemanticAngle` line 1746 | Blind spot 시점 변경 불량 | 각도 string 포맷 불일치 |
| BUG-3 | 🟡 HIGH | Phase 0 vs Phase 4 | 기하학 정렬 불일치 | 다른 이미지 기반 파이프라인 |
| BUG-4 | 🟡 HIGH | 라이브러리 line 3514 | 잘못된 입면도 표시 | component state 직접 참조 |
| BUG-5 | 🟠 MEDIUM | `handleGenerate` line 1715 | BIM 파라미터 오염 | 타 아이템 state fallback |
| BUG-6 | 🟠 MEDIUM | `sitePlanImage` line 1407/1517 | null 저장 가능성 | 비동기 순서 경합 |

---

## 5. 수정 우선순위

1. **BUG-1** — AEPL 키 통일 (3개 키 수정, 1줄씩)
2. **BUG-2** — `getSemanticAngle` 케이스 2개 수정
3. **BUG-4** — 라이브러리 패널 `item.parameters.elevationImages` 직접 참조
4. **BUG-5** — fallback 제거 또는 경고 처리
5. **BUG-3** — Phase 0 재생성 이미지를 Phase 4에도 적용 (설계 변경 필요)
6. **BUG-6** — sitePlanImage 설정 순서 정리

---

## 6. 질문 사항 (추가 확인 필요)

**Q1 — BUG-3 Phase 0 재생성 처리 방향**:
PHASE 0(재생성)의 목적은 이미지 노이즈 제거. Phase 4에도 재생성 이미지를 사용하면 원본 품질이 달라질 수 있음.

| 방안 | 설명 |
|------|------|
| **방안 1** | PHASE 0 제거 — 원본 이미지로 직접 분석/생성 (파이프라인 단순화) |
| **방안 2** | PHASE 0 재생성 이미지를 item에 저장 → Phase 4도 동일 이미지 사용 |
| **방안 3** | 현행 유지 (Phase 0는 분석 전용) + BUG-1~2만 수정 |

**Q2 — BUG-5 elevationParams fallback 처리**:
sourceItem에 elevationParams가 없는 경우(첫 생성 시 inline 분석) component state를 fallback으로 사용 중.

| 방안 | 설명 |
|------|------|
| **방안 1** | fallback 제거 — null이면 inline analyzeViewpoint 결과만 사용 |
| **방안 2** | inline analyzeViewpoint 결과를 즉시 sourceItem에 저장 후 읽기 |
| **방안 3** | 현행 유지 — 오염 위험성 낮은 경우에만 허용 |
