@'
export async function getUserForCodeSentryTest(id: string, db: any, cache: Map<string, string>) {
  const query = "SELECT * FROM users WHERE id = " + id;
  const user = await db.query(query);
  const name = cache.get(id).trim();
  console.log(name);
  return user;
}
'@ | Set-Content src/codesentry-test.ts