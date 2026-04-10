# **[System Master Document] App Integration Process (Frontend I/O Model)**

본 문서는 현재 앱(`cai-canvas`)의 "Integration Process"를 시각적 I/O (Input/Output) 프론트엔드 관점에서 정의합니다. 
과거 앱 내부에서 모든 파라미터 추론과 시점 변환(5-IVSP 등)을 처리하던 모놀리식(Monolithic) 구조에서 벗어나, **"하네스 엔지니어링(Harness Engineering) 제어 로직은 외부 시스템으로 이관하고 본 앱은 순수 무한 캔버스 프론트엔드로 동작한다"**는 전제하에 시스템 구성을 명세합니다.

---

## **1. 권한 및 역할의 분리 (Architecture Redefinition)**

### 1-A. 외부 하네스 시스템 (External Harness System - 미래 구축 대상)
*   **역할**: 본 프론트엔드 앱 바깥에서 구축될 핵심 미들웨어/컨트롤러입니다. 
*   업로드된 사진 데이터를 바탕으로 시각·광학적 맥락(안전벨트/Harness)을 구축하고, 개별 백엔드 모듈 연산에 필요한 데이터 오케스트레이션(라우팅)을 100% 담당합니다. 
*   `cai-canvas` 프론트엔드는 시스템 로직 상 이 외부 하네스에 의존(위임)하게 됩니다.

### 1-B. 무한 캔버스 프론트엔드 (Current App: `cai-canvas`)
*   **역할**: 시각적 사용자 인터페이스 제어 및 결과물 시각화 (I/O).
*   **주요 책임**: 사진 업로드 환경 제공(Ingestion), 캔버스 줌/팬 등의 뷰포트 관리, 사용자의 UI 인풋(Viewpoint 슬라이더, 프롬프트 텍스트 등) 수집, 그리고 서버망으로부터 반환된 데이터를 캔버스 상에 배치하는 물리적 렌더링.

### 1-C. 백엔드 연동 구조 (Decoupled Backend Services)
*   `IMAGE TO ELEVATION`, `CHANGE VIEWPOINT`, `SKETCH TO IMAGE` 등 기존의 다양한 기능들은 프론트엔드 내부에 얽힌 로직이 아니라, 각각 고유의 분석 로직과 프롬프트 구성을 가진 **독립된 백엔드 서비스망(Server APIs)** 묶음으로 간주합니다.
*   **"IMAGE TO ELEVATION" 종속성 해제**: 기존처럼 "IMAGE TO ELEVATION을 무조건 먼저 실행해야 CHANGE VIEWPOINT가 작동한다"는 데이터 종속성을 완전히 폐기했습니다. 각 패널은 독립적으로 이미지를 타겟팅하여 자신의 백엔드망과 통신합니다.

---

## **2. PROCESS CONTROL FLOW (프론트엔드 I/O 관점)**

프론트엔드 관점에서 사용자가 이미지를 올리고 최종 결과를 캔버스에서 확인하기까지의 흐름을 3-PHASE로 정의합니다.

### **PHASE 1: I/O Ingestion (프론트엔드 물리적 입력 및 Payload 준비)**
사용자가 애플리케이션에 시각적 소스를 집어넣어, 시스템이 이를 인지하고 통신 페이로드(Payload)를 구성하는 단계입니다.

1.  **Image Upload & Canvas Anchoring (이미지 안착)**
    *   사용자가 `.jpg`, `.png` 등의 건축물 이미지를 캔버스(아트보드)에 업로드.
    *   프론트엔드는 이 이미지의 X/Y 캔버스 절대 좌표, Width/Height 비율, Base64 바이너리 데이터를 상태값(Store)에 할당.
2.  **Context (Payload) Setup**
    *   캔버스에 타겟팅(Select)된 원본 이미지가 존재하면, 프론트엔드는 향후 외부 하네스로 전송할 "기초 컨텍스트 꾸러미(Payload)"를 묶을 준비를 함.
    *   여기에는 원본 소스 이미지 자체뿐 아니라, 사용자가 추가로 입력한 스케치나 캔버스 위의 상대적 좌표 구성물 등이 포함될 수 있음.

### **PHASE 2: Harness & Backend Routing (외부 제어망 위임)**
사용자가 우측 툴 패널(예: CHANGE VIEWPOINT)을 조작하여 "실행(ANALYZE / GENERATE)" 버튼을 누르는 순간, 프론트엔드의 역할은 Payload를 보내고 대기(Loading)하는 상태로 전환됩니다.

1.  **외부 하네스로의 통신 발송 (Request)**
    *   프론트엔드는 Phase 1에서 준비된 Payload(선택한 이미지 및 UI 슬라이더 값 등)를 파라미터화하여 쏘아 보냅니다.
    *   *(현재 아키텍처 상 외부 하네스 미구축 상태에서는, 프론트엔드가 자체적으로 Gemini API 모델에 JSON 프롬프트를 직결하여 이 흐름을 임시 모방하고 있습니다.)*
2.  **독립 백엔드 서비스망 연산 (Harnessing Task)**
    *   전달받은 하네스망은 해당 타겟 모듈(예: CHANGE VIEWPOINT의 `ANALYZE` 3섹션 광학 분석 API망)로 트래픽을 분기합니다. 
    *   모든 심오한 AI 추론, 5면 전개도, 시점 궤도 연산, 맥락 추론은 프론트엔드 밖에서 이뤄집니다.
3.  **UI Waiting State (로딩/피드백)**
    *   이 기간 중 프론트엔드는 "ANALYZING..." 등 시각적 로딩 컴포넌트(Spinner)만 돌리며 UI 상호작용(다른 생성 버튼 클릭 등)을 임시 블락(Lock)합니다.

### **PHASE 3: Canvas Synchronization (프론트엔드 시각화 및 동기화)**
백엔드 엔진에서의 생성 연산이 종료되고 데이터가 다시 프론트엔드로 반환되는 확정 단계입니다.

1.  **데이터 반환 및 Parsing**
    *   프론트엔드는 Base64 형식의 렌더링 이미지와, 이에 귀속된 String/JSON 메타데이터(Angle, Lens, 분석결과 Report 등)를 수신.
2.  **Item Instance 생성 및 Canvas Store 동기화**
    *   프론트엔드는 수신한 반환 객체를 **"새로운 캔버스 아이템 인스턴스(CanvasItem)"**로 인스턴스화합니다.
    *   이때 모체(Mother Image)와의 시각적 위계 배열(예: 아래로 96px 띄워서 자동 배치)을 계산하여 좌표(X,Y)를 확정합니다.
3.  **물리적 렌더링 (Physical Output)**
    *   갱신된 상태가 무한 캔버스 DOM에 마운트되며 시각화 표출 완료. 로딩 상태 스피너가 해제됩니다.
    *   결과물은 고유의 `id`와 `motherId` 파라미터를 유지하여, 추후 무한 확장되는 그래프 구조에서도 자신의 이력(History/Genealogy)을 보존합니다.

---

## **[결론 요약]**
*   이 앱은 무거운 5-IVSP 로직을 쥐고 있는 마스터 브레인이 **아닙니다.**
*   이 앱은 사용자의 입력(이미지, 좌표, 선)을 받아 외부 하네스 엔진에게 연산을 **'주문(Order)'** 하고, 배달된 결과물을 광활한 무한 캔버스라는 공간에 **'전시(Display)'** 하는 **시각적 프론트엔드 프로젝터(Projector)**입니다.
