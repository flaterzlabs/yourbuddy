const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(length: number) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * CHARSET.length);
    result += CHARSET[index];
  }
  return result;
}

export function generateStudentCode() {
  return `STU-${randomString(3)}-${randomString(3)}`;
}

export function generateCaregiverCode() {
  return `CAR-${randomString(3)}-${randomString(3)}`;
}
