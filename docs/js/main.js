const SUPABASE_URL  = "https://ktqkjvdzqxdkicvmlzni.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0cWtqdmR6cXhka2ljdm1sem5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTgyMjEsImV4cCI6MjA5NTk5NDIyMX0.ECPVWXqmP337qmlJg3mHO2ViXrSPi1jvaiN1IZirWYk";
const EDGE_ATTENDANCE = `${SUPABASE_URL}/functions/v1/attendance`;

let members = [];
let selectedMember = null;

/* ===== 멤버 목록 로드 ===== */
async function loadMembers() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vibe_coding_class_info?select=id,seqno,dept,name,title,email,classyn,meetingdate&order=seqno`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!res.ok) throw new Error("서버 응답 오류");
    members = await res.json();
    renderGrid();
    renderStats();
  } catch (e) {
    document.getElementById("loading").textContent =
      "데이터를 불러오는 중 오류가 발생했습니다. 서버를 확인해 주세요.";
  }
}

/* ===== 통계 바 ===== */
function renderStats() {
  const total = members.length;
  const attend1 = members.filter((m) => m.classyn === "Y" && m.meetingdate === "2026-06-09").length;
  const attend2 = members.filter((m) => m.classyn === "Y" && m.meetingdate === "2026-06-10").length;
  const unconfirmed = members.filter((m) => m.classyn !== "Y" && m.classyn !== "N").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-attend1").textContent = attend1;
  document.getElementById("stat-attend2").textContent = attend2;
  document.getElementById("stat-absent").textContent = unconfirmed;
}

const TITLE_ORDER = { "팀장": 0, "수석": 1, "수석보": 2, "책임": 3, "선임": 4, "사원": 5 };
const SORT_DEPTS  = new Set(["자동화1팀", "자동화2팀"]);

/* ===== 카드 그리드 렌더링 (DEPT별 섹션) ===== */
function renderGrid() {
  const grid = document.getElementById("member-grid");
  const loading = document.getElementById("loading");
  loading.style.display = "none";
  grid.innerHTML = "";

  const depts = [];
  const deptMap = {};
  members.forEach((m) => {
    if (!deptMap[m.dept]) {
      deptMap[m.dept] = [];
      depts.push(m.dept);
    }
    deptMap[m.dept].push(m);
  });

  // 자동화1/2팀 직함 순 정렬 (팀장→수석→수석보→책임→선임→사원)
  depts.forEach((dept) => {
    if (SORT_DEPTS.has(dept)) {
      deptMap[dept].sort((a, b) => (TITLE_ORDER[a.title] ?? 99) - (TITLE_ORDER[b.title] ?? 99));
    }
  });

  // 기타 부서는 항상 마지막
  depts.sort((a, b) => {
    if (a === "기타") return 1;
    if (b === "기타") return -1;
    return 0;
  });

  depts.forEach((dept) => {
    const section = document.createElement("div");
    section.className = "dept-section";

    const header = document.createElement("div");
    header.className = "dept-header";
    header.textContent = dept;
    section.appendChild(header);

    const cards = document.createElement("div");
    cards.className = "dept-cards";

    deptMap[dept].forEach((m) => {
      const card = document.createElement("div");

      if (m.dept === "기타") {
        const guestDateClass = m.meetingdate === "2026-06-09" ? "date-1" : m.meetingdate === "2026-06-10" ? "date-2" : "";
        const guestDateLabel = m.meetingdate
          ? ` | 참석일: ${m.meetingdate.slice(5).replace('-', '.')}`
          : '';
        card.className = "member-card attend guest";
        card.innerHTML = `
          <span class="card-badge badge-y">참석</span>
          <div class="card-seqno"></div>
          <div class="card-name">${escHtml(m.name)}<span class="card-meetingdate ${guestDateClass}">${guestDateLabel}</span></div>
          <div class="card-title"></div>
          <button class="card-delete-btn" onclick="event.stopPropagation();deleteGuestMember(${m.id})">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
            삭제
          </button>
        `;
      } else {
        const badgeClass =
          m.classyn === "Y" ? "badge-y" : m.classyn === "N" ? "badge-n" : "badge-pending";
        const badgeText = m.classyn === "Y" ? "참석" : m.classyn === "N" ? "불참" : "미정";
        const cardClass = m.classyn === "Y" ? "attend" : m.classyn === "N" ? "absent" : "";

        const dateClass = m.meetingdate === "2026-06-09" ? "date-1" : m.meetingdate === "2026-06-10" ? "date-2" : "";
        const dateLabel = m.meetingdate
          ? ` | 참석일: ${m.meetingdate.slice(5).replace('-', '.')}`
          : '';
        const crownHtml = m.title === "팀장"
          ? `<span class="crown-icon"><svg width="11" height="11" viewBox="0 0 24 20" fill="#FFD700"><polygon points="0,20 4,8 12,14 20,2 22,14 28,8 24,20"/><rect x="0" y="17" width="24" height="3" fill="#FFD700"/></svg></span>`
          : "";
        card.className = `member-card ${cardClass}`;
        card.innerHTML = `
          <span class="card-badge ${badgeClass}">${badgeText}</span>
          <div class="card-seqno">${escHtml(m.seqno || "")}</div>
          <div class="card-name">${escHtml(m.name)}${crownHtml}<span class="card-meetingdate ${dateClass}">${dateLabel}</span></div>
          <div class="card-title">${escHtml(m.title || "")}</div>
        `;
        card.addEventListener("click", () => openPopup(m));
      }

      cards.appendChild(card);
    });

    section.appendChild(cards);
    grid.appendChild(section);
  });
}

/* ===== HTML 이스케이프 ===== */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ===== Edge Function 호출 헬퍼 ===== */
async function callEdge(payload) {
  const res = await fetch(EDGE_ATTENDANCE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/* ===== 기타 멤버 추가 ===== */
async function addGuestMember() {
  const name  = document.getElementById("guest-name").value.trim();
  const email = document.getElementById("guest-email").value.trim();

  if (!name)  { showToast("이름을 입력해 주세요.", "error");  return; }
  if (!email) { showToast("이메일을 입력해 주세요.", "error"); return; }

  const existing = members.find(
    (m) => m.dept !== "기타" && m.email && m.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    document.getElementById("guest-name").value  = "";
    document.getElementById("guest-email").value = "";
    showToast("대상자는 아래 이름을 확인하시고 클릭 후 팝업창에 입력해 주시기 바랍니다.", "warn");
    return;
  }

  try {
    const data = await callEdge({ action: "add", name, email });
    if (data.success) {
      document.getElementById("guest-name").value  = "";
      document.getElementById("guest-email").value = "";
      showToast(data.message, "success");
      await loadMembers();
    } else {
      showToast(data.message || "추가에 실패했습니다.", "error");
    }
  } catch (e) {
    showToast("서버 연결 오류가 발생했습니다.", "error");
  }
}

/* ===== 기타 멤버 삭제 ===== */
async function deleteGuestMember(id) {
  try {
    const data = await callEdge({ action: "delete", id });
    if (data.success) {
      showToast("삭제되었습니다.", "success");
      await loadMembers();
    } else {
      showToast(data.message || "삭제에 실패했습니다.", "error");
    }
  } catch (e) {
    showToast("서버 연결 오류가 발생했습니다.", "error");
  }
}

/* ===== 팝업 열기 ===== */
function openPopup(member) {
  selectedMember = member;
  document.getElementById("popup-name").textContent = member.name;
  document.getElementById("popup-dept").textContent =
    [member.dept, member.title].filter(Boolean).join(" · ");

  const emailInput = document.getElementById("input-email");
  const storedEmail = localStorage.getItem(`vibeauth_${member.id}`);
  const isExempt = member.name === "문성수";

  if (storedEmail && !isExempt) {
    emailInput.value = storedEmail;
    emailInput.disabled = true;
    emailInput.style.background = "#f0f4f8";
    emailInput.style.color = "#a0aec0";
  } else {
    emailInput.value = "";
    emailInput.disabled = false;
    emailInput.style.background = "";
    emailInput.style.color = "";
  }

  document.getElementById("select-classyn").value = "Y";
  document.getElementById("popup-overlay").classList.add("active");
  if (!emailInput.disabled) emailInput.focus();
}

/* ===== 팝업 닫기 ===== */
function closePopup() {
  document.getElementById("popup-overlay").classList.remove("active");
  const emailInput = document.getElementById("input-email");
  emailInput.disabled = false;
  emailInput.style.background = "";
  emailInput.style.color = "";
  selectedMember = null;
}

/* ===== 참석 등록 ===== */
async function confirmAttendance() {
  if (!selectedMember) return;

  const email  = document.getElementById("input-email").value.trim();
  const classyn = document.getElementById("select-classyn").value;

  if (!email) {
    showToast("이메일 주소를 입력해 주세요.", "error");
    return;
  }

  try {
    const data = await callEdge({ id: selectedMember.id, email, classyn });
    if (data.success) {
      if (selectedMember.dept !== "기타") {
        localStorage.setItem(`vibeauth_${selectedMember.id}`, email);
      }
      showToast(data.message, "success");
      closePopup();
      await loadMembers();
    } else {
      showToast(data.message, "error");
    }
  } catch (e) {
    showToast("서버 연결 오류가 발생했습니다.", "error");
  }
}

/* ===== 토스트 메시지 ===== */
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = type;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

/* ===== 이메일 @ 자동완성 ===== */
function attachAtComplete(id) {
  document.getElementById(id).addEventListener("keydown", function (e) {
    if (e.key === "@") {
      e.preventDefault();
      const prefix = this.value.split("@")[0];
      this.value = prefix + "@micube.co.kr";
      this.setSelectionRange(this.value.length, this.value.length);
    }
  });
}
attachAtComplete("input-email");
attachAtComplete("guest-email");

/* ===== 오버레이 클릭 닫기 ===== */
document.getElementById("popup-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("popup-overlay")) closePopup();
});

/* ===== ESC 키 닫기 ===== */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopup();
});

/* ===== 초기 로드 ===== */
loadMembers();
