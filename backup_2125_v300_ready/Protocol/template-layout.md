<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Image to Elevation - 5 Viewpoints (Cross Layout)</title>

<style>
  :root {
    --bg-color: #FFFFFF;     /* V298: Pure White */
    --text-primary: #000000; /* V298 */
    --accent-color: #000000; /* V298 */
  }

  * {
    box-sizing: border-box;
    cursor: default;
  }

  body, html {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    background-color: var(--bg-color);
    overflow: hidden;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; /* V298 */
  }

  .layout-container {
    display: flex;
    width: 100%;
    height: 100%;
    padding: 40px;
    justify-content: center;
    align-items: center;
  }

  .main-panel {
    width: 100%;
    max-width: 1600px;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* V298: 타이틀 삭제 */
  .title-overlay {
    display: none;
  }

  /* Single Image Wrapper */
  .composite-wrapper {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* 렌더링된 단일 통합 십자형 이미지 (건축물 비례 능동 반응) */
  .master-composite-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  /* CSS Grid를 활용한 십자(Cross) 레이아웃 오버레이 */
  .visual-grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas:
      ". rear ."
      "left top right"
      ". front .";
    gap: 8px;
    z-index: 2;
  }

  /* 라벨 공통 속성 */
  .label-item {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    pointer-events: none;
    user-select: none;
  }

  /* 레이아웃 에어리어 할당 */
  .rear  { grid-area: rear; }
  .left  { grid-area: left; }
  .top   { grid-area: top; }
  .right { grid-area: right; }
  .front { grid-area: front; }

  /* 빈 공간 처리 */
  .empty {
    visibility: hidden;
  }

  /* V298: 라벨 스타일 */
  .label-item strong {
    font-size: 12px;            /* V298: 16px → 12px */
    font-weight: 500;
    color: #FFFFFF;             /* V298: 텍스트 흰색 */
    background-color: #000000; /* V298: 배경 검정 */
    width: auto;                /* V298: 100% → auto (인라인 박스) */
    display: inline-block;
    text-align: center;
    padding: 3px;               /* V298: 10px 0 → 3px */
    margin: 0;
    margin-bottom: 12px;        /* V298: 셀 하단에서 12px */
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.9;
  }
</style>
</head>
<body>

  <div class="layout-container">
    <div class="main-panel">
      <h1 class="title-overlay">IMAGE TO ELEVATION: 5-VIEW ORTHOGRAPHIC</h1>

      <div class="composite-wrapper">
        <img src="{{img_url_5view_cross_composite}}" class="master-composite-img" alt="5-View Architectural Sheet">

        <div class="visual-grid-overlay">
          <div class="label-item empty"></div>
          <div class="label-item rear"><strong>REAR</strong></div>
          <div class="label-item empty"></div>

          <div class="label-item left"><strong>LEFT</strong></div>
          <div class="label-item top"><strong>TOP</strong></div>
          <div class="label-item right"><strong>RIGHT</strong></div>

          <div class="label-item empty"></div>
          <div class="label-item front"><strong>FRONT</strong></div>
          <div class="label-item empty"></div>
        </div>
      </div>

    </div>
  </div>

</body>
</html>
