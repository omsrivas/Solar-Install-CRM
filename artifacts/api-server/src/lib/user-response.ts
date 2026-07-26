import type { DecodedIdToken } from "firebase-admin/auth";
import type { User, UserRole } from "@workspace/db";
import {
  createUser as createDbUser,
  findUserByFirebaseUid as findDbUserByFirebaseUid,
  updateUser as updateDbUser,
} from "@workspace/db";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: User["role"];
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const createUser = createDbUser;
export const findUserByFirebaseUid = findDbUserByFirebaseUid;
export const updateUser = updateDbUser;

/**
 * Look up the CRM user for a verified Firebase token.
 * Returns null if the Firebase account has no corresponding CRM user record —
 * the caller must decide how to handle unregistered accounts (e.g. 403).
 *
 * Auto-creation has been removed intentionally: all CRM users must be
 * created explicitly by an admin via the Users page so they get the
 * correct role from the start.
 */
export async function getOrCreateUserForToken(
  decoded: DecodedIdToken,
): Promise<User | null> {
  return findDbUserByFirebaseUid(decoded.uid);
}
