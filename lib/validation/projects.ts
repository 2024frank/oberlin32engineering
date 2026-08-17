import { z } from 'zod'
export const projectStatusSchema=z.enum(['proposed','open_for_interest','scoping','active','complete'])
export const projectPublishSchema=z.object({
  slug:z.string().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title:z.string().min(1).max(180), summary:z.string().max(700).default(''),
  problem:z.string().max(3000).default(''), goal:z.string().max(3000).default(''), discipline:z.string().max(100).default(''), disciplines:z.array(z.string().max(100)).max(12).default([]),
  status:projectStatusSchema.default('proposed'), recruiting:z.boolean().default(false), skills:z.array(z.string().max(80)).max(30).default([]),
  leadName:z.string().max(160).default(''), nextStep:z.string().max(700).default(''), teamNames:z.array(z.string().max(160)).max(60).default([]), timeline:z.array(z.record(z.string(),z.unknown())).max(40).default([]),
  coverMediaId:z.string().uuid().nullable().default(null), externalUrl:z.string().url().or(z.literal('')).default(''), githubUrl:z.string().url().or(z.literal('')).default(''), sortOrder:z.number().int().min(0).max(10000).default(100)
}).superRefine((value,ctx)=>{if(value.status==='active'&&(!value.leadName.trim()||!value.nextStep.trim()))ctx.addIssue({code:'custom',message:'Active projects require a lead and next step'})})
