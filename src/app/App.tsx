import { useState, useRef, useEffect } from "react";
import {
  Home, Search, Menu, User, Bell, LogOut, Plus, RefreshCw,
  AlertTriangle, Heart, Users, FileText, Shield, Lock, Activity,
  ChevronRight, X, Key, Mail, Phone, Eye, EyeOff,
  Upload, Download, Settings, TrendingUp, BarChart2, Database,
  Utensils, Clock, Filter, Edit2, CheckCircle, BookOpen, Award,
  ArrowLeft, Info, Wifi, Battery, Signal
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid
} from "recharts";

// ─── SEEDED RANDOM & GENERATORS ──────────────────────────────────────────────
const SR = (n: number) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
const SURNAMES = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","류","전","홍","고","문","양","손"];
const GNAMES   = ["민준","서준","도윤","예준","시우","주원","하준","지호","준서","현우","도현","지훈","건우","우진","민재","현준","선우","서진","민서","서연","서윤","지우","서현","민지","하은","하윤","윤서","채원","수아","지아","지민","다은","채은","유진","은서","예은","지수","다현","예린","수민"];
const gName  = (s: number) => SURNAMES[~~(SR(s)*SURNAMES.length)] + GNAMES[~~(SR(s+1)*GNAMES.length)];
const gPhone = (s: number) => `010-${String(~~(SR(s)*9000+1000))}-${String(~~(SR(s+1)*9000+1000))}`;

const ALLERGY: Record<number,string> = {1:"난류",2:"우유",3:"메밀",4:"땅콩",5:"대두",6:"밀",7:"고등어",8:"게",9:"새우",10:"돼지고기",11:"복숭아",12:"토마토",13:"아황산염"};
const DISEASES = ["천식","당뇨","심장질환","고혈압","아토피","비염","척추측만증"];

const gAllergy = (s: number): number[] => {
  if (SR(s+10) > 0.35) return [];
  const n = ~~(SR(s+20)*3)+1;
  const c = new Set<number>();
  for (let i = 0; c.size < n; i++) c.add(~~(SR(s+30+i)*13)+1);
  return [...c].sort((a,b)=>a-b);
};

// ─── STUDENT DATA (500명) ─────────────────────────────────────────────────────
interface Student { id:string; name:string; email:string; phone:string; guardianPhone:string; grade:number; cls:number; num:number; allergyCodes:number[]; disease:string|null; }

const STUDENTS: Student[] = (() => {
  const list: Student[] = [];
  let seed = 1, count = 0;
  for (let grade = 1; grade <= 3 && count < 500; grade++) {
    for (let cls = 1; cls <= 17 && count < 500; cls++) {
      for (let num = 1; num <= 10 && count < 500; num++, seed++, count++) {
        const id = `${grade}${String(cls).padStart(2,"0")}${String(num).padStart(2,"0")}`;
        list.push({ id, grade, cls, num, name: gName(seed), email: `s${id}@sungui.hs.kr`, phone: gPhone(seed), guardianPhone: gPhone(seed+500), allergyCodes: gAllergy(seed), disease: SR(seed+40)<0.12 ? DISEASES[~~(SR(seed+50)*DISEASES.length)] : null });
      }
    }
  }
  return list;
})();

// ─── BMI DATA ────────────────────────────────────────────────────────────────
const BMI_MAP: Record<string,number> = Object.fromEntries(STUDENTS.map((s,i) => [s.id, parseFloat((15+SR(i+1)*20).toFixed(1))]));
const getBMI = (id: string) => BMI_MAP[id] ?? 22.0;
const getBMIInfo = (bmi: number) => {
  if (bmi < 18.5) return { label:"체중미달", color:"#3b82f6", bg:"#eff6ff", ring:"ring-blue-300" };
  if (bmi < 23)   return { label:"정상",     color:"#10b981", bg:"#ecfdf5", ring:"ring-emerald-300" };
  if (bmi < 25)   return { label:"과체중",   color:"#f59e0b", bg:"#fef3c7", ring:"ring-amber-300" };
  if (bmi < 30)   return { label:"비만",     color:"#f97316", bg:"#fff7ed", ring:"ring-orange-300" };
  return               { label:"고도비만",   color:"#ef4444", bg:"#fef2f2", ring:"ring-red-300" };
};
const getWeeklyBMI = (id: string) => {
  const base = getBMI(id); const s = parseInt(id);
  return ["월","화","수","목","금","토","일"].map((day,i) => ({ day, bmi: parseFloat((base+(SR(s+i+100)-0.5)*0.5).toFixed(1)) }));
};

// ─── MEAL MOCK (나이스 API 2일 후 급식) ─────────────────────────────────────
const MEAL_TARGET = "2026년 7월 20일 (월)";
const MEAL_ITEMS = [
  { name:"잡곡밥",         codes:[] },
  { name:"된장찌개",       codes:[5,6] },
  { name:"돈까스",         codes:[1,6,10] },
  { name:"군만두/쫄면",    codes:[1,5,6,10,13] },
  { name:"깍두기",         codes:[13] },
  { name:"우유",           codes:[2] },
  { name:"복숭아",         codes:[11] },
];

const TODAY_WEATHER = {
  location: "김천시",
  summary: "구름조금",
  tempC: 29.7,
  humidity: 70,
  windMps: 1.0,
};

const AI_EXERCISE_RECOMMENDATIONS = [
  {
    id: "squat",
    name: "스쿼트 인터벌",
    durationMin: 9,
    focus: "하체 근지구력",
    reason: "기온 29.7도에서도 교실/체육관에서 5~10분 내 수행 가능",
  },
  {
    id: "lunge",
    name: "런지 밸런스 루틴",
    durationMin: 6,
    focus: "코어 + 균형감",
    reason: "바람이 약한 날(1.0m/s)에도 실내 보강운동으로 안전하게 진행 가능",
  },
] as const;

const buildPoseCoachingSnippet = (exerciseId: "squat" | "lunge") => {
  const exerciseName = exerciseId === "squat" ? "스쿼트" : "런지";
  return `# MediaPipe Pose 기반 ${exerciseName} 코칭 실행 예시
# 1) 의존성 설치: pip install opencv-python mediapipe numpy
# 2) 실행: python csv_files/mediapipe_pose_coaching.py --exercise ${exerciseId}

import cv2
import mediapipe as mp

pose = mp.solutions.pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ok, frame = cap.read()
    if not ok:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = pose.process(rgb)
    if result.pose_landmarks:
        # 어깨-엉덩이-무릎 각도/무릎-발목 정렬을 계산해 자세 피드백
        pass

    cv2.imshow("${exerciseName} Pose Coaching", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break
`;
};

// ─── STATS ────────────────────────────────────────────────────────────────────
const STATS = { total: 500, allergy: STUDENTS.filter(s=>s.allergyCodes.length>0).length, disease: STUDENTS.filter(s=>s.disease).length };
const MY_CLASS = STUDENTS.filter(s=>s.grade===1&&s.cls===1);

