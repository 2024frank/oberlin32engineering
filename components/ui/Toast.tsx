'use client'
import { createContext,useCallback,useContext,useMemo,useState } from 'react'
type Toast={id:number;message:string;kind:'success'|'error'};const ToastContext=createContext<((message:string,kind?:Toast['kind'])=>void)|null>(null)
export function ToastProvider({children}:{children:React.ReactNode}){const[items,setItems]=useState<Toast[]>([]);const push=useCallback((message:string,kind:Toast['kind']='success')=>{const id=Date.now()+Math.random();setItems(x=>[...x,{id,message,kind}]);setTimeout(()=>setItems(x=>x.filter(t=>t.id!==id)),4000)},[]);const value=useMemo(()=>push,[push]);return <ToastContext.Provider value={value}>{children}<div className="toast-region" role="status" aria-live="polite">{items.map(t=><div className={`toast toast--${t.kind}`} key={t.id}>{t.message}</div>)}</div></ToastContext.Provider>}
export function useToast(){const value=useContext(ToastContext);if(!value)throw new Error('useToast must be inside ToastProvider');return value}
