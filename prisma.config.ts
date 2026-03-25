import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'server/prisma/schema.prisma',
  migrations: {
    path: 'server/prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./server/data/noteflow.db',
  },
})
