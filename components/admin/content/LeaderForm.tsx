'use client';import { Check,Field,TextArea } from './fields';import { MediaPicker } from '@/components/admin/media/MediaPicker';import type { MediaAsset } from '@/lib/cms/media'
export function LeaderForm({value,onChange,mediaAssets}:{value:any;onChange:(n:string,v:unknown)=>void;mediaAssets?:MediaAsset[]}){
return <div className="editor-form">
<div className="form-grid">
<Field label="Name" name="name" value={value.name} onChange={onChange} required/>
<Field label="Role title" name="roleTitle" value={value.roleTitle} onChange={onChange} required/>
<Field label="Term" name="term" value={value.term} onChange={onChange}/>
<Field label="Class year" name="classYear" value={value.classYear} onChange={onChange}/>
<Field label="Major" name="major" value={value.major} onChange={onChange}/>
<Field label="Email" name="email" value={value.email} onChange={onChange} type="email"/>
</div>
<TextArea label="Bio" name="bio" value={value.bio} onChange={onChange}/>
<Field label="LinkedIn URL" name="linkedinUrl" value={value.linkedinUrl} onChange={onChange} type="url"/>
<div className="form-field-group"><label>Photo</label>{mediaAssets?<MediaPicker assets={mediaAssets} value={value.photoMediaId} onChange={id=>onChange('photoMediaId',id)}/>:<p className="hint">Upload a photo in the Media Library first, then come back to select it here.</p>}</div>
<div className="check-row">
<Check label="Current" name="current" value={value.current} onChange={onChange}/>
<Check label="Advisor" name="advisor" value={value.advisor} onChange={onChange}/>
<Check label="Open seat" name="openSeat" value={value.openSeat} onChange={onChange}/>
</div>
</div>}

