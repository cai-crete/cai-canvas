<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Image to Elevation - 5 Viewpoints</title>

<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">

<style>
  :root {
    --bg-color: #121212;
    --text-primary: #FFFFFF;
    --accent-color: #F4C430; /* LAYOUT.jpg의 메인 옐로우 컬러 참조 */
  }

  * { 
    box-sizing: border-box;
    cursor: default;
  }

  body, html {
    margin: 0; 
    padding: 0; 
    width: 100vw; 
    background-color: var(--bg-color);
    /* overflow: hidden; 삭제하여 스크롤 가능하도록 변경 */
    font-family: 'Pretendard', sans-serif;
  }

  /* 한 페이지(화면)에 하나씩 꽉 차도록 100vh 설정 */
  .layout-container {
    display: flex;
    width: 100%; 
    height: 100vh; 
    padding: 60px 40px 40px 40px;
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

  .title-overlay {
    position: absolute;
    top: -45px; 
    left: 0px;
    font-family: 'Bebas Neue', cursive;
    font-size: 36px;
    color: var(--text-primary);
    z-index: 10;
    margin: 0;
    letter-spacing: 2px;
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

  /* 개별 이미지 (건축물 비례 능동 반응) */
  .master-composite-img {
    width: 100%;
    height: 100%;
    object-fit: contain; 
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  /* 하단 라벨 공통 속성 */
  .label-item {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    pointer-events: none; 
    user-select: none;
    width: 100%;
    height: 100%;
    z-index: 2;
  }

  .label-item strong {
    font-size: 16px;
    font-weight: 500;
    color: var(--bg-color);
    background-color: var(--accent-color);
    width: 100%;
    text-align: center;
    padding: 10px 0;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.9;
  }
</style>
</head>
<body>

  <div class="layout-container">
    <div class="main-panel">
      <h1 class="title-overlay">IMAGE TO ELEVATION: FRONT</h1>
      <div class="composite-wrapper">
        <img src="{{img_url_front}}" class="master-composite-img" alt="Front View">
        <div class="label-item"><strong>FRONT</strong></div>
      </div>
    </div>
  </div>

  <div class="layout-container">
    <div class="main-panel">
      <h1 class="title-overlay">IMAGE TO ELEVATION: RIGHT</h1>
      <div class="composite-wrapper">
        <img src="{{img_url_right}}" class="master-composite-img" alt="Right View">
        <div class="label-item"><strong>RIGHT</strong></div>
      </div>
    </div>
  </div>

  <div class="layout-container">
    <div class="main-panel">
      <h1 class="title-overlay">IMAGE TO ELEVATION: REAR</h1>
      <div class="composite-wrapper">
        <img src="{{img_url_rear}}" class="master-composite-img" alt="Rear View">
        <div class="label-item"><strong>REAR</strong></div>
      </div>
    </div>
  </div>

  <div class="layout-container">
    <div class="main-panel">
      <h1 class="title-overlay">IMAGE TO ELEVATION: LEFT</h1>
      <div class="composite-wrapper">
        <img src="{{img_url_left}}" class="master-composite-img" alt="Left View">
        <div class="label-item"><strong>LEFT</strong></div>
      </div>
    </div>
  </div>

  <div class="layout-container">
    <div class="main-panel">
      <h1 class="title-overlay">IMAGE TO ELEVATION: TOP</h1>
      <div class="composite-wrapper">
        <img src="{{img_url_top}}" class="master-composite-img" alt="Top View">
        <div class="label-item"><strong>TOP</strong></div>
      </div>
    </div>
  </div>

</body>
</html>