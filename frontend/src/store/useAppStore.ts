import { create } from 'zustand';
import axios from 'axios';
import { Plan, User, PlanStatus, Role, TableTemplate } from '../types';
export type Theme = 'light' | 'dark' | 'system';
export type { Plan, User, PlanStatus, Role };
import { generateMockPlans } from '../data/mockData';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../trpc/shared-types';

const DEFAULT_TEMPLATES: TableTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Mẫu Plan',
    columns: [
      { id: 'tt', name: 'TT', width: 'w-12', align: 'center' },
      { id: 'chu_de', name: 'Tên chủ đề/nội dung nghiên cứu', width: 'min-w-[200px]' },
      { id: 'dia_diem', name: 'Địa điểm', width: 'min-w-[120px]' },
      { id: 'ten_thiet_bi', name: 'Tên thiết bị', width: 'min-w-[150px]' },
      { id: 'nam_su_dung', name: 'Năm đưa vào sử dụng', width: 'w-[100px]', align: 'center' },
      { id: 'giang_vien', name: 'Giảng viên thực hiện', width: 'min-w-[150px]' },
      { id: 'thoi_gian', name: 'Thời gian thực hiện', width: 'min-w-[120px]' },
      { id: 'ket_qua', name: 'Dự kiến kết quả đạt được', width: 'min-w-[200px]' }
    ]
  },
  {
    id: 'tpl-2',
    name: 'Kết quả kiểm tra thiết bị',
    columns: [
      { id: 'tt', name: 'TT', width: 'w-10', align: 'center' },
      { id: 'content', name: 'Nội dung kiểm tra', width: 'min-w-[150px]' },
      { id: 'equipmentStatus', name: 'Tình trạng thiết bị', width: 'min-w-[150px]' },
      { id: 'checker', name: 'Người kiểm tra', width: 'w-[130px]' },
      { id: 'time', name: 'Thời gian', width: 'min-w-[150px]' },
      { id: 'notes', name: 'Ghi chú', width: 'w-24', align: 'center' },
    ]
  }
];