// ─── MOCK TEACHERS ───────────────────────────────────────────────────────────
const initTeachers = [
  { id:"T001", name:"이지영", email:"ljy@sungui.hs.kr", role:"담임",   grade:1, cls:1,    active:true  },
  { id:"T002", name:"박민수", email:"pms@sungui.hs.kr", role:"비담임", grade:null, cls:null, active:true  },
  { id:"T003", name:"최수진", email:"csj@sungui.hs.kr", role:"비교과", grade:null, cls:null, active:true  },
  { id:"T004", name:"정현호", email:"jho@sungui.hs.kr", role:"담임",   grade:2, cls:3,    active:true  },
  { id:"T005", name:"강미래", email:"kmr@sungui.hs.kr", role:"비담임", grade:null, cls:null, active:false },
  { id:"T006", name:"조성민", email:"jsm@sungui.hs.kr", role:"비교과", grade:null, cls:null, active:true  },
];

// ─── CSV DOWNLOAD ─────────────────────────────────────────────────────────────
const dlCSV = (content: string, filename: string) => {
  const blob = new Blob(["﻿"+content], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};
const dlText = (content: string, filename: string) => {
  const blob = new Blob([content], { type:"text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

const csvStudents     = () => ["학번,이름,이메일,폰번호,보호자폰번호", ...STUDENTS.map(s=>`${s.id},${s.name},${s.email},${s.phone},${s.guardianPhone}`)].join("\n");
const csvBMI          = () => ["학번,BMI지수,상태", ...STUDENTS.map(s=>{const b=getBMI(s.id);return `${s.id},${b},${getBMIInfo(b).label}`;})].join("\n");
const csvAllergyCode  = () => ["코드번호,알레르기명", ...Object.entries(ALLERGY).map(([k,v])=>`${k},${v}`)].join("\n");
const csvAllergyStud  = () => ["학번,이름,알레르기코드,알레르기명", ...STUDENTS.filter(s=>s.allergyCodes.length>0).map(s=>`${s.id},${s.name},"${s.allergyCodes.join(",")}"` +`,"${s.allergyCodes.map(c=>ALLERGY[c]).join(",")}"`)].join("\n");

// ─── PYTHON BACKEND ───────────────────────────────────────────────────────────
const PYTHON_CODE = `#!/usr/bin/env python3
"""성의고등학교 알레르기 알림 서비스 - 매일 오전 7시 실행"""
import os, re, smtplib, requests, schedule, time, csv
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

NEIS_KEY   = os.getenv("NEIS_API_KEY")
SMTP_USER  = os.getenv("SMTP_USER")
SMTP_PASS  = os.getenv("SMTP_PASS")
ATPT_CODE  = "T10"      # 충남교육청
SCHUL_CODE = "9290083"  # 성의고등학교

ALLERGY_MAP = {1:"난류",2:"우유",3:"메밀",4:"땅콩",5:"대두",
               6:"밀",7:"고등어",8:"게",9:"새우",10:"돼지고기",
               11:"복숭아",12:"토마토",13:"아황산염"}

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
    m = re.search(r"\\(([\\d.]+)\\)", dish)
    return {int(c) for c in m.group(1).split(".") if c.isdigit()} if m else set()

def load_students(path="allergystudents.csv") -> list:
    with open(path, encoding="utf-8-sig") as f:
        return [{"name":r["이름"],"email":r["이메일"],
                 "codes":{int(c) for c in r["알레르기코드"].split(",") if c}}
                for r in csv.DictReader(f) if r.get("알레르기코드")]

def send_email(student: dict, date: str, matched: dict):
    msg = MIMEMultipart()
    msg["From"] = SMTP_USER; msg["To"] = student["email"]
    msg["Subject"] = f"[성의고] {date[:4]}.{date[4:6]}.{date[6:]} 급식 알레르기 주의"
    lines = "\\n".join(
        f"  • {m}: {', '.join(ALLERGY_MAP.get(c,'') for c in cs)}"
        for m, cs in matched.items()
    )
    body = (f"안녕하세요 {student['name']}학생,\\n\\n"
            f"모레({date[4:6]}월 {date[6:]}일) 급식에 주의 메뉴가 있습니다:\\n\\n"
            f"{lines}\\n\\n"
            f"해당 음식은 섭취를 피하거나 보건선생님과 상담하세요.\\n\\n"
            f"성의고등학교 보건실 드림")
    msg.attach(MIMEText(body, "plain", "utf-8"))
    with smtplib.SMTP("smtp.gmail.com", 587) as s:
        s.starttls(); s.login(SMTP_USER, SMTP_PASS); s.send_message(msg)
    print(f"  ✓ 발송: {student['name']} <{student['email']}>")

def run():
    date = get_target_date()
    print(f"\\n[{datetime.now():%Y-%m-%d %H:%M}] 알레르기 알림 시작 - 대상: {date}")
    rows = fetch_meal(date)
    if not rows:
        print("  급식 정보 없음 (휴일 또는 API 오류)"); return

    # DDISH_NM 파싱: '메뉴명 (알레르기코드)' 형식 처리
    menus: dict[str, set] = {}
    for dish in rows[0]["DDISH_NM"].replace("<br/>", "\\n").split("\\n"):
        d = dish.strip()
        if d:
            menus[re.sub(r"\\s*\\([^)]*\\)", "", d).strip()] = parse_codes(d)

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

if __name__ == "__main__":
    print("성의고등학교 알레르기 알림 서비스 시작")
    print("매일 오전 07:00에 알림을 발송합니다.\\n")
    run()  # 시작 시 즉시 1회 실행
    while True:
        schedule.run_pending()
        time.sleep(60)
`;

const ENV_CONTENT = `# 성의고등학교 건강관리 시스템 환경변수
# ──────────────────────────────────────────────

# NEIS 교육정보 개방 포털 OPEN API 키
# 발급: https://open.neis.go.kr/portal/mainPage.do
NEIS_API_KEY=2a7478927ad3465aa8631f4c3beb48c6

# 학교 코드 (성의고등학교)
ATPT_OFCDC_SC_CODE=T10
SD_SCHUL_CODE=9290083

# OpenAI ChatGPT API 키
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# HuggingFace API 키
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SMTP 이메일 설정 (알레르기 알림 발송용)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=health@sungui.hs.kr
SMTP_PASS=your_gmail_app_password_here

# 개발자 가이드
# https://open.neis.go.kr/portal/guide/apiGuidePage.do
`;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Role = "student" | "teacher" | "admin";
type TeacherType = "담임" | "비담임" | "비교과";

// ─── BADGE COMPONENT ─────────────────────────────────────────────────────────
const Badge = ({ text, color="blue" }: { text:string; color?:string }) => {
  const map: Record<string,string> = {
    blue:"bg-blue-100 text-blue-700", green:"bg-emerald-100 text-emerald-700",
    red:"bg-red-100 text-red-700", amber:"bg-amber-100 text-amber-700",
    orange:"bg-orange-100 text-orange-700", gray:"bg-gray-100 text-gray-600",
    navy:"bg-blue-900 text-white", teal:"bg-teal-100 text-teal-700",
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${map[color]||map.gray}`}>{text}</span>;
};

// ─── STATUS BAR ───────────────────────────────────────────────────────────────
const StatusBar = () => (
  <div className="flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-white/90 bg-transparent">
    <span className="font-mono text-[11px]">09:41</span>
    <div className="flex items-center gap-1.5">
      <Signal size={12}/><Wifi size={12}/><Battery size={14}/>
    </div>
  </div>
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }: { label:string; value:number|string; icon:any; color:string }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center`} style={{ background: color+"22" }}>
      <Icon size={18} style={{ color }}/>
    </div>
    <div className="text-2xl font-bold text-slate-800">{typeof value==="number" ? value.toLocaleString() : value}</div>
    <div className="text-xs text-slate-500 leading-tight">{label}</div>
  </div>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole]           = useState<Role|null>(null);
  const [teacherType, setTeacherType] = useState<TeacherType>("담임");
  const [tab, setTab]             = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showFAB, setShowFAB]     = useState(false);
  const [showPython, setShowPython] = useState(false);
  const [showEnv, setShowEnv]     = useState(false);
  const [pwTarget, setPwTarget]   = useState<string|null>(null);
  const [newPw, setNewPw]         = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [searchQ, setSearchQ]     = useState("");
  const [teachers, setTeachers]   = useState(initTeachers);
  const [uploadMsg, setUploadMsg] = useState<string|null>(null);
  const [journalText, setJournalText] = useState("");
  const [journalMood, setJournalMood] = useState("😊");
  const [journalSaved, setJournalSaved] = useState(false);
  const [loginPw, setLoginPw]     = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginRole, setLoginRole] = useState<Role|null>(null);
  const [selectedCoachingExercise, setSelectedCoachingExercise] = useState<"squat" | "lunge" | null>(null);
  const touchStart = useRef(0);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const DEMO = { student: STUDENTS[0], bmi: getBMI(STUDENTS[0].id) };
  const DEMO_BMI_INFO = getBMIInfo(DEMO.bmi);

  const tabCount = 4;
  const swipe = (dir: 1|-1) => setTab(t => Math.max(0, Math.min(tabCount-1, t+dir)));

  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) swipe(diff > 0 ? 1 : -1);
  };

  const pullRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const doLogin = (r: Role) => { setRole(r); setTab(0); setLoginRole(null); setLoginPw(""); };
  const logout   = () => { setRole(null); setTab(0); setLoginRole(null); };

  // ── BOTTOM NAV CONFIGS ────────────────────────────────────────────────────
  const studentTabs = [
    { icon: Home,     label:"홈"    },
    { icon: Activity, label:"건강"  },
    { icon: Utensils, label:"급식"  },
    { icon: User,     label:"프로필"},
  ];
  const teacherTabs = [
    { icon: Home,     label:"홈"    },
    { icon: Users,    label:"학생"  },
    { icon: FileText, label:"파일"  },
    { icon: User,     label:"프로필"},
  ];
  const adminTabs = [
    { icon: BarChart2, label:"현황"  },
    { icon: Database,  label:"파일"  },
    { icon: Shield,    label:"권한"  },
    { icon: Settings,  label:"설정"  },
  ];
  const tabConfig = role==="student" ? studentTabs : role==="teacher" ? teacherTabs : adminTabs;

  // ── FILTERED STUDENTS ─────────────────────────────────────────────────────
  const filteredStudents = STUDENTS.filter(s =>
    s.name.includes(searchQ) || s.id.includes(searchQ) ||
    String(s.grade).includes(searchQ)
  ).slice(0, 30);

  // ── SCREEN CONTENT ────────────────────────────────────────────────────────
  const renderContent = () => {
    if (!role) return null;

    // ── STUDENT SCREENS ──
    if (role === "student") {
      const myAllergy = DEMO.student.allergyCodes;
      const matchedMeals = MEAL_ITEMS.filter(m => m.codes.some(c => myAllergy.includes(c)));

      // Tab 0: 홈
      if (tab === 0) return (
        <div className="space-y-3 pb-4">
          {/* 헤더 카드 */}
          <div className="mx-4 rounded-2xl p-4" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-white/70 text-xs">성의고등학교</p>
                <h2 className="text-white font-bold text-lg">안녕하세요, {DEMO.student.name} 🎒</h2>
                <p className="text-white/60 text-xs mt-0.5">{DEMO.student.grade}학년 {DEMO.student.cls}반 {DEMO.student.num}번 · {DEMO.student.id}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <User size={24} className="text-white"/>
              </div>
            </div>
          </div>

          {/* 오늘의 BMI */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">오늘 BMI</span>
              <Badge text={DEMO_BMI_INFO.label} color={DEMO_BMI_INFO.label==="정상"?"green":DEMO_BMI_INFO.label==="체중미달"?"blue":"orange"}/>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold" style={{ color:DEMO_BMI_INFO.color }}>{DEMO.bmi}</span>
              <span className="text-slate-400 text-sm mb-1">kg/m²</span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(100,(DEMO.bmi/40)*100)}%`, background:DEMO_BMI_INFO.color }}/>
            </div>
          </div>

          {/* 알레르기 알림 */}
          {matchedMeals.length > 0 && (
            <div className="mx-4 rounded-2xl p-4 border-l-4 border-orange-400 bg-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-orange-500"/>
                <span className="text-sm font-semibold text-orange-700">급식 알레르기 주의</span>
              </div>
              <p className="text-xs text-orange-600 mb-1">{MEAL_TARGET} 예정 급식</p>
              {matchedMeals.map((m,i) => (
                <div key={i} className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-orange-700 font-medium">• {m.name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {m.codes.filter(c=>myAllergy.includes(c)).map(c=>(
                      <Badge key={c} text={ALLERGY[c]} color="orange"/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 빠른 메뉴 */}
          <div className="mx-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">빠른 이동</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label:"건강 기록", icon:Activity, color:"#1e3a6e", tab:1 },
                { label:"급식 확인", icon:Utensils, color:"#00b894", tab:2 },
                { label:"알레르기", icon:AlertTriangle, color:"#f97316", tab:2 },
                { label:"건강 일지", icon:BookOpen, color:"#8b5cf6", fab:true },
              ].map((item,i) => (
                <button key={i} onClick={() => item.fab ? setShowFAB(true) : setTab(item.tab)} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-2 hover:shadow-md transition-shadow active:scale-95">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:item.color+"18" }}>
                    <item.icon size={16} style={{ color:item.color }}/>
                  </div>
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 건강 관리팀 */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">건강 관리팀</p>
            {[
              { role:"보건교사", name:"김보건", phone:"041-555-0001" },
              { role:"담임교사", name:"이지영", phone:"041-555-0002" },
            ].map((t,i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0 border-slate-50">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{t.name}</p>
                  <p className="text-[10px] text-slate-400">{t.role}</p>
                </div>
                <a href={`tel:${t.phone}`} className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <Phone size={12}/>{t.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      );

      // Tab 1: 건강 (BMI 상세 + 주간 그래프)
      if (tab === 1) {
        const weekly = getWeeklyBMI(DEMO.student.id);
        return (
          <div className="space-y-3 pb-4">
            <div className="mx-4 rounded-2xl p-4" style={{ background:`linear-gradient(135deg,${DEMO_BMI_INFO.color}dd,${DEMO_BMI_INFO.color}99)` }}>
              <p className="text-white/80 text-xs mb-1">현재 BMI 지수</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">{DEMO.bmi}</span>
                <span className="text-white/70">kg/m²</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{DEMO_BMI_INFO.label}</span>
                <span className="text-white/70 text-xs">2026년 3월 건강검사</span>
              </div>
            </div>

            {/* 주간 BMI 추이 */}
            <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-3">주간 BMI 추이</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={weekly} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:"#94a3b8" }}/>
                  <YAxis domain={["auto","auto"]} tick={{ fontSize:11, fill:"#94a3b8" }}/>
                  <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:"none", boxShadow:"0 4px 20px rgba(0,0,0,.1)" }}/>
                  <Line type="monotone" dataKey="bmi" stroke={DEMO_BMI_INFO.color} strokeWidth={2.5} dot={{ r:4, fill:DEMO_BMI_INFO.color }} activeDot={{ r:6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* BMI 범위 안내 */}
            <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-3">BMI 기준표</p>
              {[
                { label:"체중미달", range:"18.5 미만",  color:"#3b82f6" },
                { label:"정상",     range:"18.5 – 22.9", color:"#10b981" },
                { label:"과체중",   range:"23.0 – 24.9", color:"#f59e0b" },
                { label:"비만",     range:"25.0 – 29.9", color:"#f97316" },
                { label:"고도비만", range:"30.0 이상",   color:"#ef4444" },
              ].map((row,i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background:row.color }}/>
                  <span className="text-xs font-medium text-slate-600 w-16">{row.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{row.range}</span>
                  {DEMO_BMI_INFO.label === row.label && <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded-full ml-auto">현재</span>}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // Tab 2: 급식/알레르기
      if (tab === 2) return (
        <div className="space-y-3 pb-4">
          <details className="mx-4 bg-white rounded-2xl p-4 shadow-sm" open>
            <summary className="list-none cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 mb-1">나이스 API · 오늘+2일 예정</p>
                  <h3 className="text-sm font-semibold text-slate-700">오늘의 중식 메뉴</h3>
                </div>
                <ChevronRight size={16} className="text-slate-400"/>
              </div>
            </summary>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500 mb-2">{MEAL_TARGET} 중식 예정</p>
              <div className="space-y-2">
                {MEAL_ITEMS.map((item,i) => {
                  const hasMyAllergy = item.codes.some(c=>myAllergy.includes(c));
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${hasMyAllergy?"bg-orange-50 border border-orange-100":""}`}>
                      {hasMyAllergy && <AlertTriangle size={13} className="text-orange-500 mt-0.5 flex-shrink-0"/>}
                      {!hasMyAllergy && <div className="w-[13px]"/>}
                      <div className="flex-1">
                        <span className={`text-xs font-medium ${hasMyAllergy?"text-orange-700":"text-slate-700"}`}>{item.name}</span>
                        {item.codes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.codes.map(c => (
                              <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${myAllergy.includes(c)?"bg-orange-200 text-orange-700":"bg-slate-100 text-slate-500"}`}>
                                {c}.{ALLERGY[c]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>

          <details className="mx-4 bg-white rounded-2xl p-4 shadow-sm" open>
            <summary className="list-none cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 mb-1">OpenWeatherMap · 실내 추천 모드</p>
                  <h3 className="text-sm font-semibold text-slate-700">AI가 추천하는 오늘의 운동 코칭</h3>
                </div>
                <ChevronRight size={16} className="text-slate-400"/>
              </div>
            </summary>
            <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-xs font-semibold text-blue-800">오늘 날씨: {TODAY_WEATHER.location} · {TODAY_WEATHER.summary}</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  기온 {TODAY_WEATHER.tempC}도 · 습도 {TODAY_WEATHER.humidity}% · 풍속 {TODAY_WEATHER.windMps}m/s
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {AI_EXERCISE_RECOMMENDATIONS.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => setSelectedCoachingExercise(exercise.id)}
                    className="text-left rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 hover:bg-emerald-100 transition-colors"
                  >
                    <p className="text-xs font-semibold text-emerald-800">{exercise.name} · {exercise.durationMin}분</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">초점: {exercise.focus}</p>
                    <p className="text-[10px] text-emerald-700/90 mt-1">추천 이유: {exercise.reason}</p>
                  </button>
                ))}
              </div>

              {selectedCoachingExercise && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    선택한 운동: {selectedCoachingExercise === "squat" ? "스쿼트 인터벌" : "런지 밸런스 루틴"}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">MediaPipe 기반 자세 코칭 코드</p>
                  <pre className="text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap overflow-x-auto">
                    {buildPoseCoachingSnippet(selectedCoachingExercise)}
                  </pre>
                </div>
              )}
            </div>
          </details>

          {/* 내 알레르기 목록 */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">내 알레르기 정보</p>
            {myAllergy.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle size={16}/><span className="text-sm">알레르기 없음</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myAllergy.map(c => (
                  <div key={c} className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl">
                    <AlertTriangle size={11}/>{c}. {ALLERGY[c]}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NEIS API 정보 */}
          <div className="mx-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Database size={14} className="text-slate-500"/>
              <span className="text-xs font-semibold text-slate-500">나이스 API 연동</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono break-all">https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=T10&SD_SCHUL_CODE=9290083</p>
            <div className="mt-2 flex gap-2">
              <Badge text="성의고등학교" color="navy"/>
              <Badge text="매일 07:00 자동발송" color="green"/>
            </div>
          </div>
        </div>
      );

      // Tab 3: 프로필
      if (tab === 3) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl overflow-hidden">
            <div className="p-5 flex flex-col items-center gap-2" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/30">
                <User size={32} className="text-white"/>
              </div>
              <h3 className="text-white font-bold text-lg">{DEMO.student.name}</h3>
              <p className="text-white/70 text-xs">{DEMO.student.grade}학년 {DEMO.student.cls}반 {DEMO.student.num}번 · {DEMO.student.id}</p>
            </div>
          </div>

          <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            {[
              { label:"이메일",       value:DEMO.student.email,        icon:Mail },
              { label:"전화번호",     value:DEMO.student.phone,        icon:Phone },
              { label:"보호자 연락처", value:DEMO.student.guardianPhone, icon:Phone },
            ].map((row,i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-slate-50">
                <row.icon size={16} className="text-slate-400"/>
                <div>
                  <p className="text-[10px] text-slate-400">{row.label}</p>
                  <p className="text-xs font-medium text-slate-700">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          {DEMO.student.disease && (
            <div className="mx-4 bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-xs font-semibold text-red-600 mb-1">등록 질병</p>
              <Badge text={DEMO.student.disease} color="red"/>
            </div>
          )}

          <div className="mx-4">
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors active:scale-95">
              <LogOut size={16}/> 로그아웃
            </button>
          </div>
        </div>
      );
    }

    // ── TEACHER SCREENS ──
    if (role === "teacher") {
      const isDamim = teacherType === "담임";

      // Tab 0: 홈 대시보드
      if (tab === 0) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-4" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
            <p className="text-white/70 text-xs">성의고등학교</p>
            <h2 className="text-white font-bold text-lg">이지영 교사</h2>
            <div className="flex gap-2 mt-1">
              <Badge text={teacherType} color="teal"/>
              {isDamim && <Badge text="1학년 1반" color="navy"/>}
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="mx-4 grid grid-cols-3 gap-2">
            <StatCard label="전체 학생" value={STATS.total}   icon={Users}         color="#1e3a6e"/>
            <StatCard label="알레르기"  value={STATS.allergy}  icon={AlertTriangle}  color="#f97316"/>
            <StatCard label="질병 등록" value={STATS.disease}  icon={Heart}         color="#ef4444"/>
          </div>

          {/* 담임인 경우: 자기 반 학생 건강관리 테이블 */}
          {isDamim && (
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <p className="text-sm font-semibold text-slate-700">1학년 1반 건강관리</p>
                <span className="text-xs text-slate-400">{MY_CLASS.length}명</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">학번</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">이름</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">BMI</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">알레르기</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">질병</th>
                  </tr></thead>
                  <tbody>
                    {MY_CLASS.map((s,i) => {
                      const bmi = getBMI(s.id); const bi = getBMIInfo(bmi);
                      return (
                        <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono text-slate-500">{s.id}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{s.name}</td>
                          <td className="px-3 py-2">
                            <span className="font-semibold" style={{ color:bi.color }}>{bmi}</span>
                          </td>
                          <td className="px-3 py-2">
                            {s.allergyCodes.length > 0 ? <Badge text={`${s.allergyCodes.length}종`} color="orange"/> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {s.disease ? <Badge text={s.disease} color="red"/> : <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 비담임 교사: 전체 현황 */}
          {!isDamim && (
            <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-3">학년별 알레르기 현황</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[1,2,3].map(g=>({ grade:`${g}학년`, count:STUDENTS.filter(s=>s.grade===g&&s.allergyCodes.length>0).length }))}>
                  <XAxis dataKey="grade" tick={{ fontSize:11, fill:"#94a3b8" }}/>
                  <YAxis tick={{ fontSize:11, fill:"#94a3b8" }}/>
                  <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }}/>
                  <Bar dataKey="count" name="알레르기 학생 수" fill="#f97316" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );

      // Tab 1: 학생 검색/테이블
      if (tab === 1) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100">
              <Search size={16} className="text-slate-400"/>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="이름, 학번, 학년 검색..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400"/>
              {searchQ && <button onClick={()=>setSearchQ("")}><X size={14} className="text-slate-400"/></button>}
            </div>
          </div>
          <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs font-semibold text-slate-500">검색 결과 {filteredStudents.length}명</p>
              <Filter size={14} className="text-slate-400"/>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white"><tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">학번</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">이름</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">BMI</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">알레르기</th>
                </tr></thead>
                <tbody>
                  {filteredStudents.map((s,i) => {
                    const bmi = getBMI(s.id); const bi = getBMIInfo(bmi);
                    return (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-mono text-slate-500">{s.id}</td>
                        <td className="px-3 py-2 font-medium text-slate-700">{s.name}</td>
                        <td className="px-3 py-2">
                          <span style={{ color:bi.color }} className="font-semibold">{bmi}</span>
                          <span className="text-slate-400 ml-1 text-[10px]">{bi.label}</span>
                        </td>
                        <td className="px-3 py-2">
                          {s.allergyCodes.length>0 ? <div className="flex flex-wrap gap-0.5">{s.allergyCodes.slice(0,2).map(c=><Badge key={c} text={ALLERGY[c]} color="orange"/>)}{s.allergyCodes.length>2&&<Badge text={`+${s.allergyCodes.length-2}`} color="gray"/>}</div> : <span className="text-slate-300">없음</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

      // Tab 2: CSV 파일 관리
      if (tab === 2) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-4 bg-blue-900 text-white">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16}/>
              <h3 className="font-semibold">CSV 파일 관리</h3>
            </div>
            <p className="text-white/70 text-xs">교사용 건강데이터 파일 다운로드</p>
          </div>

          {[
            { name:"students.csv",       desc:"500명 학생 기본정보",        fn:()=>dlCSV(csvStudents(),"students.csv") },
            { name:"bmi.csv",            desc:"학생 BMI 지수 및 상태",      fn:()=>dlCSV(csvBMI(),"bmi.csv") },
            { name:"allergycode.csv",    desc:"알레르기 코드 1-13 코드표",  fn:()=>dlCSV(csvAllergyCode(),"allergycode.csv") },
            { name:"allergystudents.csv",desc:"알레르기 학생 명단",         fn:()=>dlCSV(csvAllergyStud(),"allergystudents.csv") },
          ].map((f,i) => (
            <div key={i} className="mx-4 bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-blue-700"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{f.name}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
              <button onClick={f.fn} className="flex-shrink-0 flex items-center gap-1.5 bg-blue-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors active:scale-95">
                <Download size={13}/>다운로드
              </button>
            </div>
          ))}

          <div className="mx-4 bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <Info size={14} className="text-amber-600"/>
              <span className="text-xs font-semibold text-amber-700">CSV 업로드 안내</span>
            </div>
            <p className="text-xs text-amber-600 leading-relaxed">매년 3월 건강검사 후 <strong>allergystudents.csv</strong> 파일을 관리자에게 제출하세요. 파일 업로드는 관리자 권한이 필요합니다.</p>
          </div>
        </div>
      );

      // Tab 3: 프로필
      if (tab === 3) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-5 flex flex-col items-center gap-2" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/30">
              <User size={32} className="text-white"/>
            </div>
            <h3 className="text-white font-bold text-lg">이지영</h3>
            <div className="flex gap-2">
              <Badge text={teacherType} color="teal"/>
              {isDamim && <Badge text="1학년 1반 담임" color="navy"/>}
            </div>
          </div>

          <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            {[
              { label:"이메일",   value:"ljy@sungui.hs.kr", icon:Mail },
              { label:"전화",    value:"041-555-1234",      icon:Phone },
            ].map((row,i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-slate-50">
                <row.icon size={16} className="text-slate-400"/>
                <div>
                  <p className="text-[10px] text-slate-400">{row.label}</p>
                  <p className="text-xs font-medium text-slate-700">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-2">교사 유형 변경 (데모)</p>
            <div className="flex gap-2">
              {(["담임","비담임","비교과"] as TeacherType[]).map(t => (
                <button key={t} onClick={()=>setTeacherType(t)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${teacherType===t?"bg-blue-900 text-white":"bg-slate-100 text-slate-600"}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="mx-4">
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors active:scale-95">
              <LogOut size={16}/> 로그아웃
            </button>
          </div>
        </div>
      );
    }

    // ── ADMIN SCREENS ──
    if (role === "admin") {
      // Tab 0: 현황 대시보드
      if (tab === 0) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-4" style={{ background:"linear-gradient(135deg,#1e3a6e,#0f2748)" }}>
            <p className="text-white/70 text-xs">성의고등학교</p>
            <h2 className="text-white font-bold text-lg">관리자 대시보드</h2>
            <p className="text-white/60 text-xs mt-0.5">admin@sungui.hs.kr</p>
          </div>

          <div className="mx-4 grid grid-cols-2 gap-2">
            <StatCard label="전체 학생"   value={STATS.total}                icon={Users}        color="#1e3a6e"/>
            <StatCard label="알레르기 학생" value={STATS.allergy}             icon={AlertTriangle} color="#f97316"/>
            <StatCard label="질병 등록"    value={STATS.disease}             icon={Heart}        color="#ef4444"/>
            <StatCard label="등록 교사"    value={teachers.length}           icon={BookOpen}     color="#8b5cf6"/>
          </div>

          {/* BMI 분포 파이차트 */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">BMI 상태 분포 (전체 학생)</p>
            {(() => {
              const counts = { "체중미달":0,"정상":0,"과체중":0,"비만":0,"고도비만":0 };
              STUDENTS.forEach(s => { const b=getBMI(s.id); counts[getBMIInfo(b).label]++; });
              const data = Object.entries(counts).map(([name,value])=>({ name, value }));
              const colors = ["#3b82f6","#10b981","#f59e0b","#f97316","#ef4444"];
              return (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width="55%" height={120}>
                    <PieChart>
                      <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                        {data.map((_,i) => <Cell key={i} fill={colors[i]}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1">
                    {data.map((d,i)=>(
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background:colors[i] }}/>
                        <span className="text-[10px] text-slate-600">{d.name}</span>
                        <span className="text-[10px] font-bold text-slate-700 ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      );

      // Tab 1: 파일 관리
      if (tab === 1) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-4 bg-blue-900 text-white">
            <h3 className="font-semibold">파일 업로드 / 다운로드</h3>
            <p className="text-white/70 text-xs mt-0.5">매년 3월 건강검사 후 CSV 업로드</p>
          </div>

          {/* 업로드 섹션 */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">CSV 파일 업로드</p>
            <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload size={24} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-xs text-slate-500 font-medium">파일 선택 또는 드래그</p>
              <p className="text-[10px] text-slate-400 mt-0.5">allergystudents.csv 지원</p>
              <input type="file" accept=".csv" className="hidden" onChange={()=>{ setUploadMsg("✓ allergystudents.csv 업로드 완료"); setTimeout(()=>setUploadMsg(null),3000); }}/>
            </label>
            {uploadMsg && <div className="mt-2 text-xs text-emerald-600 font-semibold text-center">{uploadMsg}</div>}
          </div>

          {/* 다운로드 섹션 */}
          <div className="mx-4 bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="text-sm font-semibold text-slate-700">데이터 다운로드</p>
            </div>
            {[
              { name:"students.csv",        desc:"500명 학생 기본정보",       fn:()=>dlCSV(csvStudents(),"students.csv") },
              { name:"bmi.csv",             desc:"BMI 지수 및 상태",          fn:()=>dlCSV(csvBMI(),"bmi.csv") },
              { name:"allergycode.csv",     desc:"알레르기 코드표 (1-13)",    fn:()=>dlCSV(csvAllergyCode(),"allergycode.csv") },
              { name:"allergystudents.csv", desc:"알레르기 학생 명단",        fn:()=>dlCSV(csvAllergyStud(),"allergystudents.csv") },
              { name:"allergy_notification.py", desc:"알림 서비스 파이썬 코드", fn:()=>dlText(PYTHON_CODE,"allergy_notification.py") },
              { name:".env",                desc:"환경변수 템플릿",            fn:()=>dlText(ENV_CONTENT,".env") },
            ].map((f,i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-slate-50">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  {f.name.endsWith(".py") ? <Code size={15} className="text-green-600"/> : f.name===".env" ? <Key size={15} className="text-amber-500"/> : <FileText size={15} className="text-blue-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{f.name}</p>
                  <p className="text-[10px] text-slate-400">{f.desc}</p>
                </div>
                <button onClick={f.fn} className="flex-shrink-0 flex items-center gap-1 bg-blue-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-800 active:scale-95 transition-colors">
                  <Download size={12}/>
                </button>
              </div>
            ))}
          </div>

          {/* Python 코드 미리보기 */}
          <div className="mx-4">
            <button onClick={()=>setShowPython(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 text-green-700 font-medium text-sm hover:bg-green-100 transition-colors border border-green-200">
              <Eye size={16}/> 알림 서비스 코드 미리보기
            </button>
          </div>
          <div className="mx-4">
            <button onClick={()=>setShowEnv(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 text-amber-700 font-medium text-sm hover:bg-amber-100 transition-colors border border-amber-200">
              <Key size={16}/> .env 파일 미리보기
            </button>
          </div>
        </div>
      );

      // Tab 2: 권한 관리
      if (tab === 2) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-4 bg-blue-900 text-white">
            <h3 className="font-semibold">교사 권한 관리</h3>
            <p className="text-white/70 text-xs mt-0.5">담임 / 비담임 / 비교과 권한 설정</p>
          </div>

          <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            {teachers.map((t,i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-slate-50">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.active?"bg-blue-100":"bg-slate-100"}`}>
                  <User size={16} className={t.active?"text-blue-700":"text-slate-400"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">{t.name}</span>
                    <Badge text={t.role} color={t.role==="담임"?"navy":t.role==="비담임"?"teal":"gray"}/>
                    {!t.active && <Badge text="비활성" color="red"/>}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{t.email}</p>
                  {t.grade && <p className="text-[10px] text-blue-500">{t.grade}학년 {t.cls}반 담임</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={()=>setTeachers(prev=>prev.map((x,j)=>j===i?{...x,active:!x.active}:x))} className={`p-1.5 rounded-lg text-[10px] font-semibold transition-colors ${t.active?"bg-red-50 text-red-600 hover:bg-red-100":"bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                    {t.active ? <Lock size={12}/> : <CheckCircle size={12}/>}
                  </button>
                  <button onClick={()=>setPwTarget(t.name)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                    <Key size={12}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-4 bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">권한 정책</p>
            <ul className="space-y-1 text-[11px] text-blue-600">
              <li>• <strong>담임교사</strong>: 자기 반 학생 건강정보 전체 열람</li>
              <li>• <strong>비담임교사</strong>: 전체 통계 열람, 개인정보 제한</li>
              <li>• <strong>비교과교사</strong>: 통계 열람만 허용</li>
            </ul>
          </div>
        </div>
      );

      // Tab 3: 설정 (패스워드 재설정, API)
      if (tab === 3) return (
        <div className="space-y-3 pb-4">
          <div className="mx-4 rounded-2xl p-4 bg-blue-900 text-white">
            <h3 className="font-semibold">시스템 설정</h3>
            <p className="text-white/70 text-xs">NEIS API · 알림 서비스 · 보안</p>
          </div>

          {/* NEIS API 정보 */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} className="text-blue-700"/>
              <p className="text-sm font-semibold text-slate-700">나이스 OPEN API 설정</p>
            </div>
            {[
              { label:"API 키",        value:"2a7478927ad3465aa8631f4c3beb48c6" },
              { label:"교육청 코드",    value:"T10 (충남)" },
              { label:"학교 코드",      value:"9290083 (성의고)" },
              { label:"알림 발송 시간", value:"매일 07:00 자동" },
            ].map((row,i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b last:border-b-0 border-slate-50">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-xs font-medium text-slate-700 font-mono text-right max-w-[60%] break-all">{row.value}</span>
              </div>
            ))}
          </div>

          {/* 알림 서비스 상태 */}
          <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">알림 서비스 현황</p>
            {[
              { label:"서비스 상태",     value:"정상 운영 중",   color:"text-emerald-600" },
              { label:"마지막 발송",     value:"2026.07.18 07:00", color:"text-slate-600" },
              { label:"발송 학생 수",    value:"${STATS.allergy}명", color:"text-blue-600" },
              { label:"파이썬 버전",     value:"Python 3.11",    color:"text-slate-600" },
            ].map((row,i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-b-0 border-slate-50">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className={`text-xs font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* 개발자 링크 */}
          <div className="mx-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-2">개발자 가이드</p>
            {[
              { label:"NEIS API 가이드", url:"https://open.neis.go.kr/portal/guide/apiGuidePage.do" },
              { label:"NEIS 포털",       url:"https://open.neis.go.kr/portal/mainPage.do" },
            ].map((link,i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-slate-600">{link.label}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 underline truncate max-w-[50%]">열기</a>
              </div>
            ))}
          </div>

          <div className="mx-4">
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors active:scale-95">
              <LogOut size={16}/> 로그아웃
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e3a6e 50%,#0f2748 100%)" }}>
      {/* Decorative ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20" style={{ background:"radial-gradient(circle,#00b894,transparent)" }}/>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15" style={{ background:"radial-gradient(circle,#2d5299,transparent)" }}/>
      </div>

      {/* Desktop labels */}
      <div className="hidden md:block absolute top-6 left-6 text-white">
        <p className="font-bold text-lg tracking-tight">성의고등학교</p>
        <p className="text-white/50 text-xs">건강관리 시스템 프로토타입</p>
      </div>

      {/* Phone Frame */}
      <div className="relative w-[390px] flex-shrink-0" style={{ height:"844px" }}>
        {/* Phone shell */}
        <div className="absolute inset-0 rounded-[50px] bg-slate-900 shadow-2xl" style={{ boxShadow:"0 60px 120px rgba(0,0,0,.6), inset 0 0 0 2px rgba(255,255,255,.08)" }}>
          {/* Side buttons */}
          <div className="absolute -left-[3px] top-24 w-1 h-10 bg-slate-700 rounded-l-full"/>
          <div className="absolute -left-[3px] top-40 w-1 h-14 bg-slate-700 rounded-l-full"/>
          <div className="absolute -left-[3px] top-56 w-1 h-14 bg-slate-700 rounded-l-full"/>
          <div className="absolute -right-[3px] top-36 w-1 h-16 bg-slate-700 rounded-r-full"/>
        </div>

        {/* Screen */}
        <div className="absolute inset-[4px] rounded-[47px] overflow-hidden bg-background flex flex-col">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"/>
            <div className="w-1 h-1 rounded-full bg-slate-700"/>
          </div>

          {/* Status bar */}
          <div className="h-12 flex-shrink-0" style={{ background: role ? "linear-gradient(135deg,#1e3a6e,#2d5299)" : "#f0f4f8" }}>
            {role && <StatusBar/>}
          </div>

          {/* LOGIN SCREEN */}
          {!role && !loginRole && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Hero */}
              <div className="px-6 pt-6 pb-8 flex flex-col items-center" style={{ background:"linear-gradient(180deg,#1e3a6e,#2d5299)" }}>
                <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 shadow-lg">
                  <Heart size={40} className="text-white"/>
                </div>
                <h1 className="text-white font-bold text-2xl tracking-tight">성의고등학교</h1>
                <p className="text-white/60 text-sm mt-1">학생 건강관리 시스템</p>
                <div className="mt-3 flex gap-2">
                  <Badge text="NEIS 연동" color="teal"/>
                  <Badge text="알레르기 알림" color="navy"/>
                </div>
              </div>

              <div className="flex-1 px-6 py-6 space-y-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">역할 선택</p>
                {([
                  { role:"student" as Role, label:"학생 로그인",  desc:"건강정보 & BMI 확인", icon:User,     color:"#1e3a6e" },
                  { role:"teacher" as Role, label:"교사 로그인",  desc:"학생 건강관리 대시보드", icon:BookOpen, color:"#00b894" },
                  { role:"admin"   as Role, label:"관리자 로그인", desc:"파일 관리 & 권한 설정",   icon:Shield,   color:"#8b5cf6" },
                ] as const).map(item => (
                  <button key={item.role} onClick={() => setLoginRole(item.role)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98] border border-slate-100">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:item.color+"18" }}>
                      <item.icon size={24} style={{ color:item.color }}/>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 ml-auto"/>
                  </button>
                ))}

                <div className="pt-4 text-center">
                  <p className="text-[10px] text-slate-400">나이스 교육정보 개방 포털 연동</p>
                  <p className="text-[10px] text-slate-400">성의고등학교 · 충남 T10 · 9290083</p>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {!role && loginRole && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="px-6 pt-4 pb-6" style={{ background:"linear-gradient(180deg,#1e3a6e,#2d5299)" }}>
                <button onClick={()=>setLoginRole(null)} className="flex items-center gap-1 text-white/70 text-sm mb-4">
                  <ArrowLeft size={16}/> 뒤로
                </button>
                <h2 className="text-white font-bold text-xl">{loginRole==="student"?"학생":loginRole==="teacher"?"교사":"관리자"} 로그인</h2>
                <p className="text-white/60 text-xs mt-1">성의고등학교 건강관리 시스템</p>
              </div>

              <div className="flex-1 px-6 py-6 bg-slate-50 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">아이디</label>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <User size={16} className="text-slate-400"/>
                    <input className="flex-1 text-sm outline-none bg-transparent text-slate-700" defaultValue={loginRole==="student"?DEMO.student.id:loginRole==="teacher"?"T001":"admin"} readOnly/>
                    <span className="text-[10px] text-emerald-500 font-bold">데모</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">비밀번호</label>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Lock size={16} className="text-slate-400"/>
                    <input type={showLoginPw?"text":"password"} value={loginPw} onChange={e=>setLoginPw(e.target.value)} placeholder="비밀번호 입력" className="flex-1 text-sm outline-none bg-transparent text-slate-700"/>
                    <button onClick={()=>setShowLoginPw(p=>!p)}>{showLoginPw?<EyeOff size={16} className="text-slate-400"/>:<Eye size={16} className="text-slate-400"/>}</button>
                  </div>
                </div>

                {loginRole === "teacher" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">교사 유형</label>
                    <div className="flex gap-2">
                      {(["담임","비담임","비교과"] as TeacherType[]).map(t=>(
                        <button key={t} onClick={()=>setTeacherType(t)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${teacherType===t?"bg-blue-900 text-white":"bg-white border border-slate-200 text-slate-600"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={()=>doLogin(loginRole)} className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95 shadow-lg" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
                  로그인
                </button>
                <p className="text-center text-[10px] text-slate-400">데모 모드: 아이디 입력 없이 로그인</p>
              </div>
            </div>
          )}

          {/* DASHBOARD */}
          {role && (
            <>
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
                <div className="flex items-center gap-2">
                  <Heart size={18} className="text-emerald-400"/>
                  <span className="text-white font-bold text-sm">성의고 건강관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={pullRefresh} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <RefreshCw size={13} className={`text-white ${refreshing?"animate-spin":""}`}/>
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors relative">
                    <Bell size={13} className="text-white"/>
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400"/>
                  </button>
                  <button onClick={logout} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <LogOut size={13} className="text-white"/>
                  </button>
                </div>
              </div>

              {/* Pull refresh indicator */}
              {refreshing && (
                <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 bg-emerald-50">
                  <RefreshCw size={13} className="text-emerald-600 animate-spin"/>
                  <span className="text-xs text-emerald-600 font-medium">새로고침 중...</span>
                </div>
              )}

              {/* Scrollable content with swipe */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto py-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                {renderContent()}
              </div>

              {/* Bottom Navigation */}
              <div className="flex-shrink-0 bg-white border-t border-slate-100 pb-safe-area" style={{ paddingBottom:"env(safe-area-inset-bottom)" }}>
                <div className="flex items-stretch">
                  {tabConfig.map((t,i) => (
                    <button key={i} onClick={()=>setTab(i)} className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab===i?"text-blue-900":"text-slate-400 hover:text-slate-600"}`}>
                      <t.icon size={20} strokeWidth={tab===i?2.5:1.8}/>
                      <span className={`text-[10px] font-semibold ${tab===i?"text-blue-900":""}`}>{t.label}</span>
                      {tab===i && <div className="w-4 h-0.5 rounded-full bg-blue-900"/>}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAB (student & teacher only) */}
              {(role === "student" || role === "teacher") && tab !== 3 && (
                <button onClick={()=>setShowFAB(true)} className="absolute bottom-24 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-40 transition-all active:scale-90" style={{ background:"linear-gradient(135deg,#00b894,#00a381)" }}>
                  <Plus size={22} className="text-white"/>
                </button>
              )}
            </>
          )}

          {/* FAB Modal: 새 글 쓰기 (건강 일지) */}
          {showFAB && (
            <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end rounded-[47px] overflow-hidden">
              <div className="bg-white rounded-t-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800">건강 일지 작성</h3>
                  <button onClick={()=>{ setShowFAB(false); setJournalSaved(false); setJournalText(""); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100">
                    <X size={14} className="text-slate-600"/>
                  </button>
                </div>
                {journalSaved ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle size={32} className="text-emerald-500"/>
                    <p className="font-semibold text-slate-700">저장되었습니다!</p>
                    <button onClick={()=>{ setShowFAB(false); setJournalSaved(false); setJournalText(""); }} className="mt-2 text-sm text-blue-600 font-medium">닫기</button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">오늘 기분</p>
                    <div className="flex gap-3 mb-4">
                      {["😊","😐","😟","🤒","😴"].map(m=>(
                        <button key={m} onClick={()=>setJournalMood(m)} className={`text-2xl p-1.5 rounded-xl transition-all ${journalMood===m?"bg-blue-50 ring-2 ring-blue-300":"hover:bg-slate-50"}`}>{m}</button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">오늘 건강 메모</p>
                    <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="오늘 몸 상태를 기록해보세요..." className="w-full h-24 border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 placeholder-slate-300"/>
                    <button onClick={()=>setJournalSaved(true)} className="w-full mt-3 py-3 rounded-xl font-bold text-white text-sm active:scale-95 transition-all" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
                      저장
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Python Code Modal */}
          {showPython && (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col rounded-[47px] overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-14 pb-3 border-b border-slate-700">
                <button onClick={()=>setShowPython(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800">
                  <ArrowLeft size={16} className="text-white"/>
                </button>
                <div>
                  <p className="text-white font-semibold text-sm">allergy_notification.py</p>
                  <p className="text-slate-400 text-xs">알레르기 알림 서비스</p>
                </div>
                <button onClick={()=>dlText(PYTHON_CODE,"allergy_notification.py")} className="ml-auto flex items-center gap-1 bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg">
                  <Download size={12}/> 저장
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-[10px] text-green-300 font-mono leading-relaxed whitespace-pre-wrap">{PYTHON_CODE}</pre>
              </div>
            </div>
          )}

          {/* .env Modal */}
          {showEnv && (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col rounded-[47px] overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-14 pb-3 border-b border-slate-700">
                <button onClick={()=>setShowEnv(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800">
                  <ArrowLeft size={16} className="text-white"/>
                </button>
                <div>
                  <p className="text-white font-semibold text-sm">.env</p>
                  <p className="text-slate-400 text-xs">환경변수 템플릿</p>
                </div>
                <button onClick={()=>dlText(ENV_CONTENT,".env")} className="ml-auto flex items-center gap-1 bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg">
                  <Download size={12}/> 저장
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-[10px] text-amber-300 font-mono leading-relaxed whitespace-pre-wrap">{ENV_CONTENT}</pre>
              </div>
            </div>
          )}

          {/* Password Reset Modal */}
          {pwTarget && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center rounded-[47px] overflow-hidden p-8">
              <div className="bg-white rounded-2xl p-5 w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">패스워드 재설정</h3>
                  <button onClick={()=>{ setPwTarget(null); setNewPw(""); }} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100">
                    <X size={12} className="text-slate-500"/>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3"><strong className="text-slate-700">{pwTarget}</strong> 교사의 비밀번호를 재설정합니다.</p>
                <div className="relative">
                  <input type={showPw?"text":"password"} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 pr-10"/>
                  <button onClick={()=>setShowPw(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPw?<EyeOff size={15} className="text-slate-400"/>:<Eye size={15} className="text-slate-400"/>}
                  </button>
                </div>
                <button onClick={()=>{ setPwTarget(null); setNewPw(""); setShowPw(false); }} className="w-full mt-3 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background:"linear-gradient(135deg,#1e3a6e,#2d5299)" }}>
                  재설정
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop sidebar info */}
      <div className="hidden md:flex flex-col gap-4 ml-10 max-w-[220px]">
        <div className="text-white/80">
          <p className="font-semibold text-sm mb-2">📱 제스처 가이드</p>
          <ul className="text-xs space-y-1 text-white/60">
            <li>← → 스와이프: 탭 전환</li>
            <li>↑ 풀다운: 새로고침</li>
            <li>+ FAB: 건강 일지 작성</li>
            <li>하단 탭 네비게이션</li>
            <li>로그아웃: 이전 화면</li>
          </ul>
        </div>
        <div className="text-white/80">
          <p className="font-semibold text-sm mb-2">📊 데이터 현황</p>
          <ul className="text-xs space-y-1 text-white/60">
            <li>학생: 500명</li>
            <li>알레르기: {STATS.allergy}명</li>
            <li>질병 등록: {STATS.disease}명</li>
            <li>NEIS API 연동</li>
          </ul>
        </div>
        <div className="text-white/80">
          <p className="font-semibold text-sm mb-2">📥 다운로드</p>
          <ul className="text-xs space-y-1.5 text-white/60">
            <li><button onClick={()=>dlCSV(csvStudents(),"students.csv")} className="hover:text-white transition-colors">students.csv</button></li>
            <li><button onClick={()=>dlCSV(csvBMI(),"bmi.csv")} className="hover:text-white transition-colors">bmi.csv</button></li>
            <li><button onClick={()=>dlCSV(csvAllergyCode(),"allergycode.csv")} className="hover:text-white transition-colors">allergycode.csv</button></li>
            <li><button onClick={()=>dlCSV(csvAllergyStud(),"allergystudents.csv")} className="hover:text-white transition-colors">allergystudents.csv</button></li>
            <li><button onClick={()=>dlText(PYTHON_CODE,"allergy_notification.py")} className="hover:text-white transition-colors">allergy_notification.py</button></li>
            <li><button onClick={()=>dlText(ENV_CONTENT,".env")} className="hover:text-white transition-colors">.env 템플릿</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
