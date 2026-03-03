export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'BGH' | 'GVCN' | 'GVBM' | 'GIAM_THI' | 'PHU_HUYNH' | 'HOC_SINH';
  class_id?: number;
}

export interface Class {
  id: number;
  name: string;
  grade: number;
}

export interface Student {
  id: number;
  full_name: string;
  class_id: number;
  class_name: string;
}

export interface Rule {
  id: number;
  category_id: number;
  category_name: string;
  code: string;
  description: string;
  points: number;
  severity: 'Nhẹ' | 'Trung bình' | 'Nặng' | 'Khen thưởng';
}

export interface ConductRecord {
  id: number;
  student_id: number;
  student_name: string;
  rule_id: number;
  rule_code: string;
  rule_description: string;
  points: number;
  severity: string;
  category_name: string;
  recorder_id: number;
  recorder_name: string;
  note: string;
  created_at: string;
}
