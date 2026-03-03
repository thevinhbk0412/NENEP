import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  UserCircle, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  Search,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { cn } from './lib/utils';
import { User, Class, Student, Rule, ConductRecord } from './types';

// Mock current user for demo
const CURRENT_USER: User = {
  id: 2,
  username: 'gvcn1',
  full_name: 'Nguyễn Văn A',
  role: 'GVCN',
  class_id: 1
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'student-detail' | 'record' | 'conduct' | 'stats' | 'settings'>('dashboard');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [history, setHistory] = useState<ConductRecord[]>([]);
  const [statsViolations, setStatsViolations] = useState<any[]>([]);
  const [statsPoints, setStatsPoints] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({ students: 0, classes: 0, violations: 0, merits: 0 });
  const [studentCategoryStats, setStudentCategoryStats] = useState<any[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'Nhẹ' | 'Trung bình' | 'Nghiêm trọng'>('all');

  // Filtered data logic
  const filteredHistory = history.filter(h => {
    const date = new Date(h.created_at);
    const matchesDateStart = filterDateStart ? date >= new Date(filterDateStart) : true;
    const matchesDateEnd = filterDateEnd ? date <= new Date(filterDateEnd) : true;
    const student = students.find(s => s.id === h.student_id);
    const matchesClass = filterClass ? student?.class_id === filterClass : true;
    const matchesCategory = filterCategory ? h.rule_id && rules.find(r => r.id === h.rule_id)?.category_id === filterCategory : true;
    return matchesDateStart && matchesDateEnd && matchesClass && matchesCategory;
  });

  const filteredStatsPoints = classes
    .filter(c => !filterClass || c.id === filterClass)
    .map(c => {
      const classStudents = students.filter(s => s.class_id === c.id);
      const classHistory = history.filter(h => {
        const student = classStudents.find(s => s.id === h.student_id);
        if (!student) return false;
        const date = new Date(h.created_at);
        const matchesDateStart = filterDateStart ? date >= new Date(filterDateStart) : true;
        const matchesDateEnd = filterDateEnd ? date <= new Date(filterDateEnd) : true;
        return matchesDateStart && matchesDateEnd;
      });
      const totalPoints = classHistory.reduce((acc, curr) => acc + curr.points, 100);
      return { name: c.name, total_points: totalPoints };
    });

  const filteredViolations = filteredHistory.filter(h => h.points < 0);
  const filteredMerits = filteredHistory.filter(h => h.points > 0);
  
  const violationCounts = filteredViolations.reduce((acc: any, curr) => {
    acc[curr.rule_description] = (acc[curr.rule_description] || 0) + 1;
    return acc;
  }, {});
  
  const sortedViolations = Object.entries(violationCounts)
    .map(([description, count]) => ({ description, count }))
    .sort((a: any, b: any) => b.count - a.count);

  // Form states for Recording
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedRule, setSelectedRule] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingConductRecord, setEditingConductRecord] = useState<ConductRecord | null>(null);

  // Form states for Settings
  const [newRuleCode, setNewRuleCode] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRulePoints, setNewRulePoints] = useState(0);
  const [newRuleCat, setNewRuleCat] = useState<number | null>(null);
  const [newRuleSeverity, setNewRuleSeverity] = useState<Rule['severity']>('Nhẹ');
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<any | null>(null);

  // Student Detail state
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<ConductRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clsRes, stuRes, ruleRes, catRes, histRes, violRes, ptsRes, notifRes, sumRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/students'),
        fetch('/api/rules'),
        fetch('/api/rule-categories'),
        fetch('/api/conduct/history'),
        fetch('/api/stats/violations'),
        fetch('/api/stats/points-by-class'),
        fetch('/api/notifications'),
        fetch('/api/stats/summary')
      ]);

      setClasses(await clsRes.json());
      setStudents(await stuRes.json());
      setRules(await ruleRes.json());
      setCategories(await catRes.json());
      setHistory(await histRes.json());
      setStatsViolations(await violRes.json());
      setStatsPoints(await ptsRes.json());
      setNotifications(await notifRes.json());
      setSummaryStats(await sumRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmitConduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedRule) return;

    setIsSubmitting(true);
    try {
      const url = editingConductRecord ? `/api/conduct/${editingConductRecord.id}` : '/api/conduct';
      const method = editingConductRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          ruleId: selectedRule,
          recorderId: CURRENT_USER.id,
          note
        })
      });

      if (res.ok) {
        setNote('');
        setSelectedStudent(null);
        setSelectedRule(null);
        setEditingConductRecord(null);
        fetchData();
        alert(editingConductRecord ? 'Cập nhật thành công!' : 'Ghi nhận thành công!');
      }
    } catch (error) {
      console.error('Error submitting conduct:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditConduct = (record: ConductRecord) => {
    setEditingConductRecord(record);
    setSelectedStudent(record.student_id);
    setSelectedRule(record.rule_id);
    setNote(record.note);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConduct = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ghi nhận này?')) return;
    try {
      const res = await fetch(`/api/conduct/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting conduct record:', error);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleCat || !newRuleDesc || !newRuleCode) return;

    try {
      const url = editingRule ? `/api/rules/${editingRule.id}` : '/api/rules';
      const method = editingRule ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: newRuleCat,
          code: newRuleCode,
          description: newRuleDesc,
          points: newRulePoints,
          severity: newRuleSeverity
        })
      });

      if (res.ok) {
        setNewRuleCode('');
        setNewRuleDesc('');
        setNewRulePoints(0);
        setNewRuleCat(null);
        setNewRuleSeverity('Nhẹ');
        setEditingRule(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setNewRuleCode(rule.code);
    setNewRuleDesc(rule.description);
    setNewRulePoints(rule.points);
    setNewRuleCat(rule.category_id);
    setNewRuleSeverity(rule.severity);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nội quy này?')) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const url = editingCat ? `/api/rule-categories/${editingCat.id}` : '/api/rule-categories';
      const method = editingCat ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName })
      });

      if (res.ok) {
        setNewCatName('');
        setEditingCat(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      const res = await fetch(`/api/rule-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi khi xóa danh mục');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleViewStudent = async (student: Student) => {
    setViewingStudent(student);
    try {
      const [histRes, catRes] = await Promise.all([
        fetch(`/api/conduct/history?studentId=${student.id}`),
        fetch(`/api/stats/points-by-category?studentId=${student.id}`)
      ]);
      setStudentHistory(await histRes.json());
      setStudentCategoryStats(await catRes.json());
      setActiveTab('student-detail');
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">EduConduct</h1>
              <p className="text-xs text-slate-500">Hệ thống Nề nếp</p>
            </div>
          </div>

          <nav className="space-y-1">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Bảng điều khiển" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<PlusCircle size={20} />} 
              label="Ghi nhận nề nếp" 
              active={activeTab === 'record'} 
              onClick={() => setActiveTab('record')} 
            />
            <SidebarItem 
              icon={<CheckCircle2 size={20} />} 
              label="Quản lý Nề nếp" 
              active={activeTab === 'conduct'} 
              onClick={() => setActiveTab('conduct')} 
            />
            <SidebarItem 
              icon={<UserCircle size={20} />} 
              label="Hồ sơ học sinh" 
              active={activeTab === 'students'} 
              onClick={() => setActiveTab('students')} 
            />
            <SidebarItem 
              icon={<BarChart3 size={20} />} 
              label="Thống kê & Báo cáo" 
              active={activeTab === 'stats'} 
              onClick={() => setActiveTab('stats')} 
            />
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="Cấu hình nội quy" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
              {CURRENT_USER.full_name.split(' ').pop()?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{CURRENT_USER.full_name}</p>
              <p className="text-xs text-slate-500">{CURRENT_USER.role}</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors w-full">
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-semibold text-lg">
            {activeTab === 'dashboard' && 'Bảng điều khiển'}
            {activeTab === 'record' && 'Ghi nhận nề nếp'}
            {activeTab === 'students' && 'Danh sách học sinh'}
            {activeTab === 'student-detail' && 'Chi tiết hồ sơ'}
            {activeTab === 'conduct' && 'Quản lý Nề nếp'}
            {activeTab === 'stats' && 'Thống kê & Báo cáo'}
            {activeTab === 'settings' && 'Thiết lập nội quy & Thang điểm'}
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm học sinh..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative group">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              {/* Notification Dropdown (Simplified) */}
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 hidden group-hover:block z-50">
                <div className="p-4 border-b border-slate-100 font-bold text-sm">Thông báo mới</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Không có thông báo mới</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <p className="text-xs font-bold">{n.title}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Tổng học sinh" value={summaryStats.students.toString()} trend="Toàn trường" color="text-blue-600" />
                  <StatCard title="Tổng số lớp" value={summaryStats.classes.toString()} trend="Đang quản lý" color="text-indigo-600" />
                  <StatCard title="Số lần vi phạm" value={summaryStats.violations.toString()} trend="Tổng tích lũy" color="text-red-600" />
                  <StatCard title="Số lần khen thưởng" value={summaryStats.merits.toString()} trend="Tổng tích lũy" color="text-emerald-600" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Activity */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold">Sổ theo dõi nề nếp (Gần đây)</h3>
                      <button onClick={() => setActiveTab('record')} className="text-sm text-emerald-600 font-medium hover:underline">Thêm ghi nhận</button>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {history.slice(0, 8).map((record) => (
                        <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            record.points < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {record.points < 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{record.student_name}</p>
                            <p className="text-xs text-slate-500">[{record.category_name}] {record.rule_description}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-bold", record.points < 0 ? "text-red-600" : "text-emerald-600")}>
                              {record.points > 0 ? `+${record.points}` : record.points}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Violations Chart */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold mb-6">Lỗi vi phạm phổ biến</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sortedViolations}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="description"
                          >
                            {sortedViolations.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {sortedViolations.slice(0, 5).map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-slate-600">{v.description}</span>
                          </div>
                          <span className="font-bold">{v.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Conduct & Competition Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-2xl border border-orange-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <UserCircle size={24} />
                      </div>
                      <h4 className="font-bold text-slate-800">Nề nếp Tác phong</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Vi phạm tác phong (Tháng)</span>
                        <span className="text-sm font-bold text-orange-600">{filteredHistory.filter(h => ['Đồng phục', 'Kỷ luật'].includes(h.category_name) && h.points < 0).length} vụ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Tỷ lệ chuyên cần TB</span>
                        <span className="text-sm font-bold text-emerald-600">98.5%</span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('conduct')}
                        className="w-full mt-2 py-2 text-xs font-bold text-orange-600 bg-orange-100/50 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        Xem chi tiết tác phong
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <BarChart3 size={24} />
                      </div>
                      <h4 className="font-bold text-slate-800">Nề nếp Thi đua</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Điểm thi đua TB trường</span>
                        <span className="text-sm font-bold text-blue-600">
                          {(filteredStatsPoints.reduce((acc, curr) => acc + curr.total_points, 0) / (filteredStatsPoints.length || 1)).toFixed(0)}đ
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Lớp dẫn đầu phong trào</span>
                        <span className="text-sm font-bold text-emerald-600">
                          {[...filteredStatsPoints].sort((a,b) => b.total_points - a.total_points)[0]?.name || 'N/A'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('conduct')}
                        className="w-full mt-2 py-2 text-xs font-bold text-blue-600 bg-blue-100/50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Xem bảng xếp hạng thi đua
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'record' && (
              <motion.div 
                key="record"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <h3 className="text-xl font-bold mb-6">
                    {editingConductRecord ? 'Cập nhật ghi nhận' : 'Ghi nhận vi phạm / Khen thưởng'}
                  </h3>
                  <form onSubmit={handleSubmitConduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lọc lớp</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                          value={filterClass || ''}
                          onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Tất cả các lớp</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Học sinh</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500"
                          value={selectedStudent || ''}
                          onChange={(e) => setSelectedStudent(Number(e.target.value))}
                          required
                        >
                          <option value="">Chọn học sinh...</option>
                          {students
                            .filter(s => !filterClass || s.class_id === filterClass)
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.full_name} - {s.class_name}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lọc phân loại</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                          value={filterCategory || ''}
                          onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Tất cả phân loại</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hành vi</label>
                        <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500"
                          value={selectedRule || ''}
                          onChange={(e) => setSelectedRule(Number(e.target.value))}
                          required
                        >
                          <option value="">Chọn hành vi...</option>
                          {rules
                            .filter(r => !filterCategory || r.category_id === filterCategory)
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                [{r.category_name}] {r.description} ({r.points > 0 ? '+' : ''}{r.points}đ)
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú chi tiết</label>
                      <textarea 
                        rows={4}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Mô tả cụ thể sự việc..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Đang lưu...' : editingConductRecord ? 'Cập nhật ghi nhận' : 'Lưu ghi nhận'}
                      </button>
                      {editingConductRecord && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingConductRecord(null);
                            setSelectedStudent(null);
                            setSelectedRule(null);
                            setNote('');
                          }}
                          className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 font-bold">Các ghi nhận gần đây của bạn</div>
                  <div className="divide-y divide-slate-50">
                    {history.filter(r => r.recorder_id === CURRENT_USER.id).slice(0, 10).map((record) => (
                      <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          record.points < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {record.points < 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{record.student_name}</p>
                          <p className="text-xs text-slate-500 truncate">[{record.category_name}] {record.rule_description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditConduct(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Sửa"
                          >
                            <Settings size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteConduct(record.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Xóa"
                          >
                            <LogOut size={16} className="rotate-90" />
                          </button>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className={cn("text-sm font-bold", record.points < 0 ? "text-red-600" : "text-emerald-600")}>
                            {record.points > 0 ? `+${record.points}` : record.points}đ
                          </p>
                        </div>
                      </div>
                    ))}
                    {history.filter(r => r.recorder_id === CURRENT_USER.id).length === 0 && (
                      <div className="p-12 text-center text-slate-400 text-sm">Bạn chưa có ghi nhận nào</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'students' && (
              <motion.div 
                key="students"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-bold">Danh sách học sinh</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <select 
                        className="pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm font-medium outline-none appearance-none"
                        value={filterClass || ''}
                        onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Tất cả các lớp</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">Họ và tên</th>
                        <th className="px-6 py-4 font-semibold">Lớp</th>
                        <th className="px-6 py-4 font-semibold">Điểm thi đua</th>
                        <th className="px-6 py-4 font-semibold">Hạnh kiểm dự kiến</th>
                        <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students
                        .filter(s => {
                          const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesClass = filterClass ? s.class_id === filterClass : true;
                          return matchesSearch && matchesClass;
                        })
                        .map(s => {
                          const studentPoints = history.filter(h => h.student_id === s.id).reduce((acc, curr) => acc + curr.points, 100);
                        return (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                  {s.full_name.split(' ').pop()?.charAt(0)}
                                </div>
                                <span className="text-sm font-medium">{s.full_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{s.class_name}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-sm font-bold",
                                studentPoints >= 100 ? "text-emerald-600" : studentPoints >= 80 ? "text-blue-600" : "text-red-600"
                              )}>
                                {studentPoints}đ
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                studentPoints >= 100 ? "bg-emerald-50 text-emerald-700" : 
                                studentPoints >= 80 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                              )}>
                                {studentPoints >= 100 ? 'Tốt' : studentPoints >= 80 ? 'Khá' : 'Trung bình'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleViewStudent(s)}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                              >
                                Xem hồ sơ <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'student-detail' && viewingStudent && (
              <motion.div 
                key="student-detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setActiveTab('students')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <LogOut className="rotate-180" size={20} />
                  </button>
                  <h3 className="text-xl font-bold">Hồ sơ nề nếp: {viewingStudent.full_name}</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="text-center mb-6">
                      <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                        {viewingStudent.full_name.split(' ').pop()?.charAt(0)}
                      </div>
                      <h4 className="text-lg font-bold">{viewingStudent.full_name}</h4>
                      <p className="text-sm text-slate-500 mb-2">Lớp {viewingStudent.class_name}</p>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        studentHistory.reduce((acc, curr) => acc + curr.points, 100) >= 100 ? "bg-emerald-50 text-emerald-700" : 
                        studentHistory.reduce((acc, curr) => acc + curr.points, 100) >= 80 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                      )}>
                        Hạnh kiểm dự kiến: {studentHistory.reduce((acc, curr) => acc + curr.points, 100) >= 100 ? 'Tốt' : studentHistory.reduce((acc, curr) => acc + curr.points, 100) >= 80 ? 'Khá' : 'Trung bình'}
                      </span>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Điểm hiện tại:</span>
                        <span className="font-bold text-emerald-600">
                          {studentHistory.reduce((acc, curr) => acc + curr.points, 100)}đ
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Số lần vi phạm:</span>
                        <span className="font-bold text-red-600">
                          {studentHistory.filter(h => h.points < 0).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Số lần khen thưởng:</span>
                        <span className="font-bold text-emerald-600">
                          {studentHistory.filter(h => h.points > 0).length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-4">Phân bổ theo danh mục</h5>
                      <div className="space-y-3">
                        {studentCategoryStats.map((stat, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                              <span>{stat.name}</span>
                              <span className={cn("font-bold", stat.total_points >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {stat.total_points > 0 ? `+${stat.total_points}` : stat.total_points}đ
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full">
                              <div 
                                className={cn("h-full rounded-full", stat.total_points >= 0 ? "bg-emerald-500" : "bg-red-500")}
                                style={{ width: `${Math.min(100, Math.abs(stat.total_points) * 5)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="font-bold">Lịch sử rèn luyện (Timeline)</div>
                      <div className="flex gap-2">
                        <select 
                          className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold outline-none"
                          value={filterCategory || ''}
                          onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Tất cả phân loại</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select 
                          className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold outline-none"
                          value={filterSeverity}
                          onChange={(e) => setFilterSeverity(e.target.value as any)}
                        >
                          <option value="all">Tất cả mức độ</option>
                          <option value="Nhẹ">Nhẹ</option>
                          <option value="Trung bình">Trung bình</option>
                          <option value="Nghiêm trọng">Nghiêm trọng</option>
                          <option value="Khen thưởng">Khen thưởng</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      {studentHistory
                        .filter(h => {
                          const matchesCategory = filterCategory ? h.rule_id && rules.find(r => r.id === h.rule_id)?.category_id === filterCategory : true;
                          const matchesSeverity = filterSeverity === 'all' ? true : h.severity === filterSeverity;
                          return matchesCategory && matchesSeverity;
                        })
                        .length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">Chưa có ghi nhận nào phù hợp</div>
                      ) : (
                        studentHistory
                          .filter(h => {
                            const matchesCategory = filterCategory ? h.rule_id && rules.find(r => r.id === h.rule_id)?.category_id === filterCategory : true;
                            const matchesSeverity = filterSeverity === 'all' ? true : h.severity === filterSeverity;
                            return matchesCategory && matchesSeverity;
                          })
                          .map((h, idx) => (
                          <div key={h.id} className="relative pl-8 before:absolute before:left-0 before:top-2 before:w-3 before:h-3 before:rounded-full before:bg-emerald-500 after:absolute after:left-[5px] after:top-5 after:bottom-[-24px] after:w-[2px] after:bg-slate-100 last:after:hidden">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">{h.rule_code}</span>
                                  <p className="text-sm font-bold">{h.rule_description}</p>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                                    h.severity === 'Nhẹ' ? "bg-blue-50 text-blue-600" :
                                    h.severity === 'Trung bình' ? "bg-amber-50 text-amber-600" :
                                    h.severity === 'Nặng' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                  )}>
                                    {h.severity}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{h.note || 'Không có ghi chú'}</p>
                                <p className="text-[10px] text-slate-400 mt-2">Người ghi: {h.recorder_name}</p>
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-lg",
                                  h.points < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                  {h.points > 0 ? `+${h.points}` : h.points}đ
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1">{new Date(h.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'conduct' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý Nề nếp & Tác phong</h2>
                    <p className="text-slate-500">Theo dõi tiêu chuẩn tác phong cá nhân và phong trào thi đua tập thể.</p>
                  </div>
                </div>

                {/* Conduct Filters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thời gian từ</label>
                    <input 
                      type="date" 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Đến ngày</label>
                    <input 
                      type="date" 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lọc theo lớp</label>
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={filterClass || ''}
                      onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Tất cả các lớp</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterClass(null); }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    Đặt lại
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Nề nếp Tác phong */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                          <UserCircle size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">Nề nếp Tác phong</h3>
                          <p className="text-xs text-slate-500">Tiêu chuẩn cá nhân: Đồng phục, Chuyên cần, Thái độ</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vi phạm tác phong</p>
                          <p className="text-xl font-bold text-orange-600">
                            {filteredHistory.filter(h => ['Đồng phục', 'Kỷ luật'].includes(h.category_name) && h.points < 0).length} vụ
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tỷ lệ chuyên cần</p>
                          <p className="text-xl font-bold text-emerald-600">98.5%</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-700">Quy định tác phong chuẩn</h4>
                        <ul className="space-y-3">
                          {[
                            { label: "Đồng phục", desc: "Đúng quy định, sơ vin, đeo thẻ học sinh đầy đủ." },
                            { label: "Chuyên cần", desc: "Đi học đúng giờ, không nghỉ học không phép." },
                            { label: "Hành vi", desc: "Lễ phép, không gây mất trật tự, không sử dụng điện thoại." }
                          ].map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-800">{item.label}:</span>
                                <span className="text-slate-600 ml-1">{item.desc}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Nề nếp Thi đua */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                          <BarChart3 size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">Nề nếp Thi đua</h3>
                          <p className="text-xs text-slate-500">Phong trào tập thể: Học tập, Ngoại khóa, Thi đua lớp</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Điểm thi đua TB</p>
                          <p className="text-xl font-bold text-blue-600">
                            {(filteredStatsPoints.reduce((acc, curr) => acc + curr.total_points, 0) / (filteredStatsPoints.length || 1)).toFixed(0)}đ
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Khen thưởng tuần</p>
                          <p className="text-xl font-bold text-emerald-600">
                            {filteredHistory.filter(h => h.points > 0 && new Date(h.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} lượt
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-700">Tiêu chí thi đua tập thể</h4>
                        <ul className="space-y-3">
                          {[
                            { label: "Học tập", desc: "Tích cực phát biểu, đạt điểm cao, không quay cóp." },
                            { label: "Phong trào", desc: "Tham gia đầy đủ các hoạt động ngoại khóa, văn thể mỹ." },
                            { label: "Vệ sinh", desc: "Giữ gìn vệ sinh lớp học và khuôn viên nhà trường." }
                          ].map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-800">{item.label}:</span>
                                <span className="text-slate-600 ml-1">{item.desc}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Comparison Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800">Bảng theo dõi thi đua chi tiết các lớp</h3>
                    <div className="flex gap-2">
                      <select 
                        className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold outline-none appearance-none"
                        value={filterClass || ''}
                        onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Tất cả các lớp</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Hạng</th>
                          <th className="px-6 py-4">Lớp</th>
                          <th className="px-6 py-4">Tác phong (Vi phạm)</th>
                          <th className="px-6 py-4">Học tập (Khen thưởng)</th>
                          <th className="px-6 py-4">Tổng điểm</th>
                          <th className="px-6 py-4">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...filteredStatsPoints]
                          .sort((a,b) => b.total_points - a.total_points)
                          .map((item, idx) => {
                            const classHistory = filteredHistory.filter(h => {
                              const student = students.find(s => s.id === h.student_id);
                              const cls = classes.find(c => c.id === student?.class_id);
                              return cls?.name === item.name;
                            });
                            const violations = classHistory.filter(h => h.points < 0).length;
                          const merits = classHistory.filter(h => h.points > 0).length;

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                  idx === 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"
                                )}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                              <td className="px-6 py-4 text-red-600 font-medium">-{violations} lỗi</td>
                              <td className="px-6 py-4 text-emerald-600 font-medium">+{merits} lượt</td>
                              <td className="px-6 py-4 font-bold text-slate-900">{item.total_points}đ</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                  item.total_points > 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  {item.total_points > 100 ? "Xuất sắc" : "Cần cố gắng"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Stats Filters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thời gian từ</label>
                    <input 
                      type="date" 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={filterDateStart}
                      onChange={(e) => setFilterDateStart(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Đến ngày</label>
                    <input 
                      type="date" 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={filterDateEnd}
                      onChange={(e) => setFilterDateEnd(e.target.value)}
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lọc theo lớp</label>
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                      value={filterClass || ''}
                      onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Tất cả các lớp</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterClass(null); }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    Đặt lại
                  </button>
                </div>

                {/* Summary Cards for Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tỷ lệ khen thưởng</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {((filteredMerits.length / (filteredMerits.length + filteredViolations.length || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lớp dẫn đầu</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {[...filteredStatsPoints].sort((a,b) => b.total_points - a.total_points)[0]?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lỗi phổ biến nhất</p>
                    <p className="text-sm font-bold text-red-600 truncate">
                      {sortedViolations[0]?.description || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Điểm TB toàn trường</p>
                    <p className="text-2xl font-bold text-slate-700">
                      {(filteredStatsPoints.reduce((acc, curr) => acc + curr.total_points, 0) / (filteredStatsPoints.length || 1)).toFixed(0)}đ
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold">Điểm thi đua theo lớp</h3>
                    <div className="flex gap-2">
                      <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
                        Xuất báo cáo PDF
                      </button>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredStatsPoints}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="total_points" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h4 className="font-bold mb-4">Xếp hạng thi đua toàn trường</h4>
                      <div className="space-y-4">
                        {[...filteredStatsPoints].sort((a,b) => b.total_points - a.total_points).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                              idx === 0 ? "bg-yellow-100 text-yellow-700" : 
                              idx === 1 ? "bg-slate-100 text-slate-700" :
                              idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                            )}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">Lớp {item.name}</p>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full" 
                                  style={{ width: `${Math.min(100, (item.total_points / 1000) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600">{item.total_points}đ</p>
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>
                   
                   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                       <h4 className="font-bold mb-4">Phân tích xu hướng & Nhận định</h4>
                       <p className="text-sm text-slate-500 mb-6">
                         Dựa trên dữ liệu tổng hợp, hệ thống đưa ra các nhận định tự động để BGH có hướng xử lý kịp thời.
                       </p>
                       <div className="space-y-3">
                         <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                           <AlertCircle className="text-amber-600 shrink-0" size={20} />
                           <div>
                             <p className="text-sm font-bold text-amber-900">Cảnh báo vi phạm</p>
                             <p className="text-xs text-amber-800">Lỗi "{statsViolations[0]?.description}" đang chiếm tỷ trọng cao nhất ({((statsViolations[0]?.count / (summaryStats.violations || 1)) * 100).toFixed(1)}%).</p>
                           </div>
                         </div>
                         <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
                           <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                           <div>
                             <p className="text-sm font-bold text-emerald-900">Ghi nhận tích cực</p>
                             <p className="text-xs text-emerald-800">Lớp {[...statsPoints].sort((a,b) => b.total_points - a.total_points)[0]?.name} đang có phong trào thi đua dẫn đầu.</p>
                           </div>
                         </div>
                         <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                           <BarChart3 className="text-blue-600 shrink-0" size={20} />
                           <div>
                             <p className="text-sm font-bold text-blue-900">Dự báo hạnh kiểm</p>
                             <p className="text-xs text-blue-800">Dự kiến {((students.length - summaryStats.violations / 10) / (students.length || 1) * 100).toFixed(0)}% học sinh đạt hạnh kiểm Tốt cuối kỳ.</p>
                           </div>
                         </div>
                       </div>
                    </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Rule Management */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <h3 className="text-xl font-bold mb-6">Quản lý Nội quy & Thang điểm</h3>
                  
                  <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm nội quy..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="w-48">
                      <select 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        value={filterCategory || ''}
                        onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Tất cả phân loại</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="w-40">
                      <select 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value as any)}
                      >
                        <option value="all">Tất cả mức độ</option>
                        <option value="Nhẹ">Nhẹ</option>
                        <option value="Trung bình">Trung bình</option>
                        <option value="Nghiêm trọng">Nghiêm trọng</option>
                        <option value="Khen thưởng">Khen thưởng</option>
                      </select>
                    </div>
                  </div>

                  <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8 p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mã nội quy</label>
                      <input 
                        type="text" 
                        placeholder="VD: CC01"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                        value={newRuleCode}
                        onChange={(e) => setNewRuleCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phân loại</label>
                      <select 
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                        value={newRuleCat || ''}
                        onChange={(e) => setNewRuleCat(Number(e.target.value))}
                        required
                      >
                        <option value="">Chọn...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mô tả hành vi</label>
                      <input 
                        type="text" 
                        placeholder="Ví dụ: Đi học muộn, Giúp đỡ bạn bè..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                        value={newRuleDesc}
                        onChange={(e) => setNewRuleDesc(e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mức độ</label>
                      <select 
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                        value={newRuleSeverity}
                        onChange={(e) => setNewRuleSeverity(e.target.value as Rule['severity'])}
                        required
                      >
                        <option value="Nhẹ">Nhẹ</option>
                        <option value="Trung bình">Trung bình</option>
                        <option value="Nặng">Nặng</option>
                        <option value="Khen thưởng">Khen thưởng</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Điểm (+/-)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                          value={newRulePoints}
                          onChange={(e) => setNewRulePoints(Number(e.target.value))}
                          required
                        />
                        <button type="submit" className="px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold whitespace-nowrap">
                          {editingRule ? 'Cập nhật' : 'Thêm'}
                        </button>
                        {editingRule && (
                          <button 
                            type="button" 
                            onClick={() => { setEditingRule(null); setNewRuleCode(''); setNewRuleDesc(''); setNewRulePoints(0); setNewRuleCat(null); setNewRuleSeverity('Nhẹ'); }}
                            className="px-4 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 font-bold"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                          <th className="px-4 py-3 border-b border-slate-100">Mã</th>
                          <th className="px-4 py-3 border-b border-slate-100">Phân loại</th>
                          <th className="px-4 py-3 border-b border-slate-100">Mô tả</th>
                          <th className="px-4 py-3 border-b border-slate-100">Mức độ</th>
                          <th className="px-4 py-3 border-b border-slate-100">Điểm</th>
                          <th className="px-4 py-3 border-b border-slate-100">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rules
                          .filter(r => {
                            const matchesSearch = r.description.toLowerCase().includes(searchQuery.toLowerCase()) || r.code.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesCategory = filterCategory ? r.category_id === filterCategory : true;
                            const matchesSeverity = filterSeverity === 'all' ? true : r.severity === filterSeverity;
                            return matchesSearch && matchesCategory && matchesSeverity;
                          })
                          .map(r => (
                          <tr key={r.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-3 text-sm font-bold text-slate-400">{r.code}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{r.category_name}</span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{r.description}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold",
                                r.severity === 'Nhẹ' ? "bg-blue-50 text-blue-600" :
                                r.severity === 'Trung bình' ? "bg-amber-50 text-amber-600" :
                                r.severity === 'Nặng' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {r.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "text-sm font-bold",
                                r.points > 0 ? "text-emerald-600" : "text-red-600"
                              )}>
                                {r.points > 0 ? `+${r.points}` : r.points}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleEditRule(r)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                                >
                                  Sửa
                                </button>
                                <button 
                                  onClick={() => handleDeleteRule(r.id)}
                                  className="text-xs text-red-500 hover:text-red-700 font-bold"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Category Management */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <h3 className="text-xl font-bold mb-6">Quản lý Danh mục Hành vi</h3>
                  
                  <form onSubmit={handleAddCategory} className="flex gap-4 mb-8 max-w-md">
                    <input 
                      type="text" 
                      placeholder="Tên danh mục mới..."
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      required
                    />
                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">
                      {editingCat ? 'Cập nhật' : 'Thêm danh mục'}
                    </button>
                    {editingCat && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingCat(null); setNewCatName(''); }}
                        className="px-4 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 font-bold"
                      >
                        Hủy
                      </button>
                    )}
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map(cat => (
                      <div key={cat.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                        <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingCat(cat); setNewCatName(cat.name); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Settings size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <LogOut size={14} className="rotate-90" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-emerald-50 text-emerald-700 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, trend, color }: { title: string, value: string, trend: string, color: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className={cn("text-3xl font-bold", color)}>{value}</h4>
        <div className={cn(
          "text-xs font-bold px-2 py-1 rounded-lg",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {trend}
        </div>
      </div>
    </div>
  );
}
