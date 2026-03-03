import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("school_conduct.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    role TEXT, -- 'BGH', 'GVCN', 'GVBM', 'GIAM_THI', 'PHU_HUYNH', 'HOC_SINH'
    class_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    grade INTEGER
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    class_id INTEGER,
    parent_id INTEGER,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS rule_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT -- 'Học tập', 'Đồng phục', 'Kỷ luật', 'Chuyên cần'
  );

  CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    code TEXT,
    description TEXT,
    points INTEGER, -- positive for merits, negative for violations
    severity TEXT, -- 'Nhẹ', 'Trung bình', 'Nặng', 'Khen thưởng'
    FOREIGN KEY(category_id) REFERENCES rule_categories(id)
  );

  CREATE TABLE IF NOT EXISTS conduct_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    rule_id INTEGER,
    recorder_id INTEGER,
    note TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(rule_id) REFERENCES rules(id),
    FOREIGN KEY(recorder_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  // Classes
  const classes = [
    { name: "10A1", grade: 10 },
    { name: "10A2", grade: 10 },
    { name: "11B1", grade: 11 },
    { name: "11B2", grade: 11 },
    { name: "12C1", grade: 12 },
    { name: "12C2", grade: 12 }
  ];
  const insertClass = db.prepare("INSERT INTO classes (name, grade) VALUES (?, ?)");
  classes.forEach(c => insertClass.run(c.name, c.grade));

  // Users
  db.prepare("INSERT INTO users (username, full_name, role) VALUES (?, ?, ?)").run("admin", "Ban Giám Hiệu", "BGH");
  db.prepare("INSERT INTO users (username, full_name, role, class_id) VALUES (?, ?, ?, ?)").run("gvcn1", "Nguyễn Văn An", "GVCN", 1);
  db.prepare("INSERT INTO users (username, full_name, role, class_id) VALUES (?, ?, ?, ?)").run("gvcn2", "Trần Thị Bình", "GVCN", 2);
  db.prepare("INSERT INTO users (username, full_name, role) VALUES (?, ?, ?)").run("giamthi1", "Lê Quang Vinh", "GIAM_THI");

  // Students
  const students = [
    { name: "Nguyễn Văn Nam", class_id: 1 },
    { name: "Trần Thị Hoa", class_id: 1 },
    { name: "Lê Văn Hùng", class_id: 1 },
    { name: "Phạm Minh Tuấn", class_id: 1 },
    { name: "Hoàng Thị Lan", class_id: 2 },
    { name: "Đặng Văn Khoa", class_id: 2 },
    { name: "Vũ Thị Mai", class_id: 2 },
    { name: "Bùi Văn Dũng", class_id: 3 },
    { name: "Ngô Thị Tuyết", class_id: 3 },
    { name: "Lý Văn Thắng", class_id: 4 },
    { name: "Đỗ Thị Diệp", class_id: 4 },
    { name: "Trịnh Văn Long", class_id: 5 },
    { name: "Phan Thị Ngọc", class_id: 5 },
    { name: "Đoàn Văn Sơn", class_id: 6 },
    { name: "Mai Thị Cúc", class_id: 6 }
  ];
  const insertStudent = db.prepare("INSERT INTO students (full_name, class_id) VALUES (?, ?)");
  students.forEach(s => insertStudent.run(s.name, s.class_id));

  // Rule Categories
  const categories = ["Chuyên cần", "Đồng phục", "Học tập", "Kỷ luật", "Ngoại khóa"];
  const insertCat = db.prepare("INSERT INTO rule_categories (name) VALUES (?)");
  categories.forEach(c => insertCat.run(c));

  // Rules
  const rules = [
    { cat: 1, code: "CC01", desc: "Đi học muộn", pts: -5, sev: "Nhẹ" },
    { cat: 1, code: "CC02", desc: "Nghỉ học không phép", pts: -10, sev: "Trung bình" },
    { cat: 1, code: "CC03", desc: "Trốn tiết", pts: -15, sev: "Nặng" },
    { cat: 2, code: "DP01", desc: "Sai đồng phục", pts: -3, sev: "Nhẹ" },
    { cat: 2, code: "DP02", desc: "Không đeo thẻ học sinh", pts: -2, sev: "Nhẹ" },
    { cat: 2, code: "DP03", desc: "Nhuộm tóc/Sơn móng tay", pts: -5, sev: "Nhẹ" },
    { cat: 3, code: "HT01", desc: "Phát biểu xây dựng bài", pts: 2, sev: "Khen thưởng" },
    { cat: 3, code: "HT02", desc: "Đạt điểm cao trong kỳ thi", pts: 10, sev: "Khen thưởng" },
    { cat: 3, code: "HT03", desc: "Không làm bài tập", pts: -5, sev: "Nhẹ" },
    { cat: 3, code: "HT04", desc: "Quay cóp trong giờ kiểm tra", pts: -20, sev: "Nặng" },
    { cat: 4, code: "KL01", desc: "Gây mất trật tự", pts: -5, sev: "Nhẹ" },
    { cat: 4, code: "KL02", desc: "Sử dụng điện thoại trong giờ", pts: -5, sev: "Trung bình" },
    { cat: 4, code: "KL03", desc: "Vô lễ với giáo viên", pts: -30, sev: "Nặng" },
    { cat: 5, code: "NK01", desc: "Tham gia tích cực phong trào", pts: 5, sev: "Khen thưởng" },
    { cat: 5, code: "NK02", desc: "Đạt giải thi đấu thể thao", pts: 15, sev: "Khen thưởng" }
  ];
  const insertRule = db.prepare("INSERT INTO rules (category_id, code, description, points, severity) VALUES (?, ?, ?, ?, ?)");
  rules.forEach(r => insertRule.run(r.cat, r.code, r.desc, r.pts, r.sev));

  // Conduct Records (Seed some history)
  const insertRecord = db.prepare("INSERT INTO conduct_records (student_id, rule_id, recorder_id, note, created_at) VALUES (?, ?, ?, ?, ?)");
  
  // Generate some random records for the last 30 days
  const now = new Date();
  for (let i = 0; i < 100; i++) {
    const studentId = Math.floor(Math.random() * students.length) + 1;
    const ruleId = Math.floor(Math.random() * rules.length) + 1;
    const recorderId = Math.floor(Math.random() * 3) + 1; // admin, gvcn1, gvcn2, giamthi1
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    insertRecord.run(studentId, ruleId, recorderId, `Ghi nhận tự động ngày ${daysAgo} trước`, date);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/classes", (req, res) => {
    const classes = db.prepare("SELECT * FROM classes").all();
    res.json(classes);
  });

  app.get("/api/students", (req, res) => {
    const { classId } = req.query;
    let query = "SELECT s.*, c.name as class_name FROM students s JOIN classes c ON s.class_id = c.id";
    const params = [];
    if (classId) {
      query += " WHERE s.class_id = ?";
      params.push(classId);
    }
    const students = db.prepare(query).all(...params);
    res.json(students);
  });

  app.get("/api/rule-categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM rule_categories").all();
    res.json(categories);
  });

  app.post("/api/rule-categories", (req, res) => {
    const { name } = req.body;
    const result = db.prepare("INSERT INTO rule_categories (name) VALUES (?)").run(name);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.put("/api/rule-categories/:id", (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    db.prepare("UPDATE rule_categories SET name = ? WHERE id = ?").run(name, id);
    res.json({ success: true });
  });

  app.delete("/api/rule-categories/:id", (req, res) => {
    const { id } = req.params;
    const count = db.prepare("SELECT COUNT(*) as count FROM rules WHERE category_id = ?").get(id) as { count: number };
    if (count.count > 0) {
      return res.status(400).json({ error: "Không thể xóa danh mục đang có nội quy" });
    }
    db.prepare("DELETE FROM rule_categories WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/rules", (req, res) => {
    const rules = db.prepare(`
      SELECT r.*, rc.name as category_name 
      FROM rules r 
      JOIN rule_categories rc ON r.category_id = rc.id
    `).all();
    res.json(rules);
  });

  app.post("/api/rules", (req, res) => {
    const { category_id, code, description, points, severity } = req.body;
    const result = db.prepare(`
      INSERT INTO rules (category_id, code, description, points, severity)
      VALUES (?, ?, ?, ?, ?)
    `).run(category_id, code, description, points, severity);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.put("/api/rules/:id", (req, res) => {
    const { id } = req.params;
    const { category_id, code, description, points, severity } = req.body;
    db.prepare(`
      UPDATE rules 
      SET category_id = ?, code = ?, description = ?, points = ?, severity = ? 
      WHERE id = ?
    `).run(category_id, code, description, points, severity, id);
    res.json({ success: true });
  });

  app.delete("/api/rules/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM rules WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const student = db.prepare(`
      SELECT s.*, c.name as class_name 
      FROM students s 
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `).get(id);
    res.json(student);
  });

  app.get("/api/notifications", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20").all();
    res.json(notifications);
  });

  app.post("/api/conduct", (req, res) => {
    const { studentId, ruleId, recorderId, note } = req.body;
    const result = db.prepare(`
      INSERT INTO conduct_records (student_id, rule_id, recorder_id, note)
      VALUES (?, ?, ?, ?)
    `).run(studentId, ruleId, recorderId, note);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.put("/api/conduct/:id", (req, res) => {
    const { id } = req.params;
    const { studentId, ruleId, note } = req.body;
    db.prepare(`
      UPDATE conduct_records 
      SET student_id = ?, rule_id = ?, note = ? 
      WHERE id = ?
    `).run(studentId, ruleId, note, id);
    res.json({ success: true });
  });

  app.delete("/api/conduct/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM conduct_records WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/conduct/history", (req, res) => {
    const { studentId, classId } = req.query;
    let query = `
      SELECT cr.*, s.full_name as student_name, r.code as rule_code, r.description as rule_description, r.points, r.severity, rc.name as category_name, u.full_name as recorder_name
      FROM conduct_records cr
      JOIN students s ON cr.student_id = s.id
      JOIN rules r ON cr.rule_id = r.id
      JOIN rule_categories rc ON r.category_id = rc.id
      JOIN users u ON cr.recorder_id = u.id
    `;
    const params = [];
    if (studentId) {
      query += " WHERE cr.student_id = ?";
      params.push(studentId);
    } else if (classId) {
      query += " WHERE s.class_id = ?";
      params.push(classId);
    }
    query += " ORDER BY cr.created_at DESC";
    const history = db.prepare(query).all(...params);
    res.json(history);
  });

  app.get("/api/stats/violations", (req, res) => {
    const stats = db.prepare(`
      SELECT r.description, COUNT(*) as count
      FROM conduct_records cr
      JOIN rules r ON cr.rule_id = r.id
      WHERE r.points < 0
      GROUP BY r.id
      ORDER BY count DESC
      LIMIT 5
    `).all();
    res.json(stats);
  });

  app.get("/api/stats/points-by-category", (req, res) => {
    const { studentId } = req.query;
    let query = `
      SELECT rc.name, SUM(r.points) as total_points
      FROM conduct_records cr
      JOIN rules r ON cr.rule_id = r.id
      JOIN rule_categories rc ON r.category_id = rc.id
    `;
    const params = [];
    if (studentId) {
      query += " WHERE cr.student_id = ?";
      params.push(studentId);
    }
    query += " GROUP BY rc.id";
    const stats = db.prepare(query).all(...params);
    res.json(stats);
  });

  app.get("/api/stats/summary", (req, res) => {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get() as any;
    const totalClasses = db.prepare("SELECT COUNT(*) as count FROM classes").get() as any;
    const totalViolations = db.prepare(`
      SELECT COUNT(*) as count 
      FROM conduct_records cr 
      JOIN rules r ON cr.rule_id = r.id 
      WHERE r.points < 0
    `).get() as any;
    const totalMerits = db.prepare(`
      SELECT COUNT(*) as count 
      FROM conduct_records cr 
      JOIN rules r ON cr.rule_id = r.id 
      WHERE r.points > 0
    `).get() as any;
    
    res.json({
      students: totalStudents.count,
      classes: totalClasses.count,
      violations: totalViolations.count,
      merits: totalMerits.count
    });
  });

  app.get("/api/stats/points-by-class", (req, res) => {
    const stats = db.prepare(`
      SELECT c.name, SUM(r.points) as total_points
      FROM conduct_records cr
      JOIN students s ON cr.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN rules r ON cr.rule_id = r.id
      GROUP BY c.id
    `).all();
    res.json(stats);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
