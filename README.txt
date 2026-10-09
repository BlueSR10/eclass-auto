eClass 영상 자동 넘기기 - 관리용 메모

폴더 구조
- extension\auto.js         실제 매크로 코드 (원본은 이 파일 하나만 고친다)
- extension\manifest.json   크롬 확장 설정 (이름, 실행할 사이트, 아이콘/단축키 등록)
- extension\background.js   크롬 확장 아이콘 클릭 / Alt+Shift+A → ON/OFF 전달
- eclass-auto.user.js       친구 배포용 스크립트 (빌드가 만들어줌, 직접 수정 X)
- 이 폴더 전체가 GitHub 공개 저장소 BlueSR10/eclass-auto (나만 수정 가능)
- build-userscript.ps1      auto.js + Tampermonkey 헤더 → eclass-auto.user.js, 버전 자동 +1
- build.bat                 더블클릭하면 위 스크립트를 실행
- 친구용_설치안내.txt        친구에게 보낼 설명서

동작 요약
- 영상 목록: 100%가 아닌 영상을 연다 → 다 봤으면 왼쪽 목록에서 not_submit 붙은 다음 영상 항목으로
- 영상 화면: (출석인정 - 학습시간) 동안 머문 뒤 여유 없이 출석(종료). 재생 여부와 무관 (학습시간은 화면에 머문 시간으로 쌓임)
  영상이 다른 도메인 iframe이라 접근 못 하는 과목(예: Linear Algebra)이 있어서 영상 상태에 기대지 않는다
  채울 시간을 모를 때(목록을 안 거치고 들어옴)만 영상이 끝나는 것을 기준으로 한다
- "다른 기기에서 시청 중" 확인창은 확인, "출석인정시간보다 적습니다"는 취소 후 처음엔 10초, 그 뒤로는 1분씩 더 대기
- 로그: 최근 300줄이 브라우저에 남는다(컴퓨터/브라우저별로 따로). 버튼 우클릭 → 메뉴에서 "로그 기록 받기"(eclass-auto-log.txt 저장) / "로그 복사" / "로그 지우기",
  또는 F12 콘솔에서 __astraLog()
- 같은 영상을 3번 열어도 100%가 안 되면 건너뜀
- 버튼: 영상 목록에선 항상, 영상 화면에선 ON일 때만 보임
  우클릭 메뉴: 남은 시간 보기(영상 화면) / 건너뛴 영상 다시 시도(3번 시도 기록 초기화) / 로그 받기·복사·지우기
- 직접 영상 목록에 들어오거나 왼쪽 목록을 직접 누르면 OFF (매크로 스스로의 이동은 ON 유지)
  사이트가 뒤로가기로 들어온 목록을 한 번 더 새로고침하므로, 매크로 이동 표시는 30초 동안 지우지 않고 인정한다

코드를 고칠 때
1. extension\auto.js 수정
2. 테스트: 크롬 확장을 켜고 chrome://extensions 에서 새로고침(↻) → eClass 새로고침
   (테스트 중엔 Tampermonkey 스크립트를 꺼둘 것. 둘 다 켜면 두 번 실행됨)
3. build.bat 더블클릭 (build-userscript.ps1 을 실행해 준다)
   → 버전이 자동으로 올라가고 eclass-auto.user.js 가 만들어진다
   ※ 크롬 확장에 보이는 버전(manifest.json의 1.1.0)은 이름표일 뿐이라 안 올라가도 된다.
     크롬 확장은 ↻ 를 누르면 항상 지금 폴더의 auto.js 를 그대로 읽는다
4. GitHub Desktop 에서 eclass-auto 저장소 선택 → Commit → Push
   → 친구들 Tampermonkey가 알아서 업데이트한다 (보통 하루 안)

크롬 확장 처음 설치 (테스트용)
1. chrome://extensions → 오른쪽 위 "개발자 모드" 켜기
2. "압축해제된 확장 프로그램을 로드합니다" → extension 폴더 선택

설치 링크
https://raw.githubusercontent.com/BlueSR10/eclass-auto/main/eclass-auto.user.js
