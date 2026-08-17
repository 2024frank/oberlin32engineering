'use client'
import { useMemo,useState } from 'react'
import type { MediaAsset } from '@/lib/cms/media'
import { getImagePublishBlockReason } from '@/lib/media/imagePolicy'

const reasonLabel={IMAGE_ALT_REQUIRED:'Add alt text in Media Library',LICENSED_IMAGE_RIGHTS_REQUIRED:'Add license / rights details',GENERATED_IMAGE_QA_REQUIRED:'Human realism QA required'} as const

export function MediaPicker({assets,value,onChange}:{assets:MediaAsset[];value?:string|null;onChange:(id:string|null)=>void}){
  const[q,setQ]=useState('')
  const filtered=useMemo(()=>assets.filter(a=>`${a.fileName} ${a.tags.join(' ')} ${a.sourceType}`.toLowerCase().includes(q.toLowerCase())),[assets,q])
  return <div className="media-picker"><label>Search media<input value={q} onChange={e=>setQ(e.target.value)} /></label><div className="media-grid">{filtered.map(asset=>{const reason=getImagePublishBlockReason(asset);const selected=asset.id===value;return <button type="button" key={asset.id} className={`${selected?'selected ':''}${reason?'media-blocked':''}`.trim()} disabled={Boolean(reason)&&!selected} aria-disabled={Boolean(reason)&&!selected} onClick={()=>onChange(selected?null:asset.id)}><img src={asset.publicUrl} alt={asset.altText||''}/><span>{asset.fileName}<small>{reason?reasonLabel[reason]:`${asset.sourceType} · ready`}</small></span></button>})}</div>{value&&<button type="button" onClick={()=>onChange(null)}>Clear selection</button>}</div>
}
