import { and, eq, like, or } from "drizzle-orm";
import { db } from "./index";
import {
  userRoles,
  users,
  type User,
  type UserRole,
} from "./schema/users";

export type { User, UserRole };

export async function findUserByFirebaseUid(uid: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, uid))
    .limit(1);
  return user ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function createUser(input: {
  firebaseUid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}): Promise<User> {
  const [created] = await db
    .insert(users)
    .values({
      firebaseUid: input.firebaseUid,
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      phone: input.phone ?? null,
    })
    .returning();
  return created;
}

export async function updateUser(
  id: number,
  changes: Partial<{
    name: string;
    email: string;
    role: UserRole;
    phone: string | null;
    isActive: boolean;
  }>,
): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

export async function listUsers(
  search?: string,
  role?: UserRole,
): Promise<User[]> {
  const filters = [];
  if (role) filters.push(eq(users.role, role));
  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(like(users.name, pattern), like(users.email, pattern)));
  }

  return db
    .select()
    .from(users)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(users.name);
}

export { userRoles };
