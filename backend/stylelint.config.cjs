// stylelint.config.cjs
module.exports = {
  extends: [
    "stylelint-config-standard-scss"
  ],
  rules: {
    // 빈 소스 허용 (초기 템플릿 작업 시 유용)
    "no-empty-source": null,

    // 중괄호 안에 아무 내용이 없어선 안 됨 (빈 블록 방지)
    "block-no-empty": true,

    // 유효하지 않은 16진수 색상 금지
    "color-no-invalid-hex": true,


    // 중복 속성 선언 방지
    "declaration-block-no-duplicate-properties": true,

    // 0 뒤에 단위 쓰지 않도록 제한 (예: 0px -> 0)
    "length-zero-no-unit": true
  }
};