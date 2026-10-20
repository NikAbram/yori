import { PrismaNeonHttp } from "@prisma/adapter-neon";

export function createNeonHttpAdapter(connectionString: string) {
  return new PrismaNeonHttp(connectionString, {});
}
