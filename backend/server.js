import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import { ESLint } from "eslint";// const { HTMLHint } = require("htmlhint");
import { HTMLHint } from "htmlhint";// const stylelint = require("stylelint");
import stylelint from "stylelint";
import jshintPkg from 'jshint';
const { JSHINT } = jshintPkg;
import path from 'path';
import { sequelize, User, Submission, TeacherStudent } from './models/index.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
// const PORT = 5005; // 포트 5005로 고정!


const PORT = process.env.PORT || 5005; // 환경 변수 PORT 사용, 없으면 5005
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });


// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
// app.use(express.static("public"));


// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// DB 연결 및 테이블 생성
sequelize.sync({ alter: true }).then(() => {
    console.log('📦 DB 동기화 완료!');
    app.listen(PORT, () => {
        console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ DB 연결 실패:', err);
});

// 기본 라우트
// app.get('/', (req, res) => {
//     res.send('서버 연결 성공!');
// });
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });


// ✅ 회원가입
app.post('/signup', async (req, res) => {
    const { username, password, name, studentId, phone, role, teacher_username } = req.body;

    if (!username || !password || !name || !role) {
        return res.status(400).json({ message: '필수 항목을 모두 입력하세요.' });
    }

    try {
        const existing = await User.findOne({ where: { username } });
        if (existing) return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });

        const hash = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            password_hash: hash,
            name,
            role,
            student_number: studentId,
            phone
        });

        // ✅ 교사와 연결 (선택적으로)
        if (role === 'student' && teacher_username) {
            const teacher = await User.findOne({ where: { username: teacher_username, role: 'teacher' } });
            if (teacher) {
                await TeacherStudent.create({ teacher_id: teacher.id, student_id: newUser.id });
            }
        }

        return res.status(201).json({ message: '회원가입 성공!' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '서버 오류' });
    }
});
//교사와 연결
app.post('/assign-teacher-from-mypage', async (req, res) => {
    const { student_id, teacher_username } = req.body;

    if (!student_id || !teacher_username) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }

    try {
        const teacher = await User.findOne({ where: { username: teacher_username, role: 'teacher' } });
        if (!teacher) {
            return res.status(404).json({ message: '해당 교사 아이디가 존재하지 않습니다.' });
        }

        const exists = await TeacherStudent.findOne({ where: { teacher_id: teacher.id, student_id  } });
        if (exists) {
            return res.status(409).json({ message: '이미 등록된 교사입니다.' });
        }

        await TeacherStudent.create({ teacher_id: teacher.id, student_id });
        return res.status(201).json({ message: '교사 등록 완료!' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '서버 오류' });
    }
});


// ✅ 로그인
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력하세요.' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: '존재하지 않는 아이디입니다.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        return res.status(200).json({
            message: '로그인 성공!',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '서버 오류' });
    }
});
// const { Submission } = require('./models'); // 상단에서 가져오기

app.post('/submit', async (req, res) => {
    const { student_id, html_code, css_code, js_code, feedback } = req.body;

    try {
        
        await Submission.create({
            student_id,
            html_code,
            css_code,
            js_code,
            feedback
        });

        return res.status(201).json({ message: '제출 완료!' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '제출 실패' });
    }
});

// const { TeacherStudent } = require('./models');

app.get('/submissions', async (req, res) => {
    const { student_id, teacher_id } = req.query;

    if (!student_id || !teacher_id) {
        return res.status(400).json({ message: 'student_id와 teacher_id를 전달하세요.' });
    }

    try {
        const relation = await TeacherStudent.findOne({
            where: { teacher_id, student_id }
        });

        if (!relation) {
            return res.status(403).json({ message: '이 학생에 대한 접근 권한이 없습니다.' });
        }

        const submissions = await Submission.findAll({
            where: { user_id: student_id },
            order: [['submitted_at', 'DESC']]
        });

        return res.status(200).json({ submissions });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '서버 오류' });
    }
});

// 서버: 제출물 조회 API
app.get('/submissions/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
  
    try {
      const submissions = await Submission.findAll({
        where: { student_id: studentId },
        order: [['submitted_at', 'DESC']]
      });
  
      res.json({ submissions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '서버 오류' });
    }
  });

  app.get('/my-teacher/:studentId', async (req, res) => {
    const studentId = req.params.studentId;

    try {
        const relations = await TeacherStudent.findAll({
            where: { student_id: studentId },
            include: [{
                model: User,
                as: 'Teacher',
                attributes: ['id', 'username', 'name']
            }]
        });
        console.log("💬 relations 결과:", relations.map(r => r.toJSON())); // 여기가 핵심

        const teachers = relations.map(rel => rel.Teacher);
        if (!teachers.length) {
            return res.status(404).json({ message: '등록된 교사가 없습니다.' });
        }

        res.json({ teachers }); // ✅ 배열로 응답
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 교사가 담당하는 학생 목록 조회
app.get('/my-students/:teacherId', async (req, res) => {
    const teacherId = req.params.teacherId;

    try {
        const relations = await TeacherStudent.findAll({
            where: { teacher_id: teacherId },
            include: [{
                model: User,
                as: 'Student',
                attributes: ['id', 'username', 'name']
            }]
        });

        const students = relations.map(rel => rel.Student);

        res.json({ students });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '서버 오류' });
    }
});
// 담당 교사 삭제
app.post('/remove-teacher', async (req, res) => {
    const { student_id, teacher_id } = req.body;

    if (!student_id || !teacher_id) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }

    try {
        const deleted = await TeacherStudent.destroy({
            where: {
                student_id,
                teacher_id
            }
        });

        if (deleted) {
            return res.json({ message: '담당 교사 삭제 완료!' });
        } else {
            return res.status(404).json({ message: '해당 교사 연결 정보가 없습니다.' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: '서버 오류' });
    }
});

async function lintJavaScript(code) {
    const eslint = new ESLint({
        overrideConfigFile: path.resolve(__dirname, '.eslintrc.cjs'), // 반드시 절대경로 지정
        cwd: __dirname // cwd를 backend로 고정
    });

    const results = await eslint.lintText(code);
    return results[0].messages.map(msg => `🔸 JS: ${msg.message} (line ${msg.line})`).join("\n") || "✅ JavaScript 문제 없음!";
}


function lintHTML(code) {
    const messages = HTMLHint.verify(code);
    return messages.length ? messages.map(msg => `🔸 HTML: ${msg.message} (line ${msg.line})`).join("\n") : "✅ HTML 문제 없음!";
}


// lintCSS 함수
async function lintCSS(code) {
    const result = await stylelint.lint({
        code,
        configFile: path.resolve(__dirname, 'stylelint.config.cjs'),
    });

    return result.errored
        ? result.results[0].warnings.map(w => `🔸 CSS: ${w.text} (line ${w.line})`).join("\n")
        : "✅ CSS 문제 없음!";
}

// /lint/css API
app.post('/lint/css', async (req, res) => {
    const { cssCode } = req.body;

    if (cssCode === undefined || cssCode === null) {
        return res.status(400).json({ message: "CSS 코드가 필요합니다." });
    }

    try {
        const feedback = await lintCSS(cssCode);
        return res.json({ feedback });
    } catch (err) {
        console.error("Stylelint 실행 오류:", err);
        return res.status(500).json({ message: "Stylelint 실행 오류" });
    }
});

app.post('/lint-code', async (req, res) => {
    const { html, css, js, runtimeError } = req.body;

    try {
        const htmlMessages = HTMLHint.verify(html || "");
        const htmlFeedback = htmlMessages.map(m => `🔸 HTML: ${m.message} (line ${m.line})`).join("\n");

        const cssResult = await stylelint.lint({
            code: css || "",
            configFile: path.resolve(__dirname, 'stylelint.config.cjs'),
        });
        const cssFeedback = cssResult.results[0].warnings.map(w => `🔸 CSS: ${w.text} (line ${w.line})`).join("\n");

        const eslint = new ESLint({
            overrideConfigFile: path.resolve(__dirname, '.eslintrc.cjs'),
            cwd: __dirname
        });
        const jsResult = await eslint.lintText(js || "");
        const jsFeedback = jsResult[0].messages.map(m => `🔸 JS: ${m.message} (line ${m.line})`).join("\n");
        const allRawFeedback = [htmlFeedback, cssFeedback, jsFeedback, runtimeError].filter(Boolean).join("\n");
        // const allRawFeedback = [htmlFeedback, cssFeedback, jsFeedback].filter(Boolean).join("\n");
        const hasError = htmlMessages.length > 0 || cssResult.errored || jsResult[0].messages.length > 0;
        
        let gptFeedback = "";
        if (hasError) {
            try {
                const response = await fetch("http://localhost:5005/gpt-feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: allRawFeedback, lang: 'HTML/CSS/JS' })
                });

                const gptData = await response.json();
                gptFeedback = gptData.feedback || "❗ GPT 응답 없음";
            } catch (err) {
                console.error("❌ GPT 요청 오류:", err);
                gptFeedback = "❗ GPT 피드백 요청 실패";
            }
        }
  

        return res.json({
            success: !hasError,
            feedback: gptFeedback || allRawFeedback || "✅ 문제 없음!"
        });
    } catch (err) {
        console.error("Linting error:", err);
        return res.status(500).json({ success: false, feedback: "서버 오류: 검사 실패" });
    }
});

app.post('/gpt-feedback', async (req, res) => {
    const { messages, lang } = req.body;
    const apiKey = process.env.OPENAI_API_KEY; // 환경 변수로 안전하게 관리

    // 언어에 따라 코드 파일명 지정
    const fileName = lang === 'JavaScript' ? 'main.js'
                   : lang === 'HTML' ? 'index.html'
                   : lang === 'CSS' ? 'style.css'
                   : '코드';

    // 시스템 메시지: AI 역할과 설명 형식 정의
    const systemPrompt = `
당신은 웹프로그래밍을 처음 배우는 학생들을 위한 친절한 교육 도우미입니다.

조건:
- 전문 용어보다는 초보자가 이해할 수 있는 쉬운 말로 설명해주세요
- 격려하는 톤으로 작성해주세요
- 질문하지 말고 바로 설명해주세요
- "더 궁금한 점이 있으면 물어보세요" 같은 말은 하지 마세요(학습자는 다시 이어서 질문을 할 수 없습니다.)
- 글자수는 200자 이내로 작성해주세요


이제부터 오류 설명은 한국어로, 초보자도 쉽게 이해할 수 있도록 아래 형식으로 작성해주세요
설명 형식:

1. 언어: ${lang}
2. 해당 코드: 제출된 코드에서 문제가 된 코드 일부를 그대로 보여주기(예시 말 그대로 출력하기)

3. 오류 원인-발생위치-해결방법: 왜 이 오류가 발생했는지 쉽게 설명, 구체적인 수정 방법을 제시
4. 관련 개념: 관련된 프로그래밍 개념을 간단히 설명
5. 예시: (필요한 경우) 올바른 코드 예시 제공

6. 원본 메시지: (린터가 준 영어 오류 메시지)


`.trim();


    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: messages }
                ],
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        const data = await response.json();
        res.json({ feedback: data.choices?.[0]?.message?.content || "❗ GPT 응답 없음" });
    } catch (err) {
        console.error("GPT 요청 실패:", err);
        res.status(500).json({ feedback: "❗ GPT 요청 실패" });
    }
});
