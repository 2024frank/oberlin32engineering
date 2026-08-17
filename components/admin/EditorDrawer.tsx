'use client'
import { Dialog } from '@/components/ui/Dialog'
export function EditorDrawer({open,title,description,onClose,children}:{open:boolean;title:string;description?:string;onClose:()=>void;children:React.ReactNode}){return <Dialog open={open} title={title} description={description} onClose={onClose}><div className="editor-drawer__body">{children}</div></Dialog>}
