# UI/UX 표준 가이드라인 (V172 현대화 참조용 - 상세 사양)

본 문서는 V172 아키텍처 현대화 작업 중 기존 UI/UX 설정을 1:1로 유지하기 위한 디자인 표준을 정의합니다.

## 1. 헤더 (Header) 사양
- **높이**: `54px`, `shrink-0` 설정.
- **배경**: `bg-white/90 dark:bg-black/90 backdrop-blur-sm`.
- **하단 경계**: `border-b border-black/10 dark:border-white/10`.
- **로고 (CAI CANVAS)**:
  - 폰트: `font-display`, `font-bold`, `uppercase`.
  - 폰트 크기: `text-[1.575rem] (약 25.2px)`.
  - 자간: `tracking-[0.0125em] (약 0.2px)`.
- **테마 토글**: `Moon / Sun` 아이콘 (20px), `hover:opacity-60`.

## 2. 캔버스 영역 (Canvas Area)
- **배경색**: Light - `#fcfcfc`, Dark - `#050505`.
- **배경 그리드 스택**:
  - `rgba(128,128,128,0.1)` (12px 12px 메쉬).
  - `rgba(128,128,128,0.2)` (60px 60px 굵은 가이드).
- **그리드 색상**: `rgba(0, 0, 255, 0.01)` 배경 오버레이 포함.

## 3. 하단 및 좌측 컨트롤 바 (Floating Controls)
- **하단 컨트롤 바 스타일**:
  - 위치: `bottom-[12px]`, `rounded-full`, `h-11 (44px)`.
  - 배경: `bg-white/80 dark:bg-black/80 backdrop-blur-sm`, `border-black/10 dark:border-white/10`.
  - 그림자: `0 4px 16px rgba(0,0,0,0.08)`.
- **좌측 도구 모음 스타일**:
  - 위치: `left-[12px]`, `flex-col`, `rounded-full`, `w-11 (44px)`.
- **버튼 공통 사양**:
  - 크기: 기본 `w-9 h-9`, 활성 시 `w-8 h-8`.
  - 디자인: `rounded-full`, `aspect-square`.
  - 호버 효과: `hover:bg-black/5 dark:hover:bg-white/5`.
  - 활성 상태: `bg-black text-white dark:bg-white dark:text-black`.

## 4. 오른쪽 패널 (Right Sidebar) 상세
- **구조**:
  - 디자인: `w-[284px]`, `rounded-[20px]`, `bg-white/80 dark:bg-black/80 backdrop-blur-sm`.
  - 여백: 패널 외부 `p-[12px]`, 내부 컴포넌트 간격 `gap-5`.
- **상단 내비게이션 (CHANGE VIEWPOINT)**:
  - 이동 버튼: `w-9 h-9`, `rounded-full`, `border border-black/10 dark:border-white/10`.
  - 타이틀 라벨: `height 9 (36px)`, `rounded-full`, `bg-white/50 dark:bg-black/50`, `font-display (13px)`, `tracking-widest`.
- **SITE PLAN (다이어그램)**:
  - 영역: `aspect-square`, `rounded-[20px]`, `bg-white/30 dark:bg-black/30`, `border-black/5 dark:border-white/5`.
- **슬라이더 (Sliders)**:
  - 폰트: `font-mono`, `text-xs`.
  - 라벨 스타일: `opacity-70 uppercase tracking-widest`.
  - 값 로직: `ANGLES.length - 1` 등 인덱스 기반 이동.
- **ANALYSIS REPORT (로그 영역)**:
  - 디자인: `font-mono`, `text-xs`, `tracking-widest`, `p-4`, `rounded-[20px]`, `border-black/10 dark:border-white/10`.
  - 배경: `bg-white/30 dark:bg-black/30`.
- **GENERATE 버튼 (최하단)**:
  - 높이: `h-[44px]`, `rounded-full`.
  - 폰트: `font-display`, `text-[16px]`, `tracking-widest`.
  - 상태: 활성 시 `bg-black text-white dark:bg-white dark:text-black`, 비활성 시 `opacity-30`.

