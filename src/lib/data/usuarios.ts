import { prisma } from "@/lib/prisma";

export function countUsuarios() {
  return prisma.usuario.count();
}

export function findUsuarioByEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email } });
}

export function createUsuario(data: { email: string; passwordHash: string; nombre?: string }) {
  return prisma.usuario.create({ data });
}
