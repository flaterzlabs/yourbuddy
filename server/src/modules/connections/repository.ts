import { pool } from "../../db/pool.js";

export interface ConnectionRow {
  id: string;
  caregiver_id: string;
  student_id: string;
  status: "pending" | "active" | "blocked";
  created_at: string;
  updated_at: string;
}

export async function listConnectionsForCaregiver(caregiverId: string) {
  const query = `
    select
      c.*,
      json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'caregiver_code', p.caregiver_code,
        'student_code', p.student_code,
        'role', u.role,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      ) as student_profile,
      row_to_json(t) as thrive_sprite
    from connections c
    join profiles p on p.user_id = c.student_id
    join users u on u.id = p.user_id
    left join thrive_sprites t on t.student_id = c.student_id
    where c.caregiver_id = $1
      and c.status = 'active'
    order by c.created_at desc
  `;
  const result = await pool.query(query, [caregiverId]);
  return result.rows;
}

export async function listConnectionsForStudent(studentId: string) {
  const query = `
    select
      c.*,
      json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'username', p.username,
        'caregiver_code', p.caregiver_code,
        'student_code', p.student_code,
        'role', u.role,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      ) as caregiver_profile
    from connections c
    join profiles p on p.user_id = c.caregiver_id
    join users u on u.id = p.user_id
    where c.student_id = $1
      and c.status = 'active'
    order by c.created_at desc
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows;
}

export async function findStudentByCode(code: string) {
  const query = `
    select p.user_id, p.username, p.student_code
    from profiles p
    where upper(p.student_code) = upper($1)
    limit 1
  `;
  const result = await pool.query(query, [code]);
  return result.rows[0] ?? null;
}

export async function findCaregiverByCode(code: string) {
  const query = `
    select p.user_id, p.username, p.caregiver_code
    from profiles p
    where upper(p.caregiver_code) = upper($1)
    limit 1
  `;
  const result = await pool.query(query, [code]);
  return result.rows[0] ?? null;
}

export async function upsertConnection({
  caregiverId,
  studentId,
}: {
  caregiverId: string;
  studentId: string;
}) {
  const query = `
    insert into connections (caregiver_id, student_id, status)
    values ($1, $2, 'active')
    on conflict (caregiver_id, student_id) do update
    set status = excluded.status,
        updated_at = now()
    returning *
  `;
  const values = [caregiverId, studentId];
  const result = await pool.query<ConnectionRow>(query, values);
  return result.rows[0];
}
