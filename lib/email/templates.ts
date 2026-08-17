export type TransactionalEmailMessage={subject:string;text:string}

const signature='\n\nOberlin Engineering Club'
const hello=(name:string)=>`Hi ${name.trim()||'there'},`

export function staffInvitationEmail(input:{displayName:string;activationUrl:string;expiresAt:string}):TransactionalEmailMessage{return{subject:'You are invited to the Oberlin Engineering Club staff portal',text:`${hello(input.displayName)}\n\nYou have been invited to help manage the Oberlin Engineering Club website. Use this secure link to activate your officer account and choose a password:\n\n${input.activationUrl}\n\nThis invitation expires ${new Date(input.expiresAt).toLocaleString('en-US',{timeZone:'America/New_York'})}.${signature}`}}
export function membershipVerificationEmail(input:{displayName:string;verificationUrl:string}):TransactionalEmailMessage{return{subject:'Verify your Oberlin email for the Engineering Club',text:`${hello(input.displayName)}\n\nVerify your @oberlin.edu address to continue your Oberlin Engineering Club membership request:\n\n${input.verificationUrl}\n\nAfter verification, an OEC Admin will review your request. You will not be able to enter the member portal until you are approved.${signature}`}}
export function membershipApprovedEmail(input:{displayName:string;activationUrl:string}):TransactionalEmailMessage{return{subject:'Your OEC member account is approved',text:`${hello(input.displayName)}\n\nYour Oberlin Engineering Club member account has been approved. Use this secure link to activate your account and set a password:\n\n${input.activationUrl}\n\nAfter activation you can save resources and opportunities, apply to projects, propose projects, find teammates, and use project workspaces.${signature}`}}
export function membershipRejectedEmail(input:{displayName:string;reviewNote?:string}):TransactionalEmailMessage{return{subject:'Update on your Oberlin Engineering Club membership request',text:`${hello(input.displayName)}\n\nYour OEC member-account request was not approved at this time.${input.reviewNote?.trim()?`\n\nReview note: ${input.reviewNote.trim()}`:''}\n\nYou can still browse the public OEC website and public resources.${signature}`}}
export function memberMagicLinkEmail(input:{displayName:string;magicUrl:string}):TransactionalEmailMessage{return{subject:'Your OEC member sign-in link',text:`${hello(input.displayName)}\n\nUse this secure link to sign in to your Oberlin Engineering Club member account:\n\n${input.magicUrl}\n\nIf you did not request this link, you can ignore this email.${signature}`}}
export function projectProposalReviewEmail(input:{memberName:string;projectTitle:string;decision:'APPROVED'|'REJECTED';feedback?:string;actionUrl?:string}):TransactionalEmailMessage{const approved=input.decision==='APPROVED';return{subject:approved?'Your OEC project proposal was approved':'Update on your OEC project proposal',text:`${hello(input.memberName)}\n\n${approved?`Your OEC project proposal “${input.projectTitle}” was approved and your team workspace is ready.`:`Your OEC project proposal “${input.projectTitle}” was reviewed and was not approved in its current form.`}${input.feedback?.trim()?`\n\nReview note: ${input.feedback.trim()}`:''}${input.actionUrl?`\n\n${approved?'Open your workspace':'Review your proposal'}: ${input.actionUrl}`:''}${signature}`}}
export function projectTeamInvitationEmail(input:{inviteeName:string;projectTitle:string;inviterName:string;message?:string;actionUrl:string}):TransactionalEmailMessage{return{subject:`Invitation to join ${input.projectTitle}`,text:`${hello(input.inviteeName)}\n\n${input.inviterName} invited you to join the OEC project “${input.projectTitle}”.${input.message?.trim()?`\n\nMessage: ${input.message.trim()}`:''}\n\nReview the invitation and accept or decline it here:\n${input.actionUrl}${signature}`}}
export const projectInvitationEmail=projectTeamInvitationEmail
export function projectApplicationDecisionEmail(input:{memberName:string;projectTitle:string;decision:'ACCEPTED'|'REJECTED';actionUrl:string;note?:string}):TransactionalEmailMessage{const accepted=input.decision==='ACCEPTED';return{subject:accepted?`Your application to ${input.projectTitle} was accepted`:`Update on your application to ${input.projectTitle}`,text:`${hello(input.memberName)}\n\n${accepted?`Your application to “${input.projectTitle}” was accepted. You are now part of the project team.`:`Your application to “${input.projectTitle}” was not accepted at this time.`}${input.note?.trim()?`\n\nProject Lead note: ${input.note.trim()}`:''}\n\n${accepted?'Open your project workspace':'View your applications'}: ${input.actionUrl}${signature}`}}
export function projectUpdateReviewEmail(input:{memberName:string;projectTitle:string;updateTitle:string;decision:'APPROVED_FOR_PUBLISH'|'CHANGES_REQUESTED'|'REJECTED';feedback?:string;actionUrl:string}):TransactionalEmailMessage{const state=input.decision==='APPROVED_FOR_PUBLISH'?'approved for public publishing':input.decision==='CHANGES_REQUESTED'?'needs changes before it can be published':'was not approved for publishing';return{subject:`Review complete: ${input.updateTitle}`,text:`${hello(input.memberName)}\n\nYour update “${input.updateTitle}” for “${input.projectTitle}” ${state}.${input.feedback?.trim()?`\n\nReview note: ${input.feedback.trim()}`:''}\n\nOpen the project workspace: ${input.actionUrl}${signature}`}}


export function memberPasswordResetEmail(input:{displayName:string;resetUrl:string}):TransactionalEmailMessage{return{subject:'Reset your OEC member password',text:`${hello(input.displayName)}

Use this secure link to choose a new password for your approved Oberlin Engineering Club member account:

${input.resetUrl}

If you did not request a password reset, you can ignore this email.${signature}`}}
export function staffPasswordResetEmail(input:{displayName:string;resetUrl:string}):TransactionalEmailMessage{return{subject:'Reset your OEC officer password',text:`${hello(input.displayName)}

Use this secure link to choose a new password for your active Oberlin Engineering Club officer account:

${input.resetUrl}

If you did not request a password reset, you can ignore this email.${signature}`}}
