#!/usr/bin/env python3
"""성의고등학교 알레르기 알림 서비스 - 매일 오전 7시 실행"""
import argparse
import csv
import os
import re
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
import schedule


def load_env() -> None:
    for env_path in (Path.cwd() / ".env", Path(__file__).resolve().parent.parent / ".env"):
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return


load_env()

NEIS_KEY = os.getenv("NEIS_API_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL")
ATPT_CODE = os.getenv("ATPT_OFCDC_SC_CODE", "R10")
SCHUL_CODE = os.getenv("SD_SCHUL_CODE", "8750450")

ALLERGY_MAP = {1:"난류",2:"우유",3:"메밀",4:"땅콩",5:"대두",
               6:"밀",7:"고등어",8:"게",9:"새우",10:"돼지고기",
               11:"복숭아",12:"토마토",13:"아황산염"}

BASE_DIR = Path(__file__).resolve().parent
PLACEHOLDER_VALUES = {
    "your_neis_api_key",
    "your_resend_api_key",
    "onboarding@resend.dev",
}


def is_configured(value: str | None) -> bool:
    return bool(value and value.strip() and value.strip() not in PLACEHOLDER_VALUES)

def config_status(value: str | None) -> str:
    if not value or not value.strip():
        return "missing"
    if value.strip() in PLACEHOLDER_VALUES:
        return "placeholder"
    return "ok"


def require_config(name: str, value: str | None) -> str:
    status = config_status(value)
    if status == "missing":
        raise RuntimeError(f"{name}가 .env에 설정되어 있지 않습니다.")
    if status == "placeholder":
        raise RuntimeError(f"{name}가 예시값으로 남아 있습니다. .env를 실제 값으로 바꾸세요.")
    return value.strip()

def get_target_date():
    """오늘 + 2일 날짜 계산 (MLSV_FROM_YMD 파라미터용)"""
    return (datetime.now() + timedelta(days=2)).strftime("%Y%m%d")

def fetch_meal(date: str) -> list:
    """나이스 OPEN API 급식 메뉴 조회"""
    r = requests.get("https://open.neis.go.kr/hub/mealServiceDietInfo", params={
        "KEY": NEIS_KEY, "Type": "json",
        "ATPT_OFCDC_SC_CODE": ATPT_CODE,
        "SD_SCHUL_CODE": SCHUL_CODE,
        "MLSV_FROM_YMD": date,
        "MLSV_TO_YMD": date,
        "MMEAL_SC_CODE": "2",  # 중식
    }, timeout=10)
    return r.json().get("mealServiceDietInfo",[{}])[1].get("row",[])

def parse_codes(dish: str) -> set:
    """메뉴명에서 알레르기 코드 파싱
    예: '군만두/쫄면m (1.5.6.10.13)' -> {1,5,6,10,13}
    """
    m = re.search(r"\(([\d.]+)\)", dish)
    return {int(c) for c in m.group(1).split(".") if c.isdigit()} if m else set()

def load_students(path: str | Path = BASE_DIR / "allergystudents.csv") -> list:
    students_path = BASE_DIR / "students.csv"

    with open(students_path, encoding="utf-8-sig") as students_file:
        emails_by_student_id = {
            row["학번"]: row["이메일"]
            for row in csv.DictReader(students_file)
            if row.get("학번") and row.get("이메일")
        }

    with open(path, encoding="utf-8-sig") as f:
        return [
            {
                "name": row["이름"],
                "email": emails_by_student_id[row["학번"]],
                "codes": {int(code) for code in row["알레르기코드"].split(",") if code},
            }
            for row in csv.DictReader(f)
            if row.get("알레르기코드") and row.get("학번") in emails_by_student_id
        ]

