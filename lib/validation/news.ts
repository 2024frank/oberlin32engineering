import { z } from 'zod'
export const newsPublishSchema=z.object({slug:z.string().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().min(1).max(180),excerpt:z.string().max(700).default(''),body:z.string().min(1).max(20000),author:z.string().max(160).default('Oberlin Engineering Club'),coverMediaId:z.string().uuid().nullable().default(null),featured:z.boolean().default(false)})
