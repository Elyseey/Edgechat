import { createSession, verifyPassword } from './auth.js';
import { getUserByUsername } from './data/users.js';
import { isUserDisabled } from './user-status.js';

export async function loginWithPassword(env, username: string, password: string) {
  const user = await getUserByUsername(env.DB, username);
  if (!user || isUserDisabled(user)) return null;
  if (!await verifyPassword(password, user.password_hash, user.password_salt)) return null;
  return createSession(env, user);
}
