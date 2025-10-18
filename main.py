import fastapi
import openai
from pydantic import BaseModel
from starlette.responses import FileResponse, JSONResponse
from fastapi import Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from firebase_config import db  # Firebase 불러오기
from datetime import datetime
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

load_dotenv()

app = fastapi.FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

openai.api_key = os.getenv("OPENAI_API_KEY")
studentId = ""

class Chat(BaseModel):
    message: str

@app.get("/")
async def main(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login.html")
async def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/student.html")
async def student(request: Request):
    return templates.TemplateResponse("student.html", {"request": request})

@app.get("/chat.html")
async def get_chat(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@app.get("/teacher.html")
async def get_teacher(request: Request):
    return templates.TemplateResponse("teacher.html", {"request": request})


@app.post("/chat.html", response_class=HTMLResponse)
async def post_chat(
    request: Request,
    message: str = Form(...),
    student_id: str = Form(...),
):
    student = student_id
    student_node = None
    classes = db.child("class").get()
    found_class = None
    if classes.each():
        for cls in classes.each():  # ex: "1-1", "1-2"
            students = cls.val()
            if students and student_id in students:
                student_node = students[student_id]
                found_class = cls.key()
                break

    if not student_node:
        return JSONResponse({"error": "학생 정보를 찾을 수 없습니다."}, status_code=404)

    student_name = student_node.get("studentName", "이름없음")
    student_class = student_node.get("studentClass", found_class)

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": """
You are a friendly chatbot whose role is to talk with the user like a close friend. 
- Focus on casual conversation and emotional support, not solving mental health problems.
- Listen carefully, respond naturally, and show empathy or light humor.
- Never give medical advice, diagnoses, or therapy.
- Keep the conversation going and make the user feel accompanied.
"""},
            {"role": "user", "content": message}
        ]
    )
    answer = response.choices[0].message.content
    print(student_id)
    cl = found_class

    # Firebase 저장
    time_key = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    db.child("class").child(found_class).child(student_id).child("chat_history").child(time_key).set({
        "user_message": message,
        "ai_response": answer
    })
    # JSON으로 반환 (AJAX에서 처리)
    return JSONResponse({"user_message": message, "ai_response": answer})

@app.get("/result/{studentId}")
async def get_result(request: Request, studentId: str):
    # 🔹 studentId가 속한 반 찾기
    classes = db.child("class").get()
    found_class = None
    student_node = None
    if classes.each():
        for cls in classes.each():  # ex: "1-1", "1-2"
            students = cls.val()
            if students and studentId in students:
                student_node = students[studentId]
                found_class = cls.key()
                break

    if not student_node:
        return JSONResponse({"error": "학생 정보를 찾을 수 없습니다."}, status_code=404)

    # 🔹 chat_history 가져오기
    ref = db.child("class").child(found_class).child(studentId).child("chat_history")
    data = ref.get().val()
    if not data:
        return JSONResponse({"error": "No chat history found."}, status_code=404)

    # 🔹 문자열 변환
    chat_log_str = "\n".join([f"User: {v['user_message']}\nAI: {v['ai_response']}"
                              for k, v in data.items()])

    # 🔹 GPT 호출
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "Based on the chat log, diagnose student's mental state and emotion. Furthermore, give some method to deal with student's problem. In korean. This diagnose is not for student, but for teachers to lead students."},
            {"role": "user", "content": chat_log_str}
        ]
    )
    answer = response.choices[0].message.content
    return JSONResponse({"ai_response": answer})