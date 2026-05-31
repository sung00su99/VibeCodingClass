const API_BASE = "http://localhost:5000/api";

let members = [];
let selectedMember = null;

/* ===== 멤버 목록 로드 ===== */
async function loadMembers() {
  try {
    const res = await fetch(`${API_BASE}/members`);
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
  const attend = members.filter((m) => m.CLASSYN === "Y").length;
  const absent = members.filter((m) => m.CLASSYN === "N" && m.CLASSYN !== "").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-attend").textContent = attend;
  document.getElementById("stat-absent").textContent = total - attend;
}

/* ===== 카드 그리드 렌더링 (DEPT별 섹션) ===== */
function renderGrid() {
  const grid = document.getElementById("member-grid");
  const loading = document.getElementById("loading");
  loading.style.display = "none";
  grid.innerHTML = "";

  // DEPT 순서 유지하며 그룹핑
  const depts = [];
  const deptMap = {};
  members.forEach((m) => {
    if (!deptMap[m.DEPT]) {
      deptMap[m.DEPT] = [];
      depts.push(m.DEPT);
    }
    deptMap[m.DEPT].push(m);
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
      const badgeClass =
        m.CLASSYN === "Y" ? "badge-y" : m.CLASSYN === "N" ? "badge-n" : "badge-pending";
      const badgeText = m.CLASSYN === "Y" ? "참석" : m.CLASSYN === "N" ? "불참" : "미정";
      const cardClass = m.CLASSYN === "Y" ? "attend" : m.CLASSYN === "N" ? "absent" : "";

      card.className = `member-card ${cardClass}`;
      card.innerHTML = `
        <span class="card-badge ${badgeClass}">${badgeText}</span>
        <div class="card-seqno">${escHtml(m.SEQNO || "")}</div>
        <div class="card-name">${escHtml(m.NAME)}</div>
        <div class="card-title">${escHtml(m.TITLE || "")}</div>
      `;
      card.addEventListener("click", () => openPopup(m));
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

/* ===== 팝업 열기 ===== */
function openPopup(member) {
  selectedMember = member;
  document.getElementById("popup-name").textContent = member.NAME;
  document.getElementById("popup-dept").textContent =
    [member.DEPT, member.TITLE].filter(Boolean).join(" · ");

  document.getElementById("input-email").value = "";
  document.getElementById("select-classyn").value = "Y";
  document.getElementById("popup-overlay").classList.add("active");
  document.getElementById("input-email").focus();
}

/* ===== 팝업 닫기 ===== */
function closePopup() {
  document.getElementById("popup-overlay").classList.remove("active");
  selectedMember = null;
}

/* ===== 확인 버튼 ===== */
async function confirmAttendance() {
  if (!selectedMember) return;

  const email = document.getElementById("input-email").value.trim();
  const classyn = document.getElementById("select-classyn").value;

  if (!email) {
    showToast("이메일 주소를 입력해 주세요.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedMember.ID, email, classyn }),
    });

    const data = await res.json();

    if (data.success) {
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
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

/* ===== 이메일 @ 자동완성 ===== */
document.getElementById("input-email").addEventListener("keydown", function (e) {
  if (e.key === "@") {
    e.preventDefault();
    const prefix = this.value.split("@")[0];
    this.value = prefix + "@micube.co.kr";
    this.setSelectionRange(this.value.length, this.value.length);
  }
});

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
