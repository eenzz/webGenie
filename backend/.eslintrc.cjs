// eslint.config.cjs
module.exports = {
  env: {
    browser: true,  // 브라우저 환경 전역 변수 사용 허용 (e.g. window, document)
    es2021: true,   // ES2021 문법 사용 허용
    node: true      // Node.js 전역 변수 사용 허용
  },
  extends: [
    "eslint:recommended"  // ESLint 기본 권장 규칙 적용
  ],
  parserOptions: {
    ecmaVersion: "latest",    // 최신 ECMAScript 문법 허용
    sourceType: "module"      // import/export 문법 사용 허용
  },
  rules: {
    // 세미콜론은 항상 사용 (문법 오류 방지)
    // "semi": ["error", "always"],

    // 큰따옴표만 사용 ("string")
    "quotes": ["error", "double"],

    // const 사용 가능한 경우 const 권장
    // "prefer-const": "error",

    // 같은 변수 중복 선언 금지
    "no-redeclare": "error",
// 👇 이 설정을 추가하면 알 수 없는 룰 무시 가능
"declaration-block-tralling-semicolon": null,
    // 불필요한 escape 문자 경고 (예: \” 같은 경우)
    // "no-useless-escape": "warn",

    // 내용 없는 빈 함수 경고
    "no-empty-function": "warn",

    // 항상 ===, !== 사용 (==, != 금지)
    "eqeqeq": "error",

    // 정의되지 않은 변수 사용 금지
    "no-undef": "error",

    // 사용되지 않는 변수는 경고 처리
    "no-unused-vars": "warn",

    // 콘솔 사용은 허용 (디버깅 용도)
    "no-console": "off",

    // typeof 연산자 비교 시 정확한 타입 문자열 사용 (오타 방지)
    // "valid-typeof": "error"
  }
};