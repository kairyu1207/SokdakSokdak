import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, child, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 🔹 Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyDzLmMn5hwI2pPMpNQMTdZHOZ-hDaaULCg",
  authDomain: "hackertonpractice-35514.firebaseapp.com",
  databaseURL: "https://hackertonpractice-35514-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hackertonpractice-35514",
  storageBucket: "hackertonpractice-35514.firebasedstorage.app",
  messagingSenderId: "785118269341",
  appId: "1:785118269341:web:b29973f9e3efef6d866974",
  measurementId: "G-TZPZKD2E24"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔹 유틸: DOM 요소 선택 + 값 가져오기
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
const getInputValue = id => document.getElementById(id)?.value || "";

// 🔹 공통: 세션 저장/불러오기
const saveSession = (keyValues) => Object.entries(keyValues).forEach(([k, v]) => sessionStorage.setItem(k, v));
const getSession = (key) => sessionStorage.getItem(key);

// 🔹 페이지 이동 버튼
function setupNavigation() {
  const startBtn = $("#start-btn");
  startBtn?.addEventListener("click", () => window.location.href = "login.html");

  const chatBtn = $("#chat-btn");
  chatBtn?.addEventListener("click", () => {
    const studentId = getSession("studentId");
    const studentName = getSession("studentName");
    const studentClass = getSession("studentClass");

    if (!studentId || !studentName || !studentClass) {
      alert("로그인 정보가 없습니다.");
      window.location.href = "login.html";
      return;
    }

    const params = new URLSearchParams({
      student_id: studentId,
      student_name: studentName,
      student_class: studentClass
    }).toString();
    window.location.href = `chat.html?${params}`;
  });
}

// 🔹 로그인 탭 전환
function setupLoginTabs() {
  const teacherBtn = $("#go-teacher-btn");
  const studentBtn = $("#go-student-btn");
  const teacherLogin = $("#teacher-login");
  const studentLogin = $("#student-login");

  if (teacherBtn && studentBtn && teacherLogin && studentLogin) {
    teacherBtn.addEventListener("click", () => {
      teacherLogin.classList.remove("hidden");
      studentLogin.classList.add("hidden");
    });
    studentBtn.addEventListener("click", () => {
      studentLogin.classList.remove("hidden");
      teacherLogin.classList.add("hidden");
    });
  }
}

// 🔹 선생님 로그인
async function checkTeacherLogin(name, password) {
  try {
    const snapshot = await get(child(ref(db), "teacher"));
    if (!snapshot.exists()) return alert("teacher 노드 자체가 없습니다.");

    const allClasses = snapshot.val();
    const foundClass = Object.entries(allClasses).find(([className, data]) => data.name === name && data.password === password)?.[0];

    if (foundClass) {
      saveSession({ teacherName: name, teacherPassword: password, teacherClass: foundClass });
      alert("선생님 로그인 성공!");
      window.location.href = "teacher.html";
    } else alert("이름 또는 비밀번호가 틀렸습니다.");
  } catch (err) {
    console.error("선생님 로그인 중 오류:", err);
  }
}

// 🔹 학생 로그인
async function checkStudentLogin(studentId, password) {
  try {
    const code = studentId.toString();
    const className = `${code[0]}-${code[1]}`;
    const snapshot = await get(child(ref(db), `class/${className}/${studentId}`));

    if (!snapshot.exists()) return alert("존재하지 않는 학생입니다.");
    const studentData = snapshot.val();

    if (studentData.password === String(password)) {
      saveSession({
        studentId, studentName: studentData.name, studentClass: className, studentPassword: password
      });
      alert("학생 로그인 성공!");
      window.location.href = "student.html";
    } else alert("비밀번호가 틀렸습니다.");
  } catch (err) {
    console.error("학생 로그인 중 오류:", err);
  }
}

// 🔹 로그인 버튼 이벤트
function setupLoginButtons() {
  $("#teacher-login .login-btn")?.addEventListener("click", () => {
    const name = getInputValue("teacher-name");
    const password = getInputValue("teacher-password");
    checkTeacherLogin(name, password);
  });

  $("#student-login .login-btn")?.addEventListener("click", () => {
    const studentId = getInputValue("student-id");
    const password = getInputValue("student-password");
    checkStudentLogin(studentId, password);
  });
}

