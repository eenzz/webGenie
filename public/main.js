let editors = {};
//탭전환 처리
let currentSubmission = null; // 현재 선택된 제출물 저장
let codeMirrorInstance = null; // 현재 CodeMirror 인스턴스 저장
// 탭 클릭하면 선택한 제출물의 html/css/js 표시

let mypageCodeMirror = null; // 전역변수로 잡기
let currentStudent = null;
let currentSubmissionDashboard = null;
let dashboardCodeMirror = null;

let isStudentListCollapsed = false;
let isSubmissionListCollapsed = false;
let lastGeneratedFeedback = "";

// 배포: 같은 도메인(origin)으로, 로컬 개발: http://localhost:5005
const API_BASE =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:5005'
    : 'https://webgenie-atnn.onrender.com';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'omit' });
  if (res.status === 404) return null;    
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch {
    console.error('❗Non-JSON GET 응답:', res.status, text.slice(0,200));
    throw new Error(`GET ${path} returned non-JSON (status ${res.status})`);
  }
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
//   return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
  
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch {
      console.error('❗Non-JSON POST 응답:', res.status, text.slice(0,200));
      throw new Error(`POST ${path} returned non-JSON (status ${res.status}). API_BASE가 백엔드인지 확인하세요.`);
    }
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

