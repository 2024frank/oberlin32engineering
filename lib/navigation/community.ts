export type CommunityNavItem={label:string;href:string}
export const memberNavigation:CommunityNavItem[]=[
  {label:'Dashboard',href:'/member'},
  {label:'My Profile',href:'/member/profile'},
  {label:'Member Directory',href:'/member/directory'},
  {label:'Saved',href:'/member/saved'},
  {label:'My Applications',href:'/member/applications'},
  {label:'My Teams',href:'/member/teams'},
  {label:'Project Invitations',href:'/member/invitations'},
  {label:'Project Proposals',href:'/member/proposals'},
  {label:'Notifications',href:'/member/notifications'},
]
export const adminCommunityNavigation:CommunityNavItem[]=[
  {label:'Member Applications',href:'/admin/member-applications'},
  {label:'Members',href:'/admin/members'},
  {label:'Project Proposals',href:'/admin/project-proposals'},
  {label:'Project Applications',href:'/admin/project-applications'},
  {label:'Staff / Roles / Invitations',href:'/admin/users'},
]
