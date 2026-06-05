import { Plan, User, Role, PlanStatus } from '../types';


export const MOCK_USERS: User[] = [
  { id: 'td3-1', name: 'Phạm Văn Tuấn', email: 'teacher@saodo.edu.vn', role: 'TEACHER', departmentId: 'd3', departmentName: 'Khoa Điện' },
  { id: 'h3', name: 'TS. Nguyễn Phương Tỵ', email: 'head@saodo.edu.vn', role: 'DEPT_HEAD', departmentId: 'd3', departmentName: 'Khoa Điện' },
  { id: 'b1', name: 'Lê Văn C', email: 'bgh@saodo.edu.vn', role: 'BOARD', departmentId: 'admin', departmentName: 'Ban Giám hiệu' },
  { id: 'q1', name: 'Phạm Thị D', email: 'qc@saodo.edu.vn', role: 'QC', departmentId: 'admin', departmentName: 'Phòng Quản lý Chất lượng' },
  { id: 'a1', name: 'Hoàng Văn E', email: 'admin@saodo.edu.vn', role: 'ADMIN', departmentId: 'admin', departmentName: 'Quản trị hệ thống' },
];


const DEPARTMENTS = [
  'Khoa Công nghệ Thông tin',
  'Khoa Cơ khí',
  'Khoa Điện',
  'Khoa May & Thời trang',
  'Khoa Ô tô'
];

const STATUSES: PlanStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'DEPT_APPROVED_TO_BGH',
  'REPORT_SUBMITTED',
  'ACCEPTED_TO_BGH'
];

export const generateMockPlans = (): Plan[] => {
  const plans: Plan[] = [];
  let planId = 1;

  DEPARTMENTS.forEach((dept, deptIdx) => {
    const deptId = `d${deptIdx + 1}`;
    
    // Generate 12 plans per department
    for (let i = 1; i <= 12; i++) {
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const teacherId = `t${deptId}-${i}`;
      const teacherName = `Giảng viên ${deptIdx + 1}-${i}`;
      
      const plan: Plan = {
        id: `p${planId}`,
        code: `KH-2025-12-${planId.toString().padStart(4, '0')}`,
        title: `Kế hoạch công tác tháng 12/2025 - ${dept}`,
        month: 12,
        year: 2025,
        teacherId,
        teacherName,
        departmentId: deptId,
        status: status,
        items: [
          { id: 'i1', topic: 'Giảng dạy lý thuyết Kỹ thuật lập trình', expectedResult: 'Hoàn thành 45 tiết, sinh viên hiểu bài', plannedHours: 45 },
          { id: 'i2', topic: 'Hướng dẫn thực hành Lab 1-4', expectedResult: '100% sinh viên nộp bài tập', plannedHours: 20 },
          { id: 'i3', topic: 'Nghiên cứu khoa học: AI trong Giáo dục', expectedResult: 'Viết xong bản thảo bài báo', plannedHours: 15 },
        ],
        weeks: [
          { id: 'w1', weekLabel: 'Tuần 1 (01/12 - 07/12)', plannedHours: 20, actualHours: status === 'ACCEPTED_TO_BGH' || status === 'REPORT_SUBMITTED' ? 20 : undefined },
          { id: 'w2', weekLabel: 'Tuần 2 (08/12 - 14/12)', plannedHours: 20, actualHours: status === 'ACCEPTED_TO_BGH' || status === 'REPORT_SUBMITTED' ? 18 : undefined },
          { id: 'w3', weekLabel: 'Tuần 3 (15/12 - 21/12)', plannedHours: 20, actualHours: status === 'ACCEPTED_TO_BGH' || status === 'REPORT_SUBMITTED' ? 22 : undefined },
          { id: 'w4', weekLabel: 'Tuần 4 (22/12 - 31/12)', plannedHours: 20, actualHours: status === 'ACCEPTED_TO_BGH' || status === 'REPORT_SUBMITTED' ? 20 : undefined },
        ],
        auditLog: [
          { id: 'l1', actor: teacherName, action: 'Khởi tạo', timestamp: '2025-11-25T08:00:00Z' },
        ],
        score: status === 'ACCEPTED_TO_BGH' ? 95 : undefined,
        feedback: status === 'ACCEPTED_TO_BGH' ? 'Hoàn thành tốt kế hoạch đề ra.' : undefined,
      };

      // Add workflow history based on status
      if (status !== 'DRAFT') {
        plan.auditLog.push({ id: 'l2', actor: teacherName, action: 'Gửi duyệt', timestamp: '2025-11-28T10:00:00Z' });
      }
      if (['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(status)) {
        plan.auditLog.push({ id: 'l3', actor: `Trưởng khoa ${dept}`, action: 'Phê duyệt Phase 1', timestamp: '2025-11-30T14:30:00Z', comment: 'Đạt yêu cầu.' });
      }
      if (['REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(status)) {
        plan.auditLog.push({ id: 'l4', actor: teacherName, action: 'Nộp báo cáo', timestamp: '2025-12-30T16:00:00Z' });
      }
      if (status === 'ACCEPTED_TO_BGH') {
        plan.auditLog.push({ id: 'l5', actor: `Trưởng khoa ${dept}`, action: 'Nghiệm thu Phase 2', timestamp: '2025-12-31T09:00:00Z', comment: 'Xuất sắc.' });
      }

      plans.push(plan);
      planId++;
    }
  });

  // Inject High-Fidelity Demo Plan directly from PDF for 'teacher@saodo.edu.vn'
  const realPdfPlan: Plan = {
    id: 'plan_pdf_demo_1',
    code: '12/KH-KĐ',
    title: 'Kế hoạch Khai thác thiết bị tại Trung tâm Thực hành, thực nghiệm điện',
    month: 12,
    year: 2025,
    teacherId: 'td3-1',
    teacherName: 'Phạm Văn Tuấn',
    departmentId: 'd3',
    status: 'ACCEPTED_TO_BGH',
    items: [
      { id: 'i1', topic: 'Nghiên cứu ứng dụng cảm biến siêu âm trong hệ thống tự động khoan các chi tiết (Bàn đào tạo các thiết bị cảm biến)', expectedResult: '- Cài đặt các chế độ cho cảm biến\n- Đấu nối vận hành được thiết bị đúng yêu cầu.', plannedHours: 19 },
      { id: 'i2', topic: 'Nghiên cứu ứng dụng cảm biến khói trong hệ thống tự động phòng cháy, chữa cháy (Bàn đào tạo các thiết bị cảm biến)', expectedResult: '- Cài đặt các chế độ cho cảm biến\n- Đấu nối vận hành được thiết bị đúng yêu cầu.', plannedHours: 20 },
      { id: 'i3', topic: 'Giảng dạy thực hành, thực nghiệm chuyên ngành Điện theo lịch trình biểu học kỳ', expectedResult: '- Sinh viên nắm vững kỹ năng thực hành\n- Đảm bảo an toàn thiết bị', plannedHours: 0 }
    ],
    weeks: [
      { id: 'w1', weekLabel: 'Tuần từ 01 - 07', plannedHours: 9, actualHours: 9 },
      { id: 'w2', weekLabel: 'Tuần từ 08 - 14', plannedHours: 9, actualHours: 9 },
      { id: 'w3', weekLabel: 'Tuần từ 15 - 21', plannedHours: 15, actualHours: 15 },
      { id: 'w4', weekLabel: 'Tuần từ 22 - 28', plannedHours: 6, actualHours: 6 },
      { id: 'w5', weekLabel: 'Tuần từ 29 - 31', plannedHours: 0, actualHours: 0 }
    ],
    auditLog: [
      { id: 'alog1', actor: 'Phạm Văn Tuấn', action: 'Khởi tạo', timestamp: '2025-11-20T08:00:00Z' },
      { id: 'alog2', actor: 'Phạm Văn Tuấn', action: 'Gửi duyệt', timestamp: '2025-11-20T09:00:00Z' },
      { id: 'alog3', actor: 'TS. Nguyễn Phương Tỵ', action: 'Phê duyệt Kế hoạch', timestamp: '2025-12-01T14:30:00Z', comment: 'Đồng ý khai thác các thiết bị.' },
      { id: 'alog4', actor: 'Phạm Văn Tuấn', action: 'Nộp báo cáo', timestamp: '2025-12-30T16:00:00Z' },
      { id: 'alog5', actor: 'TS. Nguyễn Phương Tỵ', action: 'Nghiệm thu Thực tế', timestamp: '2025-12-31T09:00:00Z', comment: 'Nghiệm thu Đạt.' },
      { id: 'alog6', actor: 'TS. Đỗ Văn Đỉnh', action: 'Ban Giám Hiệu Xác Nhận', timestamp: '2025-12-31T15:00:00Z', comment: 'Thống nhất nghiệm thu kết quả tháng 12 năm 2025 Khoa Điện.' }
    ],
    score: 100,
    feedback: 'Hoàn thành suất sắc khối lượng công việc, ứng dụng tốt thiết bị.'
  };

  plans.unshift(realPdfPlan);

  return plans;
};
