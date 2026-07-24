import type { DecodedIdToken } from "firebase-admin/auth";
import type { User, UserRole } from "@workspace/db";
import {
  createUser as createDbUser,
  findUserByFirebaseUid as findDbUserByFirebaseUid,
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

function roleFromClaims(claims: DecodedIdToken): UserRole {
  const claimRole = claims.role;
  if (
    claimRole === "admin" ||
    claimRole === "sales" ||
    claimRole === "finance" ||
    claimRole === "warehouse" ||
    claimRole === "engineer"
  ) {
    return claimRole;
  }
  return claims.admin === true ? "admin" : "sales";
}

export async function getOrCreateUserForToken(
  decoded: DecodedIdToken,
): Promise<User> {
  const existing = await findDbUserByFirebaseUid(decoded.uid);
  if (existing) return existing;

  return createDbUser({
    firebaseUid: decoded.uid,
    name: decoded.name ?? decoded.email ?? decoded.uid,
    email: decoded.email ?? `${decoded.uid}@firebase.local`,
    role: roleFromClaims(decoded),
  });
}