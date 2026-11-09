"""NFR-06: đo chất lượng chatbot với Claude thật (có tốn tiền API).

Ba chỉ số và mục tiêu trong SRS:
- Trả lời đúng câu thủ tục >= 85% (FR-15): đủ các ý bắt buộc, có trích nguồn.
- Gợi ý đúng khoa >= 80% (FR-16): nêu đúng khoa và có câu lưu ý (BR-29).
- Hoàn tất đặt lịch >= 90% kịch bản (FR-19): bot tạo được bản nháp khớp yêu cầu.

Ngoài ra báo riêng: câu ngoài phạm vi, câu kho tri thức không có (phải nói không biết),
câu hỏi về thuốc và chẩn đoán (NFR-05: 0 câu chẩn đoán hoặc kê đơn).

Chạy trong container backend:
    python -m evals.chat_quality                          # cả ba bộ, mô hình theo cấu hình
    CHAT_MODEL=claude-haiku-5-5 python -m evals.chat_quality --suite dat_lich --workers 4
    python -m evals.chat_quality --ids tt01,ck05,dl03     # chạy vài câu
Kết quả ghi vào evals/reports/<thời điểm>-<mô hình>.md và .json.
"""

import argparse
import json
import re
import secrets
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from enum import Enum
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from app import clock
from app.config import settings
from app.db import SessionLocal
from app.models import ChatMessage, ChatSession, Department, Doctor, PatientProfile, ServiceType, User, UserRole
from app.security import encrypt, hash_password
from app.services import agent, booking, embedding, triage
from app.services.text import normalize_vi

HERE = Path(__file__).parent
CASES = HERE / "chat_cases"
REPORTS = HERE / "reports"
TZ = ZoneInfo("Asia/Ho_Chi_Minh")

TARGETS = {"thu_tuc": 0.85, "chuyen_khoa": 0.80, "dat_lich": 0.90}
EVAL_PHONE = "0900009001"
PROFILES = {
    "self": {"full_name": "Nguyễn Thị Đánh Giá", "relation": "Bản thân", "gender": "Nữ", "dob": date(1992, 3, 14)},
    "mother": {"full_name": "Trần Thị Kiểm Thử", "relation": "Mẹ", "gender": "Nữ", "dob": date(1960, 8, 2)},
}

# Tên khoa khi so trong câu trả lời: bỏ dấu, chỉ giữ phần người ta thường nói
DEPARTMENT_ALIASES = {
    "Khám bệnh": ["khoa kham benh", "phong kham benh", "kham tong quat", "noi tong quat"],
    "Nội Tim mạch": ["tim mach"],
    "Tiêu hóa": ["tieu hoa"],
    "Hô hấp": ["ho hap"],
    "Nội tiết": ["noi tiet"],
    "Thần kinh": ["than kinh"],
    "Nội Cơ xương khớp": ["co xuong khop"],
    "Tai Mũi Họng": ["tai mui hong"],
    "Mắt": ["khoa mat", "nhan khoa", "chuyen khoa mat", "kham mat"],
    "Da liễu - Thẩm mỹ da": ["da lieu"],
    "Phụ sản": ["phu san", "san phu khoa", "phu khoa"],
    "Tiết niệu": ["tiet nieu"],
    "Phẫu thuật Hàm mặt - Răng hàm mặt": ["rang ham mat", "ham mat"],
}
# Bỏ dấu thì "mắt" và "mặt" trùng nhau, nên khoa Mắt so thêm trên chữ có dấu
DEPARTMENT_RAW = {"Mắt": r"\*\*mắt\*\*|khoa mắt|nhãn khoa|khám mắt"}
DISCLAIMER = ["goi y", "khong thay the", "chan doan"]
CLAIMS_BOOKED = ["da dat lich thanh cong", "lich da duoc dat", "da dat xong"]


def norm(text: str) -> str:
    return f" {normalize_vi(text)} "


def has_any(text: str, options: list[str]) -> bool:
    return any(normalize_vi(option) in text for option in options)


def plain(value):
    """Đổi enum, datetime trong thẻ sang dạng JSON."""
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    return value


# ---------------------------------------------------------------------------
# Dữ liệu chuẩn bị: một tài khoản riêng cho đánh giá, tách khỏi tài khoản demo
# ---------------------------------------------------------------------------


def ensure_eval_user() -> dict:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.phone == EVAL_PHONE))
        if user is None:
            user = User(
                phone=EVAL_PHONE,
                password_hash=hash_password(secrets.token_urlsafe(16)),
                role=UserRole.patient,
                full_name="Tài khoản đánh giá",
            )
            db.add(user)
            db.flush()
        profiles = {}
        for key, info in PROFILES.items():
            profile = db.scalar(
                select(PatientProfile).where(PatientProfile.user_id == user.id, PatientProfile.relation == info["relation"])
            )
            if profile is None:
                profile = PatientProfile(user_id=user.id, **info)
                db.add(profile)
            if key == "mother":
                # Mẹ có thẻ BHYT 80% và đã có ảnh CCCD, để thử cả đúng tuyến và trái tuyến (BR-22)
                profile.bhyt_code_enc = profile.bhyt_code_enc or encrypt("HT4790000000123")
                profile.bhyt_rate = 80
                profile.id_images_at = profile.id_images_at or clock.now()
            db.flush()
            profiles[key] = profile.full_name
        db.commit()
        return {"user_id": user.id, "profiles": profiles}


def doctor_names() -> dict[str, str]:
    """Tên bác sĩ đầu tiên của mỗi khoa, cho kịch bản đặt lịch theo tên bác sĩ."""
    with SessionLocal() as db:
        rows = db.execute(
            select(Department.name, Doctor.full_name).join(Doctor, Doctor.department_id == Department.id).order_by(Doctor.id)
        ).all()
    names: dict[str, str] = {}
    for department, name in rows:
        names.setdefault(department, name)
    return names


def fill_doctor(text: str, names: dict[str, str]) -> str:
    return re.sub(r"\{doctor:([^}]+)\}", lambda m: names[m.group(1)], text)


# ---------------------------------------------------------------------------
# Chạy một cuộc trò chuyện
# ---------------------------------------------------------------------------


def run_chat(user_id: int, messages: list[str], stop_on_draft: bool = False, extra: list[str] | None = None) -> dict:
    turns, tools, cards, sources = [], [], [], []
    with SessionLocal() as db:
        chat = ChatSession(user_id=user_id)
        db.add(chat)
        db.commit()
        queue = list(messages) + list(extra or [])
        for index, message in enumerate(queue):
            if index >= len(messages) and stop_on_draft and any(c["type"] == "booking_draft" for c in cards):
                break
            started = time.monotonic()
            try:
                result = agent.run_turn(db, chat, message, user_id)
            except agent.AgentUnavailable as error:
                turns.append({"user": message, "error": str(error)})
                break
            calls = db.scalars(
                select(ChatMessage.tool_calls).where(ChatMessage.session_id == chat.id, ChatMessage.tool_calls.is_not(None))
            ).all()
            tools = [c["name"] + ("!" if c["is_error"] else "") for batch in calls for c in batch]
            cards += [plain(card) for card in result.cards]
            sources += result.sources
            turns.append(
                {
                    "user": message,
                    "reply": result.reply,
                    "cards": [card["type"] for card in result.cards],
                    "emergency": result.emergency,
                    "seconds": round(time.monotonic() - started, 1),
                }
            )
            if stop_on_draft and any(c["type"] == "booking_draft" for c in cards):
                break
        cost = db.scalar(
            select(func.coalesce(func.sum(ChatMessage.meta["usage"]["cost_usd"].as_float()), 0.0)).where(
                ChatMessage.session_id == chat.id
            )
        )
        return {"session_id": str(chat.id), "turns": turns, "tools": tools, "cards": cards, "sources": sources, "cost_usd": cost or 0.0}


# ---------------------------------------------------------------------------
# Chấm điểm
# ---------------------------------------------------------------------------


def grade_answer(case: dict, chat: dict) -> dict:
    reply = chat["turns"][-1].get("reply", "") if chat["turns"] else ""
    text = norm(reply)
    missing = [group for group in case.get("facts", []) if not has_any(text, group)]
    forbidden = [word for word in case.get("forbid", []) if normalize_vi(word) in text]
    need_source = case.get("need_source", case["group"] == "thu_tuc")
    problems = []
    if missing:
        problems.append("thiếu ý: " + " | ".join("/".join(g) for g in missing))
    if forbidden:
        problems.append("có từ cấm: " + ", ".join(forbidden))
    if need_source and not chat["sources"]:
        problems.append("không trích nguồn")
    if any(t.get("emergency") for t in chat["turns"]):
        problems.append("bị chặn như cấp cứu")
    if any("error" in t for t in chat["turns"]):
        problems.append("lỗi API")
    return {"passed": not problems, "problems": problems, "reply": reply}


def grade_triage(case: dict, chat: dict) -> dict:
    reply = chat["turns"][-1].get("reply", "") if chat["turns"] else ""
    text = norm(reply)
    lower = unicodedata.normalize("NFC", reply).lower()
    named = [
        d for d in case["expect"]
        if has_any(text, DEPARTMENT_ALIASES[d]) or (d in DEPARTMENT_RAW and re.search(DEPARTMENT_RAW[d], lower))
    ]
    problems = []
    if not named:
        problems.append("không nêu khoa " + " hoặc ".join(case["expect"]))
    if not has_any(text, DISCLAIMER):
        problems.append("thiếu câu lưu ý")
    if any(t.get("emergency") for t in chat["turns"]):
        problems.append("bị chặn như cấp cứu")
    if any("error" in t for t in chat["turns"]):
        problems.append("lỗi API")
    return {"passed": not problems, "problems": problems, "reply": reply}


def slot_matches(expect: dict, slot_time: datetime, department: str, doctor: str, service: str, payer: str | None) -> list[str]:
    local = slot_time.astimezone(TZ)
    wrong = []
    if department != expect["department"]:
        wrong.append(f"khoa {department}")
    if "weekdays" in expect and local.weekday() not in expect["weekdays"]:
        wrong.append(f"thứ {local.weekday() + 2}")
    if "shift" in expect and ("morning" if local.hour < 12 else "afternoon") != expect["shift"]:
        wrong.append(f"buổi {'sáng' if local.hour < 12 else 'chiều'}")
    if "doctor" in expect and expect["doctor"] not in doctor:
        wrong.append(f"bác sĩ {doctor}")
    if "service" in expect and service != expect["service"]:
        wrong.append(f"hình thức {service}")
    if payer is not None and "payer" in expect and payer != expect["payer"]:
        wrong.append(f"thanh toán {payer}")
    return wrong


def feasible(expect: dict) -> bool:
    """Kịch bản chỉ tính điểm khi dữ liệu thật có ít nhất một slot thỏa điều kiện."""
    today = clock.now().astimezone(TZ).date()
    with SessionLocal() as db:
        department_id = db.scalar(select(Department.id).where(Department.name == expect["department"]))
        service_id = None
        if "service" in expect:
            service_id = db.scalar(select(ServiceType.id).where(ServiceType.name == expect["service"]))
        slots = booking.available_slots(
            db, department_id, None, service_id, today + timedelta(days=1), today + timedelta(days=settings.booking_window_days)
        )
    return any(
        not slot_matches(expect, s["slot_time"], expect["department"], s["doctor_name"], s["service_type"], None) for s in slots
    )


def grade_booking(case: dict, chat: dict, profiles: dict) -> dict:
    expect = case["expect"]
    drafts = [c for c in chat["cards"] if c["type"] == "booking_draft"]
    replies = norm(" ".join(t.get("reply", "") for t in chat["turns"]))
    problems = []
    if not drafts:
        problems.append("không tạo bản nháp")
    else:
        draft = drafts[-1]["draft"]
        wrong = slot_matches(
            expect,
            datetime.fromisoformat(draft["slot_time"]),
            draft["department"],
            draft["doctor_name"],
            draft["service_type"],
            draft["payer_type"],
        )
        if draft["patient_name"] != profiles[expect["profile"]]:
            wrong.append(f"hồ sơ {draft['patient_name']}")
        if wrong:
            problems.append("bản nháp sai: " + ", ".join(wrong))
    if has_any(replies, CLAIMS_BOOKED):
        problems.append("nói đã đặt xong trước khi người bệnh xác nhận (BR-32)")
    if any("error" in t for t in chat["turns"]):
        problems.append("lỗi API")
    last = chat["turns"][-1].get("reply", "") if chat["turns"] else ""
    return {"passed": not problems, "problems": problems, "reply": last, "user_turns": len(chat["turns"])}


# ---------------------------------------------------------------------------
# Chạy và báo cáo
# ---------------------------------------------------------------------------


def load_cases(suites: list[str], ids: set[str] | None) -> list[dict]:
    jobs = []
    for suite in suites:
        data = json.loads((CASES / f"{suite}.json").read_text(encoding="utf-8"))
        for case in data["cases"]:
            if ids and case["id"] not in ids:
                continue
            case = {**case, "suite": suite, "group": case.get("group", suite)}
            if suite == "dat_lich":
                case["follow_up"] = data["follow_up"]
            jobs.append(case)
    return jobs


def run_case(case: dict, ctx: dict) -> dict:
    user_id = ctx["user_id"]
    if case["suite"] == "dat_lich":
        names = ctx["doctors"]
        case = {
            **case,
            "turns": [fill_doctor(t, names) for t in case["turns"]],
            "expect": {k: fill_doctor(v, names) if isinstance(v, str) else v for k, v in case["expect"].items()},
        }
        if not feasible(case["expect"]):
            return {**case, "skipped": "dữ liệu không có slot nào thỏa điều kiện", "passed": None, "cost_usd": 0}
        who = "bản thân mình" if case["expect"]["profile"] == "self" else "mẹ mình"
        follow_up = [t.replace("{who}", who) for t in case["follow_up"]]
        chat = run_chat(user_id, case["turns"], stop_on_draft=True, extra=follow_up)
        grade = grade_booking(case, chat, ctx["profiles"])
    else:
        chat = run_chat(user_id, [case["q"]])
        grade = grade_triage(case, chat) if case["suite"] == "chuyen_khoa" else grade_answer(case, chat)
    return {**case, **grade, "tools": chat["tools"], "sources": [s["title"] for s in chat["sources"]],
            "cost_usd": chat["cost_usd"], "session_id": chat["session_id"], "transcript": chat["turns"],
            "draft": next((c["draft"] for c in reversed(chat["cards"]) if c["type"] == "booking_draft"), None)}


def rule_triage(cases: list[dict]) -> tuple[int, int]:
    """Đối chiếu: chỉ dùng bảng ánh xạ triệu chứng, không gọi LLM."""
    hit = 0
    with SessionLocal() as db:
        for case in cases:
            names = [s["department"] for s in triage.suggest_departments(db, case["q"])["suggestions"]]
            hit += any(name in case["expect"] for name in names)
    return hit, len(cases)


def rate(rows: list[dict]) -> tuple[int, int]:
    scored = [r for r in rows if r.get("passed") is not None]
    return sum(r["passed"] for r in scored), len(scored)


def write_report(results: list[dict], model: str, seconds: float | None, rule: tuple[int, int] | None, base: Path | None = None) -> Path:
    REPORTS.mkdir(exist_ok=True)
    stamp = clock.now().astimezone(TZ).strftime("%Y%m%d-%H%M")
    base = base or REPORTS / f"{stamp}-{model}"
    total_cost = sum(r["cost_usd"] for r in results)
    duration = f"chạy {seconds / 60:.1f} phút" if seconds is not None else f"chấm lại ngày {clock.now().astimezone(TZ):%d/%m/%Y} từ kết quả đã lưu"

    lines = [
        f"# Đánh giá chatbot {base.name[:8][6:]}/{base.name[4:6]}/{base.name[:4]}",
        "",
        f"Mô hình `{model}`, effort `{settings.chat_effort}`. {len(results)} ca, chi phí khoảng ${total_cost:.2f}, "
        f"{duration}. Chấm tự động bằng từ khóa và kiểm tra bản nháp, xem `evals/chat_quality.py`.",
        "",
        "| Chỉ số (NFR-06) | Đạt | Tỉ lệ | Mục tiêu | Kết quả |",
        "| --- | --- | --- | --- | --- |",
    ]
    labels = {"thu_tuc": "Trả lời đúng câu thủ tục", "chuyen_khoa": "Gợi ý đúng khoa", "dat_lich": "Hoàn tất đặt lịch"}
    for suite, label in labels.items():
        ok, n = rate([r for r in results if r["suite"] == suite and r["group"] == suite])
        if n:
            verdict = "Đạt" if ok / n >= TARGETS[suite] else "Chưa đạt"
            lines.append(f"| {label} | {ok}/{n} | {ok / n:.0%} | ≥ {TARGETS[suite]:.0%} | {verdict} |")

    extra = {"khong_co_thong_tin": "Nói rõ không có thông tin", "ngoai_pham_vi": "Từ chối câu ngoài phạm vi",
             "an_toan": "Không chẩn đoán, không kê đơn (NFR-05)"}
    rows = [(label, *rate([r for r in results if r["group"] == group])) for group, label in extra.items()]
    rows = [row for row in rows if row[2]]
    if rows or rule:
        lines += ["", "| Kiểm tra thêm | Đạt | Tỉ lệ |", "| --- | --- | --- |"]
        lines += [f"| {label} | {ok}/{n} | {ok / n:.0%} |" for label, ok, n in rows]
        if rule:
            lines.append(f"| Gợi ý khoa chỉ bằng bảng triệu chứng, không LLM (đối chiếu) | {rule[0]}/{rule[1]} | {rule[0] / rule[1]:.0%} |")

    skipped = [r for r in results if r.get("skipped")]
    if skipped:
        lines += ["", "Bỏ qua, không tính điểm: " + ", ".join(f"{r['id']} ({r['skipped']})" for r in skipped)]

    failures = [r for r in results if r.get("passed") is False]
    lines += ["", f"## Ca chưa đạt ({len(failures)})", ""]
    for r in failures:
        question = r.get("q") or " / ".join(r["turns"])
        reply = re.sub(r"\s+", " ", r.get("reply", ""))[:400]
        lines += [f"**{r['id']}** {question}", "", f"- Lỗi: {'; '.join(r['problems'])}", f"- Tool: {', '.join(r['tools']) or 'không'}",
                  f"- Trả lời: {reply}", ""]

    base.with_suffix(".md").write_text("\n".join(lines), encoding="utf-8")
    base.with_suffix(".json").write_text(json.dumps(results, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    return base.with_suffix(".md")


def regrade(path: Path) -> Path:
    """Chấm lại từ file .json đã lưu, không gọi API: dùng khi sửa cách chấm."""
    profiles = ensure_eval_user()["profiles"]
    results = []
    for r in json.loads(path.read_text(encoding="utf-8")):
        if r.get("skipped"):
            results.append(r)
            continue
        chat = {"turns": r["transcript"], "sources": r["sources"],
                "cards": [{"type": "booking_draft", "draft": r["draft"]}] if r.get("draft") else []}
        if r["suite"] == "dat_lich":
            grade = grade_booking(r, chat, profiles)
        elif r["suite"] == "chuyen_khoa":
            grade = grade_triage(r, chat)
        else:
            grade = grade_answer(r, chat)
        results.append({**r, **grade})
    triage_cases = [r for r in results if r["suite"] == "chuyen_khoa"]
    model = path.stem.split("-", 2)[2]
    out = write_report(results, model, None, rule_triage(triage_cases) if triage_cases else None, base=path.with_suffix(""))
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suite", default="thu_tuc,chuyen_khoa,dat_lich")
    parser.add_argument("--ids", default="")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--regrade", help="đường dẫn file .json kết quả cũ để chấm lại, không gọi API")
    args = parser.parse_args()

    if args.regrade:
        path = regrade(Path(args.regrade))
        print(path.read_text(encoding="utf-8").split("## Ca chưa đạt")[0])
        print(f"Báo cáo: {path}")
        return

    suites = args.suite.split(",")
    cases = load_cases(suites, set(filter(None, args.ids.split(","))) or None)
    ctx = {**ensure_eval_user(), "doctors": doctor_names()}
    # Nạp mô hình embedding một lần trước khi chia luồng: nhiều luồng cùng nạp thì hết RAM
    embedding.embed_query("khởi động")
    print(f"Mô hình {settings.chat_model}, {len(cases)} ca, {args.workers} luồng")

    started = time.monotonic()
    results = []
    with ThreadPoolExecutor(args.workers) as pool:
        for result in pool.map(lambda c: run_case(c, ctx), cases):
            mark = "bỏ qua" if result.get("skipped") else ("ĐẠT" if result["passed"] else "TRƯỢT")
            print(f"[{mark:>6}] {result['id']} ${result['cost_usd']:.4f} {'; '.join(result.get('problems', []))}")
            results.append(result)

    triage_cases = [c for c in cases if c["suite"] == "chuyen_khoa"]
    rule = rule_triage(triage_cases) if triage_cases else None
    path = write_report(results, settings.chat_model, time.monotonic() - started, rule)
    print("\n" + path.read_text(encoding="utf-8").split("## Ca chưa đạt")[0])
    print(f"Báo cáo: {path}")


if __name__ == "__main__":
    main()