def send_email(student: dict, date: str, matched: dict):
    subject = f"[성의고] {date[:4]}.{date[4:6]}.{date[6:]} 급식 알레르기 주의"
    lines = "\n".join(
        f"  • {menu}: {', '.join(ALLERGY_MAP.get(code, '') for code in codes)}"
        for menu, codes in matched.items()
    )
    body = (f"안녕하세요 {student['name']}학생,\n\n"
            f"모레({date[4:6]}월 {date[6:]}일) 급식에 주의 메뉴가 있습니다:\n\n"
            f"{lines}\n\n"
            f"해당 음식은 섭취를 피하거나 보건선생님과 상담하세요.\n\n"
            f"성의고등학교 보건실 드림")

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": RESEND_FROM_EMAIL,
            "to": [student["email"]],
            "subject": subject,
            "text": body,
        },
        timeout=10,
    )
    response.raise_for_status()
    print(f"  ✓ 발송: {student['name']} <{student['email']}>")


def diagnose() -> int:
    print("설정 진단 시작")

    env_checks = {
        "NEIS_API_KEY": NEIS_KEY,
        "RESEND_API_KEY": RESEND_API_KEY,
        "RESEND_FROM_EMAIL": RESEND_FROM_EMAIL,
        "ATPT_OFCDC_SC_CODE": ATPT_CODE,
        "SD_SCHUL_CODE": SCHUL_CODE,
    }
    for name, value in env_checks.items():
        print(f"- {name}: {config_status(value).upper()}")

    students_path = BASE_DIR / "students.csv"
    allergy_students_path = BASE_DIR / "allergystudents.csv"
    print(f"- students.csv: {'OK' if students_path.exists() else 'MISSING'}")
    print(f"- allergystudents.csv: {'OK' if allergy_students_path.exists() else 'MISSING'}")

    try:
        students = load_students()
        print(f"- load_students: OK ({len(students)}명)")
    except Exception as error:
        print(f"- load_students: ERROR ({error})")
        return 1

    if not is_configured(NEIS_KEY):
        print("- NEIS API 점검: SKIPPED (NEIS_API_KEY 없음)")
        print("진단 종료")
        return 1

    try:
        date = get_target_date()
        rows = fetch_meal(date)
        print(f"- NEIS API 점검: OK ({date}, row={len(rows)})")
    except Exception as error:
        print(f"- NEIS API 점검: ERROR ({error})")
        return 1

    print("진단 종료")
    return 0

def run():
    require_config("NEIS_API_KEY", NEIS_KEY)
    require_config("RESEND_API_KEY", RESEND_API_KEY)
    #require_config("RESEND_FROM_EMAIL", RESEND_FROM_EMAIL)

    date = get_target_date()
    print(f"\n[{datetime.now():%Y-%m-%d %H:%M}] 알레르기 알림 시작 - 대상: {date}")
    rows = fetch_meal(date)
    if not rows:
        print("  급식 정보 없음 (휴일 또는 API 오류)"); return

    # DDISH_NM 파싱: '메뉴명 (알레르기코드)' 형식 처리
    menus: dict[str, set] = {}
    for dish in rows[0]["DDISH_NM"].replace("<br/>", "\n").split("\n"):
        d = dish.strip()
        if d:
            menus[re.sub(r"\s*\([^)]*\)", "", d).strip()] = parse_codes(d)

    students = load_students()
    sent = 0
    for s in students:
        matched = {m:c for m,c in menus.items() if c & s["codes"]}
        if matched:
            try: send_email(s, date, matched); sent += 1
            except Exception as e: print(f"  ✗ 오류 {s['name']}: {e}")

    print(f"  완료: {sent}/{len(students)}명 발송")

# 매일 오전 7:00 스케줄
schedule.every().day.at("07:00").do(run)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="성의고등학교 알레르기 알림 서비스")
    parser.add_argument(
        "--diagnose",
        action="store_true",
        help="이메일 발송 없이 설정과 CSV/NEIS 연결 상태를 점검합니다.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="스케줄 대기 없이 즉시 한 번만 실행합니다.",
    )
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()

    if args.diagnose:
        raise SystemExit(diagnose())

    if args.once:
        print("성의고등학교 알레르기 알림 서비스 즉시 실행")
        run()
        raise SystemExit(0)

    print("성의고등학교 알레르기 알림 서비스 시작")
    print("매일 오전 07:00에 알림을 발송합니다.\n")
    run()  # 시작 시 즉시 1회 실행
    while True:
        schedule.run_pending()
        time.sleep(60)