// Create vanilla tRPC client for transparent fallback
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/trpc',
      transformer: superjson,
      headers() {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

// Set default axios config with transparent tRPC translation adapter
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

const defaultAdapter = api.defaults.adapter;

api.defaults.adapter = async (config) => {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();
  
  // Resolve data
  let data: any = config.data;
  if (typeof data === 'string' && data.startsWith('{')) {
    try { data = JSON.parse(data); } catch (e) {}
  }

  // Keep file uploads and standard assets as REST
  if (url === '/uploads' || url.startsWith('/uploads') || url.startsWith('/api/uploads') || url.includes('uploads')) {
    return (defaultAdapter as any)(config);
  }

  let trpcResponse: any;

  try {
    if (url === '/login' && method === 'post') {
      trpcResponse = await trpcClient.auth.login.mutate(data);
    } else if (url === '/register' && method === 'post') {
      trpcResponse = await trpcClient.auth.register.mutate(data);
    } else if (url === '/me' && method === 'get') {
      trpcResponse = await trpcClient.auth.me.query();
    } else if (url === '/users/next-code' && method === 'get') {
      trpcResponse = await trpcClient.auth.nextCode.query();
    } else if (url === '/users/pending' && method === 'get') {
      trpcResponse = await trpcClient.users.listPending.query();
    } else if (url === '/users/pending-profiles' && method === 'get') {
      trpcResponse = await trpcClient.users.listPendingProfiles.query();
    } else if (url === '/users/active' && method === 'get') {
      trpcResponse = await trpcClient.users.listActive.query();
    } else if (url === '/departments' && method === 'get') {
      trpcResponse = await trpcClient.departments.list.query();
    } else if (url === '/departments' && method === 'post') {
      trpcResponse = await trpcClient.departments.create.mutate(data);
    } else if (url.match(/^\/users\/(\d+)\/approve$/) && method === 'put') {
      const id = parseInt(url.match(/^\/users\/(\d+)\/approve$/)![1], 10);
      trpcResponse = await trpcClient.users.approve.mutate({ id });
    } else if (url.match(/^\/users\/(\d+)\/reject$/) && method === 'put') {
      const id = parseInt(url.match(/^\/users\/(\d+)\/reject$/)![1], 10);
      trpcResponse = await trpcClient.users.reject.mutate({ id });
    } else if (url.match(/^\/users\/(\d+)\/approve-profile$/) && method === 'put') {
      const id = parseInt(url.match(/^\/users\/(\d+)\/approve-profile$/)![1], 10);
      trpcResponse = await trpcClient.users.approveProfile.mutate({ id });
    } else if (url.match(/^\/users\/(\d+)\/reject-profile$/) && method === 'put') {
      const id = parseInt(url.match(/^\/users\/(\d+)\/reject-profile$/)![1], 10);
      trpcResponse = await trpcClient.users.rejectProfile.mutate({ id });
    } else if (url.match(/^\/users\/(\d+)$/) && method === 'delete') {
      const id = parseInt(url.match(/^\/users\/(\d+)$/)![1], 10);
      trpcResponse = await trpcClient.users.delete.mutate({ id });
    } else if (url.match(/^\/users\/(\d+)\/activities$/) && method === 'get') {
      const id = parseInt(url.match(/^\/users\/(\d+)\/activities$/)![1], 10);
      trpcResponse = await trpcClient.users.activities.query({ id });
    } else if (url === '/users/profile-request' && method === 'post') {
      trpcResponse = await trpcClient.users.updateProfile.mutate(data);
    } else if (url === '/users/avatar' && method === 'post') {
      // 1. Upload avatar file
      const uploadRes = await axios.post('/api/uploads', data, {
        adapter: defaultAdapter,
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        }
      });
      // 2. Call tRPC mutation
      trpcResponse = await trpcClient.users.updateAvatar.mutate({ avatar: uploadRes.data.path });
    } else if (url === '/plans' && method === 'get') {
      trpcResponse = await trpcClient.plans.list.query();
    } else if (url.match(/^\/plans\/(\d+)$/) && method === 'get') {
      const id = parseInt(url.match(/^\/plans\/(\d+)$/)![1], 10);
      trpcResponse = await trpcClient.plans.get.query({ id });
    } else if (url === '/plans' && method === 'post') {
      let payload = data;
      if (data instanceof FormData) {
        const newAttachments: any[] = [];
        const files = data.getAll('new_attachments[]');
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await axios.post('/api/uploads', formData, {
            adapter: defaultAdapter,
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            }
          });
          newAttachments.push({
            name: uploadRes.data.name,
            path: uploadRes.data.path,
          });
        }
        payload = {
          title: data.get('title') || '',
          month: parseInt(data.get('month') as string || '1', 10),
          year: parseInt(data.get('year') as string || '2026', 10),
          items: data.get('items') ? JSON.parse(data.get('items') as string) : [],
          weeks: data.get('weeks') ? JSON.parse(data.get('weeks') as string) : [],
          newAttachments,
        };
      }
      trpcResponse = await trpcClient.plans.create.mutate(payload);
    } else if (url.match(/^\/plans\/(\d+)$/) && method === 'post') {
      const id = parseInt(url.match(/^\/plans\/(\d+)$/)![1], 10);
      let payload = data;
      if (data instanceof FormData) {
        const newAttachments: any[] = [];
        const files = data.getAll('new_attachments[]');
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await axios.post('/api/uploads', formData, {
            adapter: defaultAdapter,
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            }
          });
          newAttachments.push({
            name: uploadRes.data.name,
            path: uploadRes.data.path,
          });
        }
        payload = {
          id,
          ...(data.get('title') && { title: data.get('title') as string }),
          ...(data.get('items') && { items: JSON.parse(data.get('items') as string) }),
          ...(data.get('weeks') && { weeks: JSON.parse(data.get('weeks') as string) }),
          ...(data.get('kept_attachments') && { keptAttachments: JSON.parse(data.get('kept_attachments') as string) }),
          ...(newAttachments.length && { newAttachments }),
        };
      }
      trpcResponse = await trpcClient.plans.update.mutate(payload);
    } else if (url.match(/^\/plans\/(\d+)$/) && method === 'delete') {
      const id = parseInt(url.match(/^\/plans\/(\d+)$/)![1], 10);
      trpcResponse = await trpcClient.plans.delete.mutate({ id });
    } else if (url.match(/^\/plans\/(\d+)\/status$/) && method === 'put') {
      const id = parseInt(url.match(/^\/plans\/(\d+)\/status$/)![1], 10);
      trpcResponse = await trpcClient.plans.updateStatus.mutate({ id, status: data.status, comment: data.comment });
    } else if (url.match(/^\/plans\/(\d+)\/approve-p1$/) && method === 'put') {
      const id = parseInt(url.match(/^\/plans\/(\d+)\/approve-p1$/)![1], 10);
      trpcResponse = await trpcClient.plans.approvePhase1.mutate({ id, comment: data.comment });
    } else if (url.match(/^\/plans\/(\d+)\/submit-report$/) && method === 'put') {
      const id = parseInt(url.match(/^\/plans\/(\d+)\/submit-report$/)![1], 10);
      trpcResponse = await trpcClient.plans.submitReport.mutate({ id, weeks: data.weeks });
    } else if (url.match(/^\/plans\/(\d+)\/accept-p2$/) && method === 'put') {
      const id = parseInt(url.match(/^\/plans\/(\d+)\/accept-p2$/)![1], 10);
      trpcResponse = await trpcClient.plans.acceptPhase2.mutate({ id, score: data.score, feedback: data.feedback });
    } else if (url.match(/^\/plans\/(\d+)\/weeks\/(\d+)\/status$/) && method === 'put') {
      const match = url.match(/^\/plans\/(\d+)\/weeks\/(\d+)\/status$/)!;
      const id = parseInt(match[1], 10);
      const weekId = parseInt(match[2], 10);
      trpcResponse = await trpcClient.plans.updateWeekStatus.mutate({
        id,
        weekId,
        status: data.status,
        comment: data.comment,
        rescheduleDate: data.rescheduleDate,
        rescheduleRoom: data.rescheduleRoom,
        rescheduleNote: data.rescheduleNote,
      });
    } else if (url.match(/^\/plans\/(\d+)\/bulk-complete$/) && method === 'put') {
      const id = parseInt(url.match(/^\/plans\/(\d+)\/bulk-complete$/)![1], 10);
      trpcResponse = await trpcClient.plans.bulkComplete.mutate({ id, comment: data.comment });
    } else {
      return (defaultAdapter as any)(config);
    }

    return {
      data: trpcResponse,
      status: 200,
      statusText: 'OK',
      headers: config.headers as any,
      config,
      request: {},
    };
  } catch (err: any) {
    const axiosError = {
      message: err.message,
      response: {
        data: { message: err.message },
        status: err.shape?.data?.httpStatus || 500,
        statusText: 'Internal Server Error',
        headers: {},
        config,
      },
      config,
      isAxiosError: true,
    };
    throw axiosError;
  }
};