async function explainLinterMessages(messages, lang) {
    try {
        const response = await fetch(`${API_BASE}/gpt-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, lang })
        });
        const data = await response.json();
        return data.feedback;
    } catch (err) {
        console.error("GPT API 요청 실패:", err);
        return "❗ GPT API 요청 실패";
    }
}


function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


function lintHTML(html) {
    const rules = {
        "tagname-lowercase": true,
        "attr-lowercase": true,
        "attr-value-double-quotes": true,
        "doctype-first": true,
        "tag-pair": true,
        "spec-char-escape": true,
        "id-unique": true,
        "src-not-empty": true,
        "alt-require": true,
        "attr-no-duplication": true
    };

    const results = HTMLHint.HTMLHint.verify(html, rules);
    return results.map(r => `🔸 ${r.message} (line ${r.line}, col ${r.col})`).join("\n") || "✅ HTML 문제 없음!";
}
async function lintCSS(css) {
    try {
        const res = await fetch(`${API_BASE}/lint/css`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cssCode: css })
        });
        const data = await res.json();
        return data.feedback || "⚠️ CSS 피드백 생성 실패";
    } catch (err) {
        console.error("CSS 피드백 요청 실패:", err);
        return "⚠️ CSS 피드백 요청 실패";
    }
}
function lintJS(js) {
    const result = JSHINT(js);
    if (!result) {
        return JSHINT.errors.map(e => `🔸 ${e.reason} (line ${e.line})`).join("\n");
    }
    return "✅ JS 문제 없음!";
}

document.addEventListener("DOMContentLoaded", () => {

    function showLoginScreen() {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("signupScreen").style.display = "none";

        // 로그인 입력값 초기화
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";

        // 포커스도 주면 UX 좋아짐
        document.getElementById("username").focus();
    }

    if (localStorage.getItem('loggedIn') === 'true') {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("mainScreen").style.display = "flex";
        // CodeMirror 에디터 전부 refresh
        Object.values(editors).forEach(editor => editor.refresh());
    }
    //로그인버튼
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {

        document.getElementById("loginBtn").addEventListener("click", async () => {
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!username || !password) {
                alert("아이디와 비밀번호를 모두 입력하세요.");
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // 로그인 성공했을 때
                    localStorage.setItem("currentUser", JSON.stringify({
                        id: data.user.id,
                        username: data.user.username,
                        role: data.user.role
                    }));
                    alert(data.message); // 로그인 성공!
                    localStorage.setItem('loggedInUser', JSON.stringify(data.user)); // 사용자 정보 저장
                    localStorage.setItem('currentScreen', data.user.role === 'teacher' ? 'dashboard' : 'ide');

                    if (data.user.role === 'teacher') {

                        document.getElementById("loginScreen").style.display = "none";
                        document.getElementById("dashboardScreen").style.display = "flex";
                        loadDashboardStudents(); // 대시보드 데이터 불러오기
                    } else {
                        document.getElementById("loginScreen").style.display = "none";
                        document.getElementById("mainScreen").style.display = "flex";
                        loadIDECachedCode(); // IDE 데이터 불러오기

                        // CodeMirror 에디터 전부 refresh
                        Object.values(editors).forEach(editor => editor.refresh());

                    }
                } else {
                    alert(`❗ 에러: ${data.message}`);
                }
            } catch (error) {
                console.error('로그인 요청 실패:', error);
                alert('서버 연결에 실패했습니다.');
            }
        });


        const defaultHtml = `
 <!DOCTYPE html>
 <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
            
    </body>
</html>
    `.trim();
        editors.html = CodeMirror.fromTextArea(document.getElementById("htmlEditor"), {
            lineNumbers: true,
            mode: "htmlmixed",
            theme: "tomorrow-night-bright"
        });

        editors.css = CodeMirror.fromTextArea(document.getElementById("cssEditor"), {
            lineNumbers: true,
            mode: "css",
            theme: "tomorrow-night-bright"
        });

        editors.js = CodeMirror.fromTextArea(document.getElementById("jsEditor"), {
            lineNumbers: true,
            mode: "javascript",
            theme: "tomorrow-night-bright"
        });

        // ✨ HTML 에디터에 기본 템플릿 세팅
        editors.html.setValue(defaultHtml);
        // 초기: HTML 에디터만 보이게
        for (const key in editors) {
            editors[key].getWrapperElement().classList.remove('active');
        }
        editors.html.getWrapperElement().classList.add('active');

        // 탭 클릭
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.tab-btn.active').classList.remove('active');
                btn.classList.add('active');

                for (const key in editors) {
                    editors[key].getWrapperElement().classList.remove('active');
                }
                const selectedEditor = editors[btn.dataset.lang];
                selectedEditor.getWrapperElement().classList.add('active');
                selectedEditor.refresh();
            });
        });
        // document.getElementById("runBtn").addEventListener('click', async () => {
        //     const html = editors.html.getValue();
        //     const css = editors.css.getValue();
        //     const js = editors.js.getValue();
        
        //     // 서버로 코드 검사 요청
        //     const response = await fetch("/lint-code", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({ html, css, js })
        //     });
        //     const data = await response.json();
        
        //     // 🔍 언어별 피드백 분리
        //     const htmlFeedback = await lintHTML(html);
        //     const cssFeedback = await lintCSS(css);
        //     const jsFeedback = await lintJS(js);
        
        //     // 🧠 GPT에 넘길 피드백 메시지 포맷 정리
        //     const formattedFeedback = `
        // HTML 오류:
        // ${htmlFeedback || "없음"}
        
        // CSS 오류:
        // ${cssFeedback || "없음"}
        
        // JavaScript 오류:
        // ${jsFeedback[0]?.messages?.map(msg => `- ${msg.message}`).join('\n') || "없음"}
        // `.trim();
        
        //     // 🌟 GPT 번역 요청
        //     const gptResponse = await fetch("/gpt-feedback", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({
        //             messages: formattedFeedback,
        //             lang: "HTML/CSS/JS"
        //         })
        //     });
        
        //     const gptData = await gptResponse.json();
        //     const gptFeedback = gptData.feedback || "❗ GPT 응답 없음";
        
        //     // 출력
        //     document.getElementById("feedback").innerHTML = gptFeedback.replace(/\n/g, "<br>");
        
        //     if (!data.success) {
        //         alert("❗ 오류가 발견되어 실행할 수 없습니다. 피드백을 확인하세요.");
        //         return;
        //     }
        
        //     // 실행 결과 iframe에 렌더링
        //     const output = `
        // <!DOCTYPE html>
        // <html lang="ko">
        // <head><meta charset="UTF-8"><style>${css}</style></head>
        // <body>${html}<script>${js}<\/script></body>
        // </html>
        //     `;
        //     document.getElementById("outputFrame").srcdoc = output;
        // });


        document.getElementById("runBtn").addEventListener('click', async () => {
            const html = editors.html.getValue();
            const css = editors.css.getValue();
            const js = editors.js.getValue();
        
        
            let runtimeError = "";
        
            // 먼저 preview에 삽입해서 실행 (오류 감지 유도)
            const previewFrame = document.getElementById("outputFrame");
            previewFrame.srcdoc = `
            <!DOCTYPE html>
            <html>
            <head><style>${css}</style></head>
            <body>
                ${html}
                <script>
                    try {
                        ${js}
                    } catch (err) {
                        parent.postMessage({ type: "runtimeError", message: err.message }, "*");
                    }
                <\/script>
            </body>
            </html>`;
        
            // 100~300ms 정도 기다린 후 오류 메시지 수신되도록 함
            await new Promise(resolve => setTimeout(resolve, 300));
        
            // 메시지 이벤트 한 번만 받을 수 있도록 Promise로 래핑
            runtimeError = await new Promise(resolve => {
                const handler = event => {
                    if (event.data?.type === "runtimeError") {
                        window.removeEventListener("message", handler);
                        resolve(`🔴 런타임 오류: ${event.data.message}`);
                    }
                };
                window.addEventListener("message", handler);
                // 타임아웃: 오류 없으면 빈 문자열 반환
                setTimeout(() => {
                    window.removeEventListener("message", handler);
                    resolve("");
                }, 300);
            });
        
            // 서버에 lint + gpt 피드백 요청
            const response = await fetch(`${API_BASE}/lint-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ html, css, js, runtimeError })
            });
            const data = await response.json();
        
        
            lastGeneratedFeedback = data.feedback;
            // 출력
            const escapedFeedback = escapeHTML(data.feedback).replace(/\n/g, "<br>");
            document.getElementById("feedback").innerHTML = escapedFeedback;
        
            if (!data.success) {
                alert("❗ 오류가 발견되어 실행할 수 없습니다. 피드백을 확인하세요.");
                return;
            }
        
            // 문제 없을 경우 다시 실행
            const safeOutput = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>${js}<\/script>
            </body>
            </html>`;
            previewFrame.srcdoc = safeOutput;
        
            // 제목 변경
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            document.getElementById("browserTitle").textContent = titleMatch?.[1]?.trim() || "Untitled";
        
            // 알림 리셋
            ["htmlChanged", "cssChanged", "jsChanged"].forEach(id => {
                const indicator = document.getElementById(id);
                if (indicator) {
                    indicator.classList.remove('visible');
                    indicator.innerText = "";
                }
            });
        
            lastGeneratedFeedback = data.feedback;
        });



        // document.getElementById("runBtn").addEventListener('click', async () => {
        //     const html = editors.html.getValue();
        //     const css = editors.css.getValue();
        //     const js = editors.js.getValue();
        
        //     let runtimeError = "";  // 🔴 실행 중 런타임 오류 저장
        //     console.log("🔍 실행 요청: HTML, CSS, JS 코드 검사 시작");
        //     // 🔸 메시지 리스너 등록 (한 번만)
        //     window.addEventListener("message", async function handleRuntimeError(event) {
        //         console.log("🔴 런타임 오류 감지:", event.data);
        //         if (event.data?.type === "runtimeError") {
        //             runtimeError = `🔴 런타임 오류: ${event.data.message}`;
        //         }
        
        //         // 검사 요청 보내기
        //         const response = await fetch("/lint-code", {
            
        //             method: "POST",
        //             headers: { "Content-Type": "application/json" },
        //             body: JSON.stringify({ html, css, js, runtimeError })
        //         });
        //         const data = await response.json();
        //         console.log("🔍 서버 응답:", data);
        //         // 피드백 출력
        //         const escapedFeedback = escapeHTML(data.feedback).replace(/\n/g, "<br>");
        //         document.getElementById("feedback").innerHTML = escapedFeedback;
        //         console.log("✨ 피드백 출력:", escapedFeedback);
        //         if (!data.success) {
        //             alert("❗ 오류가 발견되어 실행할 수 없습니다. 피드백을 확인하세요.");
        //             return;
        //         }
        
        //         // 문제가 없을 때 실행
        //         const output = `
        // <!DOCTYPE html>
        // <html lang="ko">
        // <head>
        //     <meta charset="UTF-8">
        //     <style>${css}</style>
        // </head>
        // <body>
        //     ${html}
        //     <script>
        //         try {
        //             ${js}
        //         } catch (err) {
        //             parent.postMessage({ type: "runtimeError", message: err.message }, "*");
        //         }
        //     <\/script>
        // </body>
        // </html>`;
        //         lastGeneratedFeedback = data.feedback;
        //         const iframe = document.getElementById("outputFrame");
        //         iframe.srcdoc = output;
        
        //         // ✨ title 추출
        //         let pageTitle = "Untitled";
        //         const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        //         if (titleMatch && titleMatch[1]) {
        //             pageTitle = titleMatch[1].trim();
        //         }
        //         document.getElementById("browserTitle").textContent = pageTitle;
        
        //         // ✨ 변경 알림 리셋
        //         ["htmlChanged", "cssChanged", "jsChanged"].forEach(id => {
        //             const indicator = document.getElementById(id);
        //             if (indicator) {
        //                 indicator.classList.remove('visible');
        //                 indicator.innerText = "";
        //             }
        //         });
        
        //         // 🔁 메시지 리스너는 한 번만 작동하고 제거
        //         window.removeEventListener("message", handleRuntimeError);
        //     }, { once: true });
        
        //     // 🔸 오류 감지를 위해 먼저 iframe 실행
        //     const previewFrame = document.getElementById("outputFrame");
        //     previewFrame.srcdoc = `
        // <!DOCTYPE html>
        // <html>
        // <head><style>${css}</style></head>
        // <body>
        //     ${html}
        //     <script>
        //         try {
        //             ${js}
        //         } catch (err) {
        //             parent.postMessage({ type: "runtimeError", message: err.message }, "*");
        //         }
        //     <\/script>
        // </body>
        // </html>`;
        // }); 

        // Save 버튼 클릭 시 압축 저장
        document.getElementById("saveBtn").addEventListener('click', () => {
            const zip = new JSZip();

            // CodeMirror 에디터 내용 읽기
            const htmlContent = editors.html.getValue();
            const cssContent = editors.css.getValue();
            const jsContent = editors.js.getValue();

            // index.html 파일 내용 추가 (link, script 연결도 함께)
            const fullHtmlContent = `
<!DOCTYPE html>
<html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>My Project</title>
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
        ${htmlContent}
        <script src="main.js"></script>
    </body>
</html>`.trim();
            // 파일 추가
            zip.file("index.html", fullHtmlContent);
            zip.file("style.css", cssContent);
            zip.file("main.js", jsContent);

            // 파일 이름 입력받기
            const zipFileName = prompt("저장할 압축파일 이름을 입력하세요 (확장자는 자동 추가됩니다)", "my_project");

            if (zipFileName) {
                // zip 생성 후 다운로드
                zip.generateAsync({ type: "blob" })
                    .then(content => {
                        saveAs(content, zipFileName + ".zip");

                        // ✨ 저장 성공 후 표시
                        document.getElementById("uploadFileName").textContent = `${zipFileName}.zip 저장됨`;
                    });
            }
        });
        document.getElementById("uploadBtn").addEventListener('click', () => {
            document.getElementById("uploadZip").click();
        });

        document.getElementById("uploadZip").addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const zip = new JSZip();
            zip.loadAsync(file)
                .then(contents => {

                    // ✨ 업로드 성공 후 표시
                    document.getElementById("uploadFileName").textContent = `${file.name} 업로드됨`;

                    // 현재 에디터 상태 저장
                    const currentHtml = editors.html.getValue();
                    const currentCss = editors.css.getValue();
                    const currentJs = editors.js.getValue();

                    // index.html 읽기
                    if (contents.files['index.html']) {
                        contents.files['index.html'].async('string').then(html => {
                            editors.html.setValue(html.trim());

                            if (html.trim() !== currentHtml.trim()) {
                                document.getElementById("htmlChanged").classList.add('visible');
                                document.getElementById("htmlChanged").innerText = "변경됨!";
                            } else {
                                document.getElementById("htmlChanged").classList.remove('visible');
                                document.getElementById("htmlChanged").innerText = "";
                            }
                        });
                    }

                    // style.css 읽기
                    if (contents.files['style.css']) {
                        contents.files['style.css'].async('string').then(css => {
                            editors.css.setValue(css.trim());

                            if (css.trim() !== currentCss.trim()) {
                                document.getElementById("cssChanged").classList.add('visible');
                                document.getElementById("cssChanged").innerText = "변경됨!";
                            } else {
                                document.getElementById("cssChanged").classList.remove('visible');
                                document.getElementById("cssChanged").innerText = "";
                            }
                        });
                    }

                    // main.js 읽기
                    if (contents.files['main.js']) {
                        contents.files['main.js'].async('string').then(js => {
                            editors.js.setValue(js.trim());

                            if (js.trim() !== currentJs.trim()) {
                                document.getElementById("jsChanged").classList.add('visible');
                                document.getElementById("jsChanged").innerText = "변경됨!";
                            } else {
                                document.getElementById("jsChanged").classList.remove('visible');
                                document.getElementById("jsChanged").innerText = "";
                            }
                        });
                    }

                    document.getElementById("uploadZip").value = "";
                })
                .catch(err => {
                    console.error("압축 해제 실패:", err);
                    alert("잘못된 zip 파일이거나 파일 구조가 올바르지 않습니다!");
                });
        });
        document.getElementById("newBtn").addEventListener('click', () => {
            const defaultHtml = `
 <!DOCTYPE html>
 <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
            
    </body>
</html>
        `.trim();

            // ✨ New 버튼 눌렀을 때
            editors.html.setValue(defaultHtml); // HTML은 기본 템플릿
            editors.css.setValue('');            // CSS 비움
            editors.js.setValue('');             // JS 비움

            // 파일명 표시를 '새 파일'로
            document.getElementById("uploadFileName").textContent = '새 파일';

            // 변경 알림 리셋
            ["htmlChanged", "cssChanged", "jsChanged"].forEach(id => {
                const indicator = document.getElementById(id);
                if (indicator) {
                    indicator.classList.remove('visible');
                    indicator.innerText = "";
                }
            });
        });
        // 공통 로그아웃 처리 함수
        function logoutAndRedirect() {
            localStorage.clear();
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("dashboardScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("signupScreen").style.display = "none";
            document.getElementById("loginScreen").style.display = "flex";
            document.getElementById("username").value = '';
            document.getElementById("password").value = '';
            document.getElementById("username").focus();
            // 전역 변수 초기화
            currentStudent = null;
            currentSubmissionDashboard = null;
            dashboardCodeMirror = null;
            currentSubmission = null;
            mypageCodeMirror = null;

            // UI 초기화 또는 리로드
            location.reload();
        }

        // 학생용: 로그아웃 모달 띄우기
        document.getElementById("logoutBtn").addEventListener('click', () => {
            document.getElementById("logoutModal").classList.remove('hidden');
        });
        document.getElementById("logoutBtnMypage").addEventListener('click', () => {
            document.getElementById("logoutModal").classList.remove('hidden');
        });


        // 모달 내 "확인" 클릭 시
        document.getElementById("confirmLogoutBtn").addEventListener('click', () => {
            logoutAndRedirect();
            document.getElementById("logoutModal").classList.add('hidden');
        });

        // 모달 내 "취소" 클릭 시
        document.getElementById("cancelLogoutBtn").addEventListener('click', () => {
            document.getElementById("logoutModal").classList.add('hidden');
        });
        // 공통 모달 사용으로 통일하는 방식 추천
        document.getElementById("logoutBtnDashboard").addEventListener('click', () => {
            document.getElementById("logoutModal").classList.remove('hidden');
        });
        // IDE → MyPage 이동 버튼
        document.getElementById("goToMyPageBtn").addEventListener('click', () => {
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "flex";
            loadAssignedTeacher();
        });

        // MyPage → IDE 돌아가기 버튼
        document.getElementById("backToIDEBtn").addEventListener('click', () => {
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("mainScreen").style.display = "flex";
        });


        // Submit 버튼 클릭
        document.getElementById("submitBtn").addEventListener('click', async () => {
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            const htmlCode = editors.html.getValue();
            const cssCode = editors.css.getValue();
            const jsCode = editors.js.getValue();
            const res = await fetch(`${API_BASE}/submit`, {
            // const res = await fetch("submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: currentUser.id,
                    html_code: htmlCode,
                    css_code: cssCode,
                    js_code: jsCode,
                    output: generateOutput(htmlCode, cssCode, jsCode),
                    feedback: lastGeneratedFeedback || "피드백 없음",
                    version: new Date().toISOString()
                })
            });
            const data = await res.json();
            alert(data.message);
            // const submission = {
            //     date: new Date().toISOString().split('T')[0],
            //     version: `v${Date.now()}`,
            //     html: htmlCode,    // ✨
            //     css: cssCode,      // ✨
            //     js: jsCode,        // ✨
            //     output: generateOutput(htmlCode, cssCode, jsCode),
            //     feedback: "자동 피드백: 기본 검사 완료!"
            // };
            // const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
            // // let submissions = JSON.parse(localStorage.getItem('submissions')) || [];
            // submissions.push(submission);
            // localStorage.setItem('submissions', JSON.stringify(submissions));

        });

        // HTML + CSS + JS 조합해서 iframe 출력용 생성
        function generateOutput(html, css, js) {
            return `
  <!DOCTYPE html>
  <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <style>${css}</style>
    </head>
    <body>
        ${html}
        <script>${js}<\/script>
    </body>
  </html>
    `.trim();
        }
        function initializeMyPageCodeMirror() {
            const container = document.getElementById("submittedCode");

            if (!container) {
                console.warn("📛 submittedCode DOM이 없습니다.");
                return;
            }

            // CodeMirror가 이미 존재한다면 재사용 (초기화 중복 방지)
            if (mypageCodeMirror) {
                mypageCodeMirror.setValue("// 제출물을 선택하세요!");
                mypageCodeMirror.setOption("mode", "htmlmixed");
                mypageCodeMirror.refresh();
                return;
            }

            // 새로 생성
            mypageCodeMirror = CodeMirror(container, {
                value: "// 제출물을 선택하세요!",
                mode: "htmlmixed",
                theme: "tomorrow-night-bright",
                lineNumbers: true,
                readOnly: true
            });

            // 반드시 DOM이 보인 뒤에 refresh()
            setTimeout(() => {
                mypageCodeMirror.refresh();
            }, 0);
        }
        async function loadMyPageSubmissions() {
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            const data=await apiGet(`/submissions/${currentUser.id}`);

            // const res=await apiGet(`/submissions/${studentId}`);
            // const res = await fetch(`http://localhost:5005/submissions/${currentUser.id}`);
            // const data = await res.json();

            const list = document.getElementById("submissionList");
            list.innerHTML = "";


            data.submissions.forEach((sub, i) => {
                const li = document.createElement("li");
                li.textContent = sub.version || sub.submitted_at;
                li.dataset.submissionId = sub.id;

                // 🔥 여기가 빠졌거나 잘못됐을 수 있음
                li.addEventListener("click", () => {
                    showSubmissionDetail(data.submissions, i);
                });

                list.appendChild(li);
            });

            // ✅ 저장해둔 제출물도 localStorage에 다시 저장
            localStorage.setItem("submissions", JSON.stringify(data.submissions));
            loadAssignedTeacher();
            // console.log("서버 응답 확인:", data);
        }
        function showSubmissionDetail(submissions, index) {
            // console.log("✅ showSubmissionDetail 호출됨");
            // console.log("👉 선택된 제출물:", submissions[index]);
            currentSubmission = submissions[index];

            // ✨ 탭 초기화: HTML 탭을 active로
            document.querySelectorAll('.tab-buttons .tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.lang === 'html') {
                    btn.classList.add('active');
                }
            });

            // ✨ 코드 영역 초기화: HTML 코드 보여주기
            setTimeout(() => {
                showCode('html');
            }, 0);

            // Output iframe 결과 넣기
            currentSubmission.output = generateOutput(currentSubmission.html_code, currentSubmission.css_code, currentSubmission.js_code);

            document.getElementById('submittedOutput').srcdoc = currentSubmission.output;
            // console.log("✅ 제출물의 output:", currentSubmission.output);

            // Feedback 텍스트 표시
            document.getElementById('submittedFeedback').textContent = currentSubmission.feedback;
        }
        function restoreLastSelectedSubmission() {
            const submissions = JSON.parse(localStorage.getItem('submissions')) || [];
            const selectedIndex = localStorage.getItem('selectedSubmissionIndex');

            if (selectedIndex !== null && submissions[selectedIndex]) {
                showSubmissionDetail(submissions, selectedIndex);
            }
        }

        //IDE에서 MyPage로 이동할 때 loadMyPageSubmissions() 호출!
        document.getElementById("goToMyPageBtn").addEventListener('click', () => {
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "flex";
            loadMyPageSubmissions(); // ✨ 목록 불러오기 추가
            loadAssignedTeacher();
            document.getElementById('showTeacherAssignBtn').addEventListener('click', () => {
                const box = document.getElementById('teacherAssignBox');
                box.style.display = box.style.display === 'none' ? 'block' : 'none';
                if (box.style.display === 'block') {
                    loadAssignedTeacher(); // 담당 교사 불러오기
                }
            });
            loadAssignedTeacher(); // 담당 교사 불러오기
            
        });
        async function loadAssignedTeacher() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const data=await apiGet(`/my-teacher/${currentUser.id}`);
            // const res=await apiGet(`/my-teacher/${currentUser.id}`);
            // const res = await fetch(`http://localhost:5005/my-teacher/${currentUser.id}`);
            // const data = await res.json();

            const teacherBox = document.getElementById("teacherAssignStatus");
            teacherBox.innerHTML = ""; // 초기화

            if (data && data.teachers && data.teachers.length > 0){
            // if (res.ok && data.teachers && data.teachers.length > 0) {
                data.teachers.forEach(teacher => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        📘 ${teacher.name} (${teacher.username})
                        <button class="remove-teacher-btn" data-id="${teacher.id}">❌</button>
                    `;
                    teacherBox.appendChild(div);
                });


            } else {
                teacherBox.textContent = "📘 등록된 교사가 없습니다.";
            }
            // 삭제 버튼 이벤트 등록
            document.querySelectorAll(".remove-teacher-btn").forEach(btn => {
                btn.addEventListener('click', async () => {
                    const teacherId = btn.dataset.id;
                    if (!confirm("이 담당 교사를 삭제하시겠습니까?")) return;

                    const res = await fetch(`${API_BASE}/remove-teacher`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            student_id: currentUser.id,
                            teacher_id: teacherId
                        })
                    });
                    const result = await res.json();
                    alert(result.message);
                    loadAssignedTeacher(); // 갱신
                });
            });

        }
        async function removeAssignedTeacher() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const res = await fetch(`${API_BASE}/remove-teacher`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: currentUser.id })
            });

            const data = await res.json();
            alert(data.message);
            loadAssignedTeacher();
        }
        document.getElementById('removeTeacherBtn').addEventListener('click', async () => {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) return;

            if (!confirm("담당 교사를 삭제하시겠습니까?")) return;

            try {
                const res = await fetch(`${API_BASE}/remove-teacher`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id: currentUser.id })
                });
                const data = await res.json();
                alert(data.message);
                loadAssignedTeacher(); // 상태 갱신
            } catch (err) {
                console.error(err);
                alert('서버 오류로 삭제에 실패했습니다.');
            }
        });
        function attachRemoveTeacherHandler() {
            const btn = document.getElementById("removeTeacherBtn");
            if (btn) {
                btn.addEventListener('click', removeAssignedTeacher);
            }
        }


        function showCode(lang) {
            if (!currentSubmission || !mypageCodeMirror) return;

            // const codeContent = currentSubmission[lang];

            const code = currentSubmission[`${lang}_code`];
            // console.log(`✅ ${lang}_code 내용:`, code);  

            mypageCodeMirror.setValue(code || ""); // ✨ setValue만
            mypageCodeMirror.setOption('mode', lang === 'html' ? 'htmlmixed' : lang);
            mypageCodeMirror.refresh();
        }

        // 마이페이지-탭 클릭 이벤트 연결
        document.querySelectorAll('.code-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.code-tab-btn.active').classList.remove('active');
                btn.classList.add('active');
                const lang = btn.dataset.lang;
                showCode(lang);
            });
        });

        //ide화면에 입력한 코드를 submit
        function submitCode() {
            const htmlCode = editors.html.getValue();
            const cssCode = editors.css.getValue();
            const jsCode = editors.js.getValue();

            const submission = {
                date: new Date().toISOString().split('T')[0],
                version: `v${Date.now()}`,
                html: htmlCode,
                css: cssCode,
                js: jsCode,
                output: generateOutput(htmlCode, cssCode, jsCode),
                feedback: "자동 피드백 생성 예정" // 나중에 linter 결과 넣자
            };

            // 기존 저장된 제출 목록 가져오기
            let submissions = JSON.parse(localStorage.getItem('submissions')) || [];
            submissions.push(submission);

            // 저장
            localStorage.setItem('submissions', JSON.stringify(submissions));

            alert("제출 완료!");
        }

        function switchToIDE() {
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("mainScreen").style.display = "flex";
            localStorage.setItem('currentScreen', 'ide'); // ✨ 저장
        }

        function switchToMyPage() {
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "flex";
            loadMyPageSubmissions();
            loadAssignedTeacher();
            if (!mypageCodeMirror) { // ✨ 이미 만들어진 거 없으면
                initializeMyPageCodeMirror();
            } else {
                // ❗ 이미 있으면 안내 문구로 초기화
                mypageCodeMirror.setValue("// 제출물을 선택하세요!");
                mypageCodeMirror.setOption('mode', 'htmlmixed');
            }


            localStorage.setItem('currentScreen', 'mypage'); // ✨ 저장
        }
        document.getElementById("goToMyPageBtn").addEventListener('click', switchToMyPage);
        document.getElementById("backToIDEBtn").addEventListener('click', switchToIDE);


        const currentScreen = localStorage.getItem('currentScreen') || 'login';

        if (currentScreen === 'mypage') {
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "flex";
            document.getElementById("signupScreen").style.display = "none";

            initializeMyPageCodeMirror();
            loadMyPageSubmissions();
            document.getElementById('showTeacherAssignBtn').addEventListener('click', () => {
                const box = document.getElementById('teacherAssignBox');
                box.style.display = box.style.display === 'none' ? 'block' : 'none';
            });

            document.getElementById('assignTeacherBtn').addEventListener('click', async () => {
                const currentUser = JSON.parse(localStorage.getItem('currentUser')); // 🔥 이 줄 추가
                const teacherUsername = document.getElementById('teacherUsernameInput').value.trim();


                if (!currentUser) {
                    alert("로그인 정보가 없습니다. 다시 로그인해주세요.");
                    return;
                }
                const studentId = currentUser.id;
                if (!teacherUsername) {
                    return alert('담당 교사 아이디를 입력하세요.');
                }

                try {
                    const data=await apiPost('/assign-teacher-from-mypage',{
                        student_id: studentId,
                        teacher_username: teacherUsername
                    });
                    //
                    // const res = await fetch('${API_BASE}/assign-teacher-from-mypage', {
                    //     method: 'POST',
                    //     headers: { 'Content-Type': 'application/json' },
                    //     body: JSON.stringify({
                    //         student_id: studentId,
                    //         teacher_username: teacherUsername
                    //     })
                    // });

                    // const data = await res.json();
                    document.getElementById('teacherAssignMessage').textContent = data.message;

                    document.getElementById('teacherUsernameInput').value = '';
                    

                } catch (err) {
                    console.error(err);
                    document.getElementById('teacherAssignMessage').textContent = '서버 오류가 발생했습니다.';
                }

                loadAssignedTeacher(); // 갱신
            });
        }
        else if (currentScreen === 'ide') {
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("dashboardScreen").style.display = "none";
            document.getElementById("mainScreen").style.display = "flex";
            document.getElementById("signupScreen").style.display = "none";

            loadIDECachedCode();
        }
        else if (currentScreen === 'dashboard') {
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("dashboardScreen").style.display = "flex";
            document.getElementById("signupScreen").style.display = "none";

            loadDashboardStudents();

        } else if (currentScreen == 'signup') {
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("dashboardScreen").style.display = "none";
            document.getElementById("signupScreen").style.display = "flex";
        }
        else {
            // 기본은 로그인 화면
            document.getElementById("loginScreen").style.display = "flex";
            document.getElementById("mainScreen").style.display = "none";
            document.getElementById("mypageScreen").style.display = "none";
            document.getElementById("dashboardScreen").style.display = "none";
            document.getElementById("signupScreen").style.display = "none";
        }

        function cacheCurrentCode() {
            localStorage.setItem('cachedHTML', editors.html.getValue());
            localStorage.setItem('cachedCSS', editors.css.getValue());
            localStorage.setItem('cachedJS', editors.js.getValue());
        }
        editors.html.on('change', cacheCurrentCode);
        editors.css.on('change', cacheCurrentCode);
        editors.js.on('change', cacheCurrentCode);

        function loadIDECachedCode() {
            const cachedHTML = localStorage.getItem('cachedHTML');
            const cachedCSS = localStorage.getItem('cachedCSS');
            const cachedJS = localStorage.getItem('cachedJS');

            if (cachedHTML !== null) editors.html.setValue(cachedHTML);
            if (cachedCSS !== null) editors.css.setValue(cachedCSS);
            if (cachedJS !== null) editors.js.setValue(cachedJS);
        }





        //대시보드 dummy 학생들 더미 데이터
        const dummyStudents = [
            {
                name: "홍길동",
                submissions: [
                    {
                        date: "2024-05-01",
                        version: "v1",
                        html: "<h1>Hello Hong</h1>",
                        css: "h1 { color: red; }",
                        js: "console.log('홍길동');",
                        output: "<h1 style='color:red;'>Hello Hong</h1>",
                        feedback: "좋은 시작입니다!"
                    },
                    {
                        date: "2024-05-03",
                        version: "v2",
                        html: "<p>Paragraph</p>",
                        css: "p { color: blue; }",
                        js: "console.log('파라그래프');",
                        output: "<p style='color:blue;'>Paragraph</p>",
                        feedback: "p 태그 잘 사용했어요."
                    }
                ]
            },
            {
                name: "김철수",
                submissions: [
                    {
                        date: "2024-05-02",
                        version: "v1",
                        html: "<h2>김철수 Hello</h2>",
                        css: "h2 { color: green; }",
                        js: "console.log('김철수');",
                        output: "<h2 style='color:green;'>김철수 Hello</h2>",
                        feedback: "h2 태그 사용 잘했습니다."
                    }
                ]
            }
        ];
        if (!localStorage.getItem('studentsData')) {
            localStorage.setItem('studentsData', JSON.stringify(dummyStudents));
        }
        async function loadDashboardStudents() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            console.log("현재 사용자:", currentUser);
            const data=await apiGet(`/my-students/${currentUser.id}`);
            // const res=await apiGet(`/my-students/${currentUser.id}`);
            // const res = await fetch(`http://localhost:5005/my-students/${currentUser.id}`);
            // const data = await res.json();

            const studentList = document.getElementById('studentList');
            studentList.innerHTML = '';
            data.students.forEach(student => {
                const li = document.createElement('li');
                li.textContent = `${student.name} (${student.username})`;
                li.dataset.studentId = student.id;
                li.addEventListener('click', () => {
                    loadStudentSubmissions(student.id); // 🔥
                });
                studentList.appendChild(li);
            });
        }
            async function loadStudentSubmissions(studentId) {
                const data=await apiGet(`/submissions/${studentId}`);
                    // const res=await apiGet(`/submissions/${studentId}`);
            // const res = await fetch(`http://localhost:5005/submissions/${studentId}`);
            // const data = await res.json();

            const list = document.getElementById("studentSubmissionList");
            list.innerHTML = "";

            data.submissions.forEach((sub, i) => {
                const li = document.createElement("li");
                li.textContent = sub.version || sub.submitted_at;
                li.dataset.submissionId = sub.id;
                li.addEventListener("click", () => {
                    showDashboardSubmission(data.submissions, i);
                    console.log("제출물 클릭됨:", data.submissions[i]);
                });
                list.appendChild(li);
            });

            // 현재 학생 정보와 제출물 저장 (탭 연동, 코드 출력에 필요)
            currentStudent = {
                id: studentId,
                submissions: data.submissions,
            };

            // ✨ 학생을 클릭하면 학생 목록 창을 접자
            document.querySelector('.dashboard-student-list').style.flex = "0.3";
            document.querySelector('.dashboard-submission-list').style.flex = "1.2";
            document.querySelector('.dashboard-submission-detail').style.flex = "2.6";
            isStudentListCollapsed = true;
            isSubmissionListCollapsed = false;
            // resetDashboardView();
        }
        document.getElementById('toggleStudentListBtn').addEventListener('click', () => {
            if (!isStudentListCollapsed) {
                document.querySelector('.dashboard-student-list').style.flex = "0.3";
                document.querySelector('.dashboard-submission-list').style.flex = "1.2";
                document.querySelector('.dashboard-submission-detail').style.flex = "2.6";
                isStudentListCollapsed = true;
            } else {
                document.querySelector('.dashboard-student-list').style.flex = "1.2";
                document.querySelector('.dashboard-submission-list').style.flex = "1.2";
                document.querySelector('.dashboard-submission-detail').style.flex = "2.6";
                isStudentListCollapsed = false;
            }
        });

        document.getElementById('toggleSubmissionListBtn').addEventListener('click', () => {
            if (!isSubmissionListCollapsed) {
                document.querySelector('.dashboard-submission-list').style.flex = "0.3";
                document.querySelector('.dashboard-student-list').style.flex = "0.3";
                document.querySelector('.dashboard-submission-detail').style.flex = "4";
                isSubmissionListCollapsed = true;
            } else {
                document.querySelector('.dashboard-submission-list').style.flex = "1.2";
                document.querySelector('.dashboard-student-list').style.flex = "0.3";
                document.querySelector('.dashboard-submission-detail').style.flex = "2.6";
                isSubmissionListCollapsed = false;
            }
        });
        // 중복 제거된 showDashboardSubmission()
        function showDashboardSubmission(submissions, index) {
            const submission = submissions[index];
            if (!submission) {
                console.warn("❗ 해당 인덱스의 제출물이 없습니다.");
                return;
            }
            currentSubmissionDashboard = submission;

            // 기본 출력 HTML 생성
            currentSubmissionDashboard.output = generateOutput(
                submission.html_code || "",
                submission.css_code || "",
                submission.js_code || ""
            );

            // 탭 초기화
            document.querySelectorAll('#dashboardScreen .tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.lang === 'html') btn.classList.add('active');
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#dashboardScreen .tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const lang = btn.dataset.lang;
                    if (currentSubmissionDashboard && dashboardCodeMirror) {
                        const code = currentSubmissionDashboard?.[`${lang}_code`] || "";
                        dashboardCodeMirror.setValue(code);
                        dashboardCodeMirror.setOption('mode', lang === 'html' ? 'htmlmixed' : lang);
                    }
                });
            });

            // CodeMirror
            if (!dashboardCodeMirror) {
                dashboardCodeMirror = CodeMirror(document.getElementById('dashboardSubmittedCode'), {
                    value: submission.html_code || "",
                    mode: 'htmlmixed',
                    theme: "tomorrow-night-bright",
                    lineNumbers: true,
                    readOnly: true
                });
            } else {
                dashboardCodeMirror.setValue(submission.html_code || "");
                dashboardCodeMirror.setOption('mode', 'htmlmixed');
            }

            // 출력
            document.getElementById('dashboardSubmittedOutput').srcdoc = currentSubmissionDashboard.output;

            // 피드백
            document.getElementById('dashboardSubmittedFeedback').textContent = submission.feedback || "피드백 없음";
        }
        
    }
    //대시보드 탭전환
    document.querySelectorAll('#dashboardScreen .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 탭에서 active 제거
            document.querySelectorAll('#dashboardScreen .tab-btn').forEach(b => b.classList.remove('active'));

            // 현재 클릭한 탭에만 active 추가
            btn.classList.add('active');

            // CodeMirror 내용 전환
            const lang = btn.dataset.lang;
            if (currentSubmissionDashboard && dashboardCodeMirror) {
                dashboardCodeMirror.setValue(currentSubmissionDashboard[`${lang}_code`]);
                dashboardCodeMirror.setOption('mode', lang === 'html' ? 'htmlmixed' : lang);
            }
        });
    });


    // 회원가입 화면 이동
    document.getElementById("goToSignupBtn").addEventListener("click", () => {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("signupScreen").style.display = "flex";

        localStorage.setItem("currentScreen", "signup"); // ✅ 화면 상태 저장
    });

    //로그인 화면으로 이동
    document.getElementById("goToLoginBtn").addEventListener("click", () => {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("signupScreen").style.display = "none";

        localStorage.setItem("currentScreen", "login"); // ✅ 화면 상태 저장
    });
    // 회원가입 완료 버튼

    document.getElementById("signupSubmitBtn").addEventListener("click", async () => {
        const username = document.getElementById("signupUsername").value.trim();
        const password = document.getElementById("signupPassword").value.trim();
        const passwordConfirm = document.getElementById("signupPasswordConfirm").value.trim();
        const name = document.getElementById("signupName").value.trim();
        const studentId = document.getElementById("signupStudentId").value.trim();
        const phone = document.getElementById("signupPhone").value.trim();
        const role = document.querySelector('input[name="role"]:checked')?.value;

        if (!username || !password || !passwordConfirm || !name || !role) {
            alert("⭐ 표시된 필수 항목을 모두 입력하세요.");
            return;
        }
        if (password !== passwordConfirm) {
            alert("비밀번호가 일치하지 않습니다!");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    name,
                    studentId,
                    phone,
                    role
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message); // "회원가입 성공!"
                document.getElementById("signupScreen").style.display = "none";
                document.getElementById("loginScreen").style.display = "flex";
                localStorage.setItem('currentScreen', 'login');
            } else {
                alert(`❗ 에러: ${data.message}`);
            }
        } catch (error) {
            console.error('회원가입 요청 실패:', error);
            alert('서버 연결에 실패했습니다.');
        }
    });

}
);
