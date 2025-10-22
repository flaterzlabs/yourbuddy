import { pool } from "../../db/pool.js";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: "student" | "caregiver" | "educator";
}

export async function findUserByEmail(email: string) {
  const query = `
    select id, email, password_hash, role
    from users
    where lower(email) = lower($1)
    limit 1
  `;
  const result = await pool.query<UserRecord>(query, [email]);
  return result.rows[0] ?? null;
}

export async function findUserByUsername(username: string) {
  const query = `
    select u.id, u.email, u.password_hash, u.role
    from users u
    join profiles p on p.user_id = u.id
    where lower(p.username) = lower($1)
    limit 1
  `;
  const result = await pool.query<UserRecord>(query, [username]);
  return result.rows[0] ?? null;
}

export async function findUserByEmailOrUsername(identifier: string) {
  const query = `
    select u.id, u.email, u.password_hash, u.role
    from users u
    left join profiles p on p.user_id = u.id
    where lower(u.email) = lower($1) or lower(p.username) = lower($1)
    limit 1
  `;
  const result = await pool.query<UserRecord>(query, [identifier]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const query = `
    select id, email, password_hash, role
    from users
    where id = $1
    limit 1
  `;
  const result = await pool.query<UserRecord>(query, [id]);
  return result.rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: "student" | "caregiver" | "educator";
}) {
  const query = `
    insert into users (email, password_hash, role)
    values ($1, $2, $3)
    returning id, email, role
  `;
  const values = [input.email, input.passwordHash, input.role];
  const result = await pool.query(query, values);
  return result.rows[0] as { id: string; email: string; role: string };
}

export async function createProfileForUser(input: {
  userId: string;
  username: string;
  role: "student" | "caregiver" | "educator";
  caregiverCode?: string | null;
  studentCode?: string | null;
}) {
  const query = `
    insert into profiles (user_id, username, caregiver_code, student_code)
    values ($1, $2, $3, $4)
    returning *
  `;
  const values = [input.userId, input.username, input.caregiverCode ?? null, input.studentCode ?? null];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getProfileWithSprite(userId: string) {
  const query = `
    select
      p.*,
      u.role,
      t.id as sprite_id,
      t.image_url,
      t.options
    from profiles p
    join users u on u.id = p.user_id
    left join thrive_sprites t on t.student_id = p.user_id
    where p.user_id = $1
    limit 1
  `;
  const result = await pool.query(query, [userId]);
  if (!result.rows[0]) {
    return null;
  }
  const row = result.rows[0];
  return {
    profile: {
      id: row.id,
      user_id: row.user_id,
      username: row.username,
      caregiver_code: row.caregiver_code,
      student_code: row.student_code,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    sprite: row.sprite_id
      ? {
          id: row.sprite_id,
          student_id: row.user_id,
          image_url: row.image_url,
          options: row.options,
        }
      : null,
  };
}

export async function createPasswordResetToken(input: { userId: string; token: string; expiresAt: Date }) {
  const query = `
    insert into password_resets (user_id, token, expires_at)
    values ($1, $2, $3)
    returning *
  `;
  const values = [input.userId, input.token, input.expiresAt.toISOString()];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function findValidPasswordResetToken(token: string) {
  const query = `
    select *
    from password_resets
    where token = $1
      and used_at is null
      and expires_at > now()
    limit 1
  `;
  const result = await pool.query(query, [token]);
  return result.rows[0] ?? null;
}

export async function markPasswordResetUsed(tokenId: string) {
  const query = `
    update password_resets
    set used_at = now()
    where id = $1
  `;
  await pool.query(query, [tokenId]);
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const query = `
    update users
    set password_hash = $2,
        updated_at = now()
    where id = $1
  `;
  await pool.query(query, [userId, passwordHash]);
}