interface AppState {
  currentUser: User | null;
  token: string | null;
  theme: Theme;
  plans: Plan[];
  tableTemplates: TableTemplate[];
  isLoading: boolean;
  error: string | null;
  setCurrentUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setTheme: (theme: Theme) => void;
  setPlans: (plans: Plan[]) => void;
  addTableTemplate: (template: TableTemplate) => void;
  updateTableTemplate: (templateId: string, template: TableTemplate) => void;
  
  // Auth
  initAuth: () => Promise<void>;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;

  // API Actions
  fetchPlans: () => Promise<void>;
  updatePlanStatus: (planId: string, status: PlanStatus, comment?: string) => Promise<void>;
  createPlan: (plan: Partial<Plan> & Record<string, any>) => Promise<void>;
  updatePlan: (planId: string, payload: Partial<Plan> & Record<string, any>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  api: import('axios').AxiosInstance;
}

const mapUser = (u: any): User => {
  if (!u) return u;
  return {
    ...u,
    departmentId: u.department_id || u.departmentId,
    departmentName: u.department?.name || u.departmentName || '',
  };
};

const mapPlan = (p: any): Plan => {
  if (!p) return p;
  return {
    ...p,
    teacherId: p.user_id || p.teacherId,
    teacherName: p.teacher?.name || p.teacherName || 'Giảng viên',
    departmentId: p.department_id || p.departmentId,
    departmentName: p.department?.name || p.departmentName || '',
    items: (p.items || []).map((i: any) => {
      let parsed: any = {};
      if (typeof i.expected_result === 'string' && i.expected_result.startsWith('{')) {
        try { parsed = JSON.parse(i.expected_result); } catch (e) {}
      } else if (typeof i.expectedResult === 'string' && i.expectedResult.startsWith('{')) {
        try { parsed = JSON.parse(i.expectedResult); } catch (e) {}
      }
      return {
        ...i,
        ...parsed,
        plannedHours: i.planned_hours ?? i.plannedHours ?? parsed.plannedHours,
        expectedResult: i.expected_result ?? i.expectedResult,
      };
    }),
    weeks: (p.weeks || []).map((w: any) => {
      let parsed: any = {};
      if (typeof w.week_label === 'string' && w.week_label.startsWith('{')) {
        try { parsed = JSON.parse(w.week_label); } catch (e) {}
      } else if (typeof w.weekLabel === 'string' && w.weekLabel.startsWith('{')) {
        try { parsed = JSON.parse(w.weekLabel); } catch (e) {}
      }
      return {
        ...w,
        ...parsed,
        weekLabel: w.week_label ?? w.weekLabel,
        plannedHours: w.planned_hours ?? w.plannedHours ?? parsed.plannedHours,
        actualHours: w.actual_hours ?? w.actualHours ?? parsed.actualHours,
        busyNote: w.busy_note ?? w.busyNote ?? parsed.busyNote ?? null,
        weekStatus: w.status ?? w.weekStatus ?? 'PENDING',
        rescheduleDate: w.reschedule_date ?? w.rescheduleDate ?? null,
        rescheduleRoom: w.reschedule_room ?? w.rescheduleRoom ?? null,
        rescheduleNote: w.reschedule_note ?? w.rescheduleNote ?? null,
      };
    }),
    auditLog: p.audit_logs || p.auditLog || [],
    attachedFilePath: p.attached_file_path || p.attachedFilePath,
    attachedFileUrl: p.attached_file_path ? `/api/storage/${p.attached_file_path}` : p.attachedFileUrl,
    attachedFileName: p.attached_file_name || p.attachedFileName,
    attachments: (p.attachments || []).map((att: any) => ({
      ...att,
      url: `/api/storage/${att.path}`
    })),
    templateId: p.template_id || p.templateId || 'tpl-1',
    createdAt: p.created_at || p.createdAt || new Date().toISOString(),
    updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  token: localStorage.getItem('token'),
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  plans: [],
  tableTemplates: (() => {
    const saved = localStorage.getItem('tableTemplates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Force reset DEFAULT_TEMPLATES to ensure users get the blank state
        const updated = parsed.map((t: any) => {
           if (t.id === 'tpl-1' || t.id === 'tpl-2') {
               return DEFAULT_TEMPLATES.find(dt => dt.id === t.id) || t;
           }
           return t;
        });
        localStorage.setItem('tableTemplates', JSON.stringify(updated));
        return updated;
      } catch (e) {
        return DEFAULT_TEMPLATES;
      }
    }
    return DEFAULT_TEMPLATES;
  })(),
  isLoading: false,
  error: null,
  api,
  
  setCurrentUser: (user) => set({ currentUser: user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
    set({ token });
  },
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
    set({ theme });
  },
  setPlans: (plans) => set({ plans }),
  addTableTemplate: (template) => {
    const currentTemplates = get().tableTemplates;
    const newTemplates = [...currentTemplates, template];
    localStorage.setItem('tableTemplates', JSON.stringify(newTemplates));
    set({ tableTemplates: newTemplates });
  },
  updateTableTemplate: (templateId, template) => {
    const currentTemplates = get().tableTemplates.map(t => t.id === templateId ? template : t);
    localStorage.setItem('tableTemplates', JSON.stringify(currentTemplates));
    set({ tableTemplates: currentTemplates });
  },

  // Add Auth initialization logic
  initAuth: async () => {
    const { token } = get();
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const user = await trpcClient.auth.me.query();
        set({ currentUser: mapUser(user) });
      } catch (e) {
        get().setToken(null);
        get().setCurrentUser(null);
      }
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await trpcClient.auth.login.mutate(credentials);
      get().setToken(response.token);
      set({ currentUser: mapUser(response.user), isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Login failed', isLoading: false });
      throw error;
    }
  },

  register: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      await trpcClient.auth.register.mutate(data);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Register failed', isLoading: false });
      throw error;
    }
  },

  logout: () => {
    get().setToken(null);
    get().setCurrentUser(null);
  },

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await trpcClient.plans.list.query();
      set({ plans: plans.map(mapPlan), isLoading: false });
    } catch (error) {
      console.warn('tRPC plans.list failed or returned invalid data, falling back to mock data:', error);
      set({ 
        plans: generateMockPlans(), 
        isLoading: false, 
        error: 'Chế độ offline: Đang sử dụng dữ liệu mẫu' 
      });
    }
  },

  updatePlanStatus: async (planId, status, comment) => {
    const id = typeof planId === 'string' ? parseInt(planId, 10) : planId;
    const { plans, currentUser } = get();
    
    const updatedPlans = plans.map((p) => 
      p.id === String(planId)
        ? { 
            ...p, 
            status, 
            auditLog: [
              ...p.auditLog, 
              { 
                id: Math.random().toString(36).substr(2, 9), 
                actor: currentUser?.name || 'Hệ thống', 
                action: `Cập nhật trạng thái: ${status}`, 
                timestamp: new Date().toISOString(), 
                comment 
              }
            ] 
          } 
        : p
    );
    set({ plans: updatedPlans });

    try {
      await trpcClient.plans.updateStatus.mutate({ id, status: status as any, comment });
    } catch (error) {
      console.warn('Failed to update status on server, kept local change:', error);
    }
  },

  createPlan: async (newPlan) => {
    try {
      // 1. Handle file uploads using standard Axios REST endpoint first
      const newAttachments: any[] = [];
      if (newPlan.newAttachments && Array.isArray(newPlan.newAttachments)) {
        for (const file of newPlan.newAttachments) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await api.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          newAttachments.push({
            name: uploadRes.data.name,
            path: uploadRes.data.path,
          });
        }
      } else if (newPlan.attachedFile) {
        const formData = new FormData();
        formData.append('file', newPlan.attachedFile);
        const uploadRes = await api.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newAttachments.push({
          name: uploadRes.data.name,
          path: uploadRes.data.path,
        });
      }

      // 2. Perform tRPC mutation
      const payload = {
        title: newPlan.title || '',
        month: typeof newPlan.month === 'number' ? newPlan.month : parseInt(newPlan.month || '1', 10),
        year: typeof newPlan.year === 'number' ? newPlan.year : parseInt(newPlan.year || '2026', 10),
        templateId: newPlan.templateId,
        items: (newPlan.items || []).map((i: any) => ({
          ...i,
          id: i.id ? parseInt(i.id, 10) : undefined,
          locationId: i.locationId ? parseInt(i.locationId, 10) : null,
          equipmentId: i.equipmentId ? parseInt(i.equipmentId, 10) : null,
          executorId: i.executorId ? parseInt(i.executorId, 10) : null,
          mentorId: i.mentorId ? parseInt(i.mentorId, 10) : null,
        })),
        weeks: (newPlan.weeks || []).map((w: any) => ({
          ...w,
          id: w.id ? parseInt(w.id, 10) : undefined,
          status: w.status || w.weekStatus || 'PENDING',
        })),
        newAttachments,
      };

      const response = await trpcClient.plans.create.mutate(payload as any);
      set((state) => ({ plans: [mapPlan(response), ...state.plans] }));
    } catch (error) {
      console.error('Failed to create plan on server:', error);
      throw error;
    }
  },

  updatePlan: async (planId, payload) => {
    try {
      const id = typeof planId === 'string' ? parseInt(planId, 10) : planId;

      // 1. Handle file uploads first
      const newAttachments: any[] = [];
      if (payload.newAttachments && Array.isArray(payload.newAttachments)) {
        for (const file of payload.newAttachments) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await api.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          newAttachments.push({
            name: uploadRes.data.name,
            path: uploadRes.data.path,
          });
        }
      }

      // 2. Perform tRPC mutation
      const tRPCpayload = {
        id,
        ...(payload.title && { title: payload.title }),
        ...(payload.month && { month: typeof payload.month === 'number' ? payload.month : parseInt(payload.month as any, 10) }),
        ...(payload.year && { year: typeof payload.year === 'number' ? payload.year : parseInt(payload.year as any, 10) }),
        ...(payload.templateId && { templateId: payload.templateId }),
        items: (payload.items || []).map((i: any) => ({
          ...i,
          id: i.id ? parseInt(i.id, 10) : undefined,
          locationId: i.locationId ? parseInt(i.locationId, 10) : null,
          equipmentId: i.equipmentId ? parseInt(i.equipmentId, 10) : null,
          executorId: i.executorId ? parseInt(i.executorId, 10) : null,
          mentorId: i.mentorId ? parseInt(i.mentorId, 10) : null,
        })),
        weeks: (payload.weeks || []).map((w: any) => ({
          ...w,
          id: w.id ? parseInt(w.id, 10) : undefined,
          status: w.status || w.weekStatus || 'PENDING',
        })),
        ...(payload.keptAttachments && { keptAttachments: payload.keptAttachments }),
        ...(newAttachments.length && { newAttachments }),
      };

      const response = await trpcClient.plans.update.mutate(tRPCpayload as any);
      const updatedPlan = mapPlan(response);
      
      set((state) => ({
        plans: state.plans.map(p => p.id === String(planId) ? updatedPlan : p)
      }));
    } catch (error) {
      console.error('Failed to update plan on server:', error);
      throw error;
    }
  },

  deletePlan: async (planId: string) => {
    const id = typeof planId === 'string' ? parseInt(planId, 10) : planId;
    // Optimistic delete
    set((state) => ({ plans: state.plans.filter(p => p.id !== String(planId)) }));
    try {
      await trpcClient.plans.delete.mutate({ id });
    } catch (error) {
      console.error('Failed to delete plan on server:', error);
    }
  },
}));
