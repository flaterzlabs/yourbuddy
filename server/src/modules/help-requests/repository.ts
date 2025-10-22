import { pool } from "../../db/pool.js";

export interface HelpRequestRow {
  id: string;
  student_id: string;
  message: string | null;
  urgency: "ok" | "attention" | "urgent" | null;
  status: "open" | "answered" | "closed" | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listStudentRequests(studentId: string) {
  const query = `
    select * from help_requests
    where student_id = $1
    order by created_at desc
  `;
  const result = await pool.query<HelpRequestRow>(query, [studentId]);
  return result.rows;
}

export async function listCaregiverRequests(caregiverId: string) {
  const query = `
    select
      hr.*,
      json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'caregiver_code', p.caregiver_code,
        'student_code', p.student_code,
        'role', u.role,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      ) as student_profile
    from help_requests hr
    join connections c on c.student_id = hr.student_id
    join profiles p on p.user_id = hr.student_id
    join users u on u.id = p.user_id
    where c.caregiver_id = $1
    order by hr.created_at desc
  `;
  const result = await pool.query(query, [caregiverId]);
  return result.rows;
}

export async function listCaregiversForStudent(studentId: string) {
  const query = `
    select caregiver_id
    from connections
    where student_id = $1
      and status = 'active'
  `;
  const result = await pool.query<{ caregiver_id: string }>(query, [studentId]);
  return result.rows.map((row) => row.caregiver_id);
}

export async function createHelpRequest(input: {
  studentId: string;
  message?: string | null;
  urgency?: "ok" | "attention" | "urgent" | null;
}) {
  const query = `
    insert into help_requests (student_id, message, urgency, status)
    values ($1, $2, $3, 'open')
    returning *
  `;
  const values = [input.studentId, input.message ?? null, input.urgency ?? "ok"];
  const result = await pool.query<HelpRequestRow>(query, values);
  return result.rows[0];
}

export async function updateHelpRequestStatus(input: {
  requestId: string;
  status: "answered" | "closed";
  resolvedBy: string;
}) {
  const query = `
    update help_requests
    set status = $2,
        resolved_by = $3,
        resolved_at = now(),
        updated_at = now()
    where id = $1
    returning *
  `;
  const values = [input.requestId, input.status, input.resolvedBy];
  const result = await pool.query<HelpRequestRow>(query, values);
  return result.rows[0];
}