// 🔹 teacher.html: 학생 리스트 로드
async function loadTeacherClass() {
  const loggedClass = getSession("teacherClass");
  if (!loggedClass) return alert("로그인 정보가 없습니다."), window.location.href = "login.html";

  try {
    const snapshot = await get(child(ref(db), `class/${loggedClass}`));
    if (!snapshot.exists()) return console.log("해당 반에 학생 정보가 없습니다.");

    const students = snapshot.val();
    const container = $("#students-container");
    if (!container) return;

    container.innerHTML = "";
    Object.entries(students).forEach(([studentId, student]) => {
      const div = document.createElement("div");
      div.classList.add("student-card");
      div.innerHTML = `
        <p class="student-name">${student.name} (${studentId})</p>
        <div class="emoji">${student.emotion || '😊'}</div>

        <button class="schedule-btn">상담 예약</button>
        <textarea class="note-input" placeholder="메시지 작성">${student.note || ''}</textarea>
        <button class="save-note-btn">메시지 저장</button>
        <textarea class="goal-input" placeholder="하루 목표 작성">${student.daily_goal || ''}</textarea>
        <button class="save-goal-btn">오늘의 목표 부여</button>
        <button class="see-mental">정신 건강 확인하기</button>
      `;
      container.appendChild(div);

      // 🔹 이벤트
      $(".schedule-btn", div)?.addEventListener("click", () => {
        const mail = student.mail || "test@example.com";
        window.location.href = `mailto:${mail}?subject=${encodeURIComponent("상담 예약 요청")}&body=${encodeURIComponent(`안녕하세요 ${student.name}님,\n상담 일정을 잡아주세요.`)}`;
      });

      $(".save-note-btn", div)?.addEventListener("click", () => set(ref(db, `class/${loggedClass}/${studentId}/note`), $(".note-input", div).value).then(() => alert("메시지가 저장되었습니다!")));
      $(".save-goal-btn", div)?.addEventListener("click", () => set(ref(db, `class/${loggedClass}/${studentId}/daily_goal`), $(".goal-input", div).value).then(() => alert("메시지가 저장되었습니다!")));
      $(".see-mental", div)?.addEventListener("click", async () => {
        try {
          const res = await fetch(`/result/${studentId}`);
          const data = await res.json();
          alert(data.error ? `오류: ${data.error}` : `${student.name}의 정신 건강 분석 결과:\n\n${data.ai_response}`);
        } catch (err) {
          console.error("정신 건강 확인 오류:", err);
          alert("정신 건강 분석 중 오류가 발생했습니다.");
        }
      });
    });

  } catch (err) {
    console.error("학생 정보 로드 중 오류:", err);
  }
}

// 🔹 student.html: 로그인 정보 표시
async function loadStudentInfo() {
  const studentName = getSession("studentName");
  const studentId = getSession("studentId");
  const studentClass = getSession("studentClass");

  if (!studentName || !studentId || !studentClass) return alert("로그인 정보가 없습니다."), window.location.href = "login.html";

  const container = $("#student-info");
  if (!container) return;

  container.innerHTML = `
    <p class="student-info-text">학번: ${studentId}</p>
    <p class="student-info-text">반: ${studentClass}</p>
    <h3 class="student-subtitle">선생님의 메시지</h3>
    <div id="student-note" class="student-note">불러오는 중...</div>
    <h3 class="student-subtitle">오늘의 목표</h3>
    <div id="student-goal" class="student-goal">불러오는 중...</div>
  `;

  // 🔹 공통: DB에서 값 가져와 표시
  async function loadField(fieldId, dbPath, defaultText="작성된 메시지가 없습니다.") {
    try {
      const snapshot = await get(ref(db, dbPath));
      $(`#${fieldId}`).textContent = snapshot.exists() ? snapshot.val() || defaultText : defaultText;
    } catch (err) {
      console.error(`${fieldId} 로드 중 오류:`, err);
      $(`#${fieldId}`).textContent = "불러오는 중 오류가 발생했습니다.";
    }
  }

  loadField("student-note", `class/${studentClass}/${studentId}/note`);
  loadField("student-goal", `class/${studentClass}/${studentId}/daily_goal`);
}

// 🔹 DOMContentLoaded: 초기화
document.addEventListener("DOMContentLoaded", () => {
  $("#year") && ($("#year").textContent = new Date().getFullYear());

  setupNavigation();
  setupLoginTabs();
  setupLoginButtons();

  $("#students-container") && loadTeacherClass();
  $("#student-info") && loadStudentInfo();
});
