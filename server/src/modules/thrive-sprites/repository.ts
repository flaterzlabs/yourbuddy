import { pool } from "../../db/pool.js";

export async function getSprite(studentId: string) {
  const query = `
    select *
    from thrive_sprites
    where student_id = $1
    limit 1
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows[0] ?? null;
}

export async function upsertSprite(input: {
  studentId: string;
  imageUrl: string;
  options?: Record<string, unknown> | null;
}) {
  const query = `
    insert into thrive_sprites (student_id, image_url, options)
    values ($1, $2, $3)
    on conflict (student_id)
    do update set
      image_url = excluded.image_url,
      options = excluded.options,
      updated_at = now()
    returning *
  `;
  const values = [input.studentId, input.imageUrl, input.options ?? null];
  const result = await pool.query(query, values);
  return result.rows[0];
}
