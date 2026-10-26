# 주식 한입

앱인토스 WebView용 주식 학습 퀴즈입니다. 제공된 엑셀의 1,000문항(기초 334, 중급 333, 고급 333 / 4지선다 500, O/X 500)을 포함합니다.

## 실행

```sh
npm install
npm run dev
```

`npm run build`는 웹 빌드와 앱인토스 `.ait` 번들을 만듭니다.
`npm run build:web`은 GitHub Pages에 올릴 정적 웹 앱만 빌드합니다.

## GitHub Pages

이 저장소의 `main` 브랜치에 푸시하면 GitHub Actions가 웹 앱을 빌드해 Pages에 배포합니다. 저장소 설정의 **Pages → Build and deployment → Source**를 **GitHub Actions**로 선택하세요. 배포 주소는 `https://<사용자명>.github.io/<저장소명>/`입니다.

## 앱인토스 등록 전 설정

`apps-in-toss.config.ts`의 `appName`을 앱인토스 콘솔에 등록한 실제 앱 이름과 일치시켜 주세요. 현재는 개발용 `stock-bite`입니다. 번들은 콘솔에 업로드해 토스 앱에서 최종 테스트해야 합니다.

점수, 저장 문제, 오답 기록은 현재 해당 기기의 WebView 로컬 저장소에 보관됩니다. 여러 사용자 간 랭킹과 기기 간 동기화는 서버 및 사용자 식별 연동이 필요합니다. 랭킹 탭은 현재 개인 학습 점수와 기록을 보여줍니다.

문항을 다시 가져오려면 `python scripts/import_questions.py <xlsx 경로>`를 실행하세요. `openpyxl`이 필요합니다.