## 5. 이미지 제어 및 노드 (Image Node & UI)
- **노드 라벨**: `font-mono`, `text-[15px]`, `tracking-widest`, `opacity-40`.
- **이미지 제어 바 (Floating on Node)**:
  - 위치: 노드 상단 `-56/scale` px 지점.
  - 높이: `${44 / scale}px`, `rounded-full`.
  - 내부 버튼: `Download`, `Book (Library)`, `Trash (Delete)`.
- **리사이징 핸들**:
  - 크기: `12 / scale` px.
  - 디자인: `#FFFFFF (BG)`, `#808080 (Border)`, `1.6 / scale` px 두께.

## 6. 테마 및 다크모드 (Theme/Darkmode)
- **전역**: `selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`.
- **애니메이션**: `transition-colors duration-300` 통일.

## 7. 모든 버튼의 기능 및 위치 (Button Encyclopedia)
### 하단 컨트롤 바 (Center-Bottom)
- **Upload (가장 좌측)**: 로컬 파일 시스템 탐색기를 열어 이미지 선택 (`handleImageUpload`).
- **Focus/Fit (중앙 좌측)**: 캔버스 줌을 100%로 초기화하거나 선택된 이미지를 화면 중앙으로 정렬 (`handleFocus`).
- **Zoom Out/In (중앙)**: 캔버스를 일정 단계씩 확대/축소. 현재 줌 배율을 숫자로 표시.
- **Panel Toggle (가장 우측)**: 나침반 아이콘. 오른쪽 사이드바 패널을 슬라이딩 방식으로 여닫음 (`setIsRightPanelOpen`).

### 좌측 도구 모음 (Left-Center)
- **Select Mode**: 이미지 선택, 드래그, 리사이징이 가능한 기본 모드.
- **Pan Mode**: 이미지 상호작용을 차단하고 캔버스 전체 시점 이동에 집중하는 모드.
- **Undo/Redo**: 상태 히스토리를 한 단계씩 앞뒤로 이동. 활성화 가능할 때만 불투명도 100% 유지.

### 이미지 노드 제어 바 (Node-Top)
- **Download**: 생성된 이미지의 원본 소스를 PNG로 다운로드.
- **Library (Artboard)**: 해당 이미지의 분석 결과(Phase 1, 2)를 볼 수 있는 아트보드 팝업을 노드 우측에 표시.
- **Delete**: 해당 이미지 및 이로부터 파생된 모든 이미지를 캔버스에서 제거.

## 8. 상호작용 로직 (State Synchronization)
### 슬라이드 바 & SITE PLAN 관계
- **실시간 연동**: 사이드바의 `Angle`, `Altitude`, `Lens` 슬라이더를 조작하면 `SitePlanDiagram`의 카메라 위치와 시야각(FOV)이 즉시 시각적으로 업데이트됨.
- **선택 변경 시**: 캔버스의 다른 이미지를 선택하면, 해당 이미지가 가진 파라미터 값이 슬라이더와 다이어그램에 즉시 반영됨.

### 이미지 업로드 워크플로우
- **동작**: 파일 선택 즉시 캔버스 중앙에 `Mother Image`로 배치.
- **자동 분석**: 업로드 완료 시 자동으로 `isAnalyzing` 상태가 활성화되며, 서버리스 함수를 통해 입면 정보와 시점을 분석함.
- **피드백**: `SitePlanDiagram` 내부에 'Analyzing...' 메시지와 단계별 진행 상황을 노출하여 사용자에게 시각적 진행도를 알림.

## 9. 생성(GENERATE) 프로세스 UX
- **상태 변화**: `GENERATE` 버튼 클릭 시 `isGenerating` 상태가 `true`가 됨.
- **버튼 UI 변경**: 버튼 문구가 `GENERATE` → `CANCEL`로 즉시 변경됨.
- **컨트롤 잠금**: 생성 중에는 슬라이더 조작이 불가능하도록 `opacity-30` 및 `pointer-events-none` 적용.
- **피드백(Loader)**: 선택된 이미지 노드 위에 유리질 리플렉션 효과(`backdrop-blur`)와 함께 회전하는 `Loader2` 오버레이가 나타남.
- **취소**: `CANCEL` 버튼 클릭 시 `AbortController`를 통해 API 요청을 중단하고 UI를 원래 상태로 복구함.

---
*주의: V172 현대화 과정에서 위 모든 상호작용 흐름과 시각적 피드백 로직은 기존과 동일하게 유지되어야 합니다.*
