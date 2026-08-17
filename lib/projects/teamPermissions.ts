export function canManageProjectTeam(input:{memberId:string;projectId:string;leadProjectIds:string[]}){return Boolean(input.memberId&&input.projectId&&input.leadProjectIds.includes(input.projectId))}
export function assertInvitableMember(member:{status:string}){if(member.status!=='ACTIVE')throw new Error('MEMBER_NOT_INVITABLE')}
export function normalizeTeamDecision(value:string){if(value!=='ACCEPT'&&value!=='REJECT'&&value!=='DECLINE')throw new Error('TEAM_DECISION_INVALID');return value as 'ACCEPT'|'REJECT'|'DECLINE'}
