import { PrismaClient, UserRole, UserStatus, Gender, PlanStatus, PlanItemType, WeekStatus, ActivityType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Laravel data import...');

  const sqlPath = path.resolve(process.cwd(), '../../saodo_equipment_1.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  const inserts = parseInserts(sqlContent);
  
  console.log('📋 Tables found:', Object.keys(inserts).map(k => `${k}(${inserts[k].length})`).join(', '));

  await importDepartments(inserts.departments);
  await importUsers(inserts.users);
  await importLocations(inserts.locations);
  await importEquipment(inserts.equipment);
  await importPlans(inserts.plans);
  await importPlanItems(inserts.plan_items);
  await importPlanWeeks(inserts.plan_weeks);
  await importAuditLogs(inserts.audit_logs);
  await importUserActivities(inserts.user_activities);

  console.log('✅ Import completed!');
}

function parseInserts(sql: string) {
  const result: Record<string, any[]> = {};
  const insertRegex = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*(.+?);/gs;
  
  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const table = match[1];
    const columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
    const valuesStr = match[3].trim();
    
    const rows = parseValues(valuesStr, columns.length);
    result[table] = rows.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }
  return result;
}

function parseValues(valuesStr: string, colCount: number): any[][] {
  const rows: any[][] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let depth = 0;
  const currentRow: any[] = [];
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const nextChar = valuesStr[i + 1];
    
    if ((char === '"' || char === "'") && !inString) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (char === stringChar && inString && nextChar !== stringChar) {
      inString = false;
      current += char;
    } else if (char === stringChar && inString && nextChar === stringChar) {
      current += char + char;
      i++;
    } else if (char === '(' && !inString) {
      depth++;
      if (depth === 1) continue;
      current += char;
    } else if (char === ')' && !inString) {
      depth--;
      if (depth === 0) {
        currentRow.push(parseValue(current.trim()));
        if (currentRow.length === colCount) {
          rows.push([...currentRow]);
          currentRow.length = 0;
        }
        current = '';
        continue;
      }
      current += char;
    } else if (char === ',' && !inString && depth === 1) {
      currentRow.push(parseValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }
  return rows;
}

function parseValue(val: string): any {
  val = val.trim();
  if (val === 'NULL' || val === 'null') return null;
  if (val === '[]' || val === '{}') return val;
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  if (/^\d+$/.test(val)) return parseInt(val);
  if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}

function mapRole(role: string): UserRole {
  const map: Record<string, UserRole> = {
    'ADMIN': 'ADMIN',
    'BOARD': 'BOARD',
    'QC': 'QC',
    'DEPT_HEAD': 'DEPT_HEAD',
    'TEACHER': 'TEACHER',
  };
  return map[role] || 'TEACHER';
}

function mapStatus(status: string): UserStatus {
  const map: Record<string, UserStatus> = {
    'ACTIVE': 'ACTIVE',
    'PENDING': 'PENDING',
    'REJECTED': 'REJECTED',
  };
  return map[status] || 'ACTIVE';
}

function mapGender(gender: string | null): Gender | null {
  if (!gender) return null;
  const map: Record<string, Gender> = {
    'Nam': 'Nam',
    'Nữ': 'Nu',
    'Nu': 'Nu',
  };
  return map[gender] || null;
}

function mapPlanStatus(status: string): PlanStatus {
  const map: Record<string, PlanStatus> = {
    'DRAFT': 'DRAFT',
    'SUBMITTED': 'SUBMITTED',
    'DEPT_APPROVED_TO_BGH': 'DEPT_APPROVED_TO_BGH',
    'COMPLETED': 'COMPLETED',
  };
  return map[status] || 'DRAFT';
}

function mapPlanItemType(type: string): PlanItemType {
  return type === 'STUDENT' ? 'STUDENT' : 'TEACHER';
}

function mapWeekStatus(status: string | null): WeekStatus {
  if (!status) return 'PENDING';
  const map: Record<string, WeekStatus> = {
    'PENDING': 'PENDING',
    'COMPLETED': 'COMPLETED',
    'RESCHEDULED': 'RESCHEDULED',
  };
  return map[status] || 'PENDING';
}

function mapActivityType(type: string): ActivityType {
  const map: Record<string, ActivityType> = {
    'login': 'login',
    'logout': 'logout',
    'create_plan': 'create_plan',
    'update_plan': 'update_plan',
    'delete_plan': 'delete_plan',
    'change_password': 'change_password',
    'request_update_profile': 'request_update_profile',
    'update_profile': 'update_profile',
  };
  return map[type] || 'login';
}

async function importDepartments(data: any[]) {
  console.log(`📦 Importing ${data.length} departments...`);
  for (const d of data) {
    await prisma.department.upsert({
      where: { id: Number(d.id) },
      update: { name: d.name, code: d.code },
      create: { id: Number(d.id), name: d.name, code: d.code },
    });
  }
}

async function importUsers(data: any[]) {
  console.log(`👥 Importing ${data.length} users...`);
  for (const u of data) {
    await prisma.user.upsert({
      where: { id: Number(u.id) },
      update: {
        name: u.name,
        email: u.email,
        password: u.password,
        role: mapRole(u.role),
        status: mapStatus(u.status),
        departmentId: u.department_id ? Number(u.department_id) : null,
        avatar: u.avatar || null,
        dob: u.dob ? new Date(u.dob) : null,
        gender: mapGender(u.gender),
        contactEmail: u.contact_email || null,
        pendingProfile: u.pending_profile ? JSON.parse(u.pending_profile) : null,
      },
      create: {
        id: Number(u.id),
        name: u.name,
        email: u.email,
        password: u.password,
        role: mapRole(u.role),
        status: mapStatus(u.status),
        departmentId: u.department_id ? Number(u.department_id) : null,
        avatar: u.avatar || null,
        dob: u.dob ? new Date(u.dob) : null,
        gender: mapGender(u.gender),
        contactEmail: u.contact_email || null,
        pendingProfile: u.pending_profile ? JSON.parse(u.pending_profile) : null,
      },
    });
  }
}

async function importLocations(data: any[]) {
  console.log(`📍 Importing ${data.length} locations...`);
  for (const l of data) {
    await prisma.location.upsert({
      where: { id: Number(l.id) },
      update: { name: l.name, code: l.code || null },
      create: { id: Number(l.id), name: l.name, code: l.code || null },
    });
  }
}

async function importEquipment(data: any[]) {
  console.log(`🔧 Importing ${data.length} equipment...`);
  for (const e of data) {
    await prisma.equipment.upsert({
      where: { id: Number(e.id) },
      update: {
        name: e.name,
        code: e.code || null,
        yearOfUse: e.year_of_use ? Number(e.year_of_use) : null,
        locationId: e.location_id ? Number(e.location_id) : null,
      },
      create: {
        id: Number(e.id),
        name: e.name,
        code: e.code || null,
        yearOfUse: e.year_of_use ? Number(e.year_of_use) : null,
        locationId: e.location_id ? Number(e.location_id) : null,
      },
    });
  }
}

async function importPlans(data: any[]) {
  console.log(`📋 Importing ${data.length} plans...`);
  for (const p of data) {
    await prisma.plan.upsert({
      where: { id: Number(p.id) },
      update: {
        code: p.code,
        title: p.title,
        month: Number(p.month),
        year: Number(p.year),
        userId: Number(p.user_id),
        departmentId: Number(p.department_id),
        status: mapPlanStatus(p.status),
        score: p.score ? Number(p.score) : null,
        feedback: p.feedback || null,
        attachedFilePath: p.attached_file_path || null,
        attachedFileName: p.attached_file_name || null,
        attachments: p.attachments ? JSON.parse(p.attachments) : null,
      },
      create: {
        id: Number(p.id),
        code: p.code,
        title: p.title,
        month: Number(p.month),
        year: Number(p.year),
        userId: Number(p.user_id),
        departmentId: Number(p.department_id),
        status: mapPlanStatus(p.status),
        score: p.score ? Number(p.score) : null,
        feedback: p.feedback || null,
        attachedFilePath: p.attached_file_path || null,
        attachedFileName: p.attached_file_name || null,
        attachments: p.attachments ? JSON.parse(p.attachments) : null,
        templateId: 'tpl-1',
      },
    });
  }
}

async function importPlanItems(data: any[]) {
  console.log(`📝 Importing ${data.length} plan items...`);
  for (const item of data) {
    let expectedResult = item.expected_result;
    try {
      expectedResult = expectedResult ? JSON.parse(expectedResult) : null;
    } catch {
      // Keep as string if not valid JSON
    }

    await prisma.planItem.upsert({
      where: { id: Number(item.id) },
      update: {
        planId: Number(item.plan_id),
        topic: item.topic,
        locationId: item.location_id ? Number(item.location_id) : null,
        equipmentId: item.equipment_id ? Number(item.equipment_id) : null,
        equipmentNameManual: item.equipment_name_manual || null,
        equipmentYearManual: item.equipment_year_manual ? Number(item.equipment_year_manual) : null,
        executorId: item.executor_id ? Number(item.executor_id) : null,
        mentorId: item.mentor_id ? Number(item.mentor_id) : null,
        timeRange: item.time_range || null,
        expectedResult: expectedResult,
        plannedHours: Number(item.planned_hours || 0),
        type: mapPlanItemType(item.type),
      },
      create: {
        id: Number(item.id),
        planId: Number(item.plan_id),
        topic: item.topic,
        locationId: item.location_id ? Number(item.location_id) : null,
        equipmentId: item.equipment_id ? Number(item.equipment_id) : null,
        equipmentNameManual: item.equipment_name_manual || null,
        equipmentYearManual: item.equipment_year_manual ? Number(item.equipment_year_manual) : null,
        executorId: item.executor_id ? Number(item.executor_id) : null,
        mentorId: item.mentor_id ? Number(item.mentor_id) : null,
        timeRange: item.time_range || null,
        expectedResult: expectedResult,
        plannedHours: Number(item.planned_hours || 0),
        type: mapPlanItemType(item.type),
      },
    });
  }
}

async function importPlanWeeks(data: any[]) {
  console.log(`📅 Importing ${data.length} plan weeks...`);
  for (const w of data) {
    let weekLabel = w.week_label;
    try {
      weekLabel = JSON.parse(weekLabel);
    } catch {
      // Keep as string
    }

    await prisma.planWeek.upsert({
      where: { id: Number(w.id) },
      update: {
        planId: Number(w.plan_id),
        userId: Number(w.user_id),
        weekLabel: typeof weekLabel === 'object' ? JSON.stringify(weekLabel) : weekLabel,
        plannedHours: Number(w.planned_hours || 0),
        actualHours: w.actual_hours ? Number(w.actual_hours) : null,
        status: mapWeekStatus(w.status),
      },
      create: {
        id: Number(w.id),
        planId: Number(w.plan_id),
        userId: Number(w.user_id),
        weekLabel: typeof weekLabel === 'object' ? JSON.stringify(weekLabel) : weekLabel,
        plannedHours: Number(w.planned_hours || 0),
        actualHours: w.actual_hours ? Number(w.actual_hours) : null,
        status: mapWeekStatus(w.status),
      },
    });
  }
}

async function importAuditLogs(data: any[]) {
  console.log(`📝 Importing ${data.length} audit logs...`);
  for (const a of data) {
    await prisma.auditLog.upsert({
      where: { id: Number(a.id) },
      update: {
        planId: Number(a.plan_id),
        userId: Number(a.user_id),
        action: a.action,
        comment: a.comment || null,
        timestamp: new Date(a.timestamp),
      },
      create: {
        id: Number(a.id),
        planId: Number(a.plan_id),
        userId: Number(a.user_id),
        action: a.action,
        comment: a.comment || null,
        timestamp: new Date(a.timestamp),
      },
    });
  }
}

async function importUserActivities(data: any[]) {
  console.log(`📊 Importing ${data.length} user activities...`);
  for (const a of data) {
    await prisma.userActivity.upsert({
      where: { id: Number(a.id) },
      update: {
        userId: Number(a.user_id),
        type: mapActivityType(a.type),
        description: a.description || null,
      },
      create: {
        id: Number(a.id),
        userId: Number(a.user_id),
        type: mapActivityType(a.type),
        description: a.description || null,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });