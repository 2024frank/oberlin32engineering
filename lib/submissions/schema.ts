import { z } from 'zod'
export const submissionTypes=['join_club','join_project','propose_project','leadership_interest','event_volunteer','partnership_inquiry'] as const
export const submissionSchema=z.object({
  type:z.enum(submissionTypes),fullName:z.string().trim().min(2,'Please enter your name.').max(160),email:z.string().trim().email('Enter a valid email address.').max(320),
  major:z.string().max(160).default(''),classYear:z.string().max(40).default(''),interests:z.string().max(1200).default(''),project:z.string().max(200).default(''),
  projectIdea:z.string().max(5000).default(''),organization:z.string().max(200).default(''),message:z.string().max(5000).default(''),
  honeypot:z.string().max(200).default(''),formStartedAt:z.number().int().positive()
}).superRefine((v,ctx)=>{if(v.type==='join_project'&&!v.project.trim())ctx.addIssue({code:'custom',path:['project'],message:'Choose or name the project you are interested in.'});if(v.type==='propose_project'&&!v.projectIdea.trim())ctx.addIssue({code:'custom',path:['projectIdea'],message:'Tell us what you want to build or investigate.'});if(v.type==='partnership_inquiry'&&!v.organization.trim())ctx.addIssue({code:'custom',path:['organization'],message:'Enter your organization or group.'})})
export type PublicSubmission=z.infer<typeof submissionSchema>
export function isSpam({honeypot,formStartedAt}:{honeypot:string;formStartedAt:number},now=Date.now()){return Boolean(honeypot.trim())||now-formStartedAt<1500}
export function sanitizedPayload(v:PublicSubmission){const{honeypot:_,formStartedAt:__,type,fullName,email,...payload}=v;return{type,fullName,email,payload}}
