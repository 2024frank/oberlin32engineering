export type PrivatePortal='member'|'admin'

export function portalLoginPath(portal:PrivatePortal){
  return portal==='member'?'/member/login':'/admin/login'
}
