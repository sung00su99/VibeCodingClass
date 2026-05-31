from flask import Flask, jsonify, request
from flask_cors import CORS
from database import get_connection, init_db

app = Flask(__name__)
CORS(app)

init_db()


@app.route("/api/members", methods=["GET"])
def get_members():
    conn = get_connection()
    rows = conn.execute(
        "SELECT ID, SEQNO, DEPT, NAME, TITLE, PHONE, EMAIL, CLASSYN, REMARKS "
        "FROM Vibe_Coding_Class_Info ORDER BY SEQNO"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/attendance", methods=["POST"])
def update_attendance():
    data = request.get_json()
    member_id = data.get("id")
    input_email = (data.get("email") or "").strip().lower()
    classyn = data.get("classyn", "N")

    if classyn not in ("Y", "N"):
        return jsonify({"success": False, "message": "참석 유무 값이 올바르지 않습니다."}), 400

    conn = get_connection()
    row = conn.execute(
        "SELECT EMAIL FROM Vibe_Coding_Class_Info WHERE ID = ?", (member_id,)
    ).fetchone()

    if row is None:
        conn.close()
        return jsonify({"success": False, "message": "사용자를 찾을 수 없습니다."}), 404

    db_email = (row["EMAIL"] or "").strip().lower()

    if input_email != db_email:
        conn.close()
        return jsonify({"success": False, "message": "사용자 인증에 실패 했습니다."}), 401

    conn.execute(
        "UPDATE Vibe_Coding_Class_Info SET CLASSYN = ? WHERE ID = ?",
        (classyn, member_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "참석 정보가 저장되었습니다."})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
