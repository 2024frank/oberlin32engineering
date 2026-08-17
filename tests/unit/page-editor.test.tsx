import { render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach,describe,expect,it,vi } from 'vitest'
import { PageEditor } from '@/components/page-builder/admin/PageEditor'
import { ToastProvider } from '@/components/ui/Toast'

const page={pageId:'00000000-0000-4000-8000-000000000001',slug:'home',title:'Home',seoTitle:'OEC',seoDescription:'',ogMediaId:null,sections:[{stableKey:'hero',isVisible:true,type:'hero' as const,layout:'minimal' as const,eyebrow:'',headline:'Build together',body:'',imageId:null,imageAlt:''}]}
const versions=[{id:'00000000-0000-4000-8000-000000000010',version_number:3,published_at:'2026-08-17T00:00:00Z',published_by:null,restored_from:null}]

afterEach(()=>vi.unstubAllGlobals())

describe('PageEditor',()=>{
  it('does not publish when saving the draft fails',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:false,json:async()=>({error:'PAGE_SAVE_FAILED'})})
    vi.stubGlobal('fetch',fetchMock)
    const user=userEvent.setup()
    render(<ToastProvider><PageEditor initial={page} versions={versions} canPublish={true} mediaAssets={[]}/></ToastProvider>)
    await user.click(screen.getByRole('button',{name:'Publish'}))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/pages',expect.objectContaining({method:'PUT'}))
  })

  it('shows version history and can restore a published version',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})})
    vi.stubGlobal('fetch',fetchMock)
    const user=userEvent.setup()
    render(<ToastProvider><PageEditor initial={page} versions={versions} canPublish={true} mediaAssets={[]}/></ToastProvider>)
    expect(screen.getByText('Version 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Restore version 3'}))
    expect(fetchMock).toHaveBeenCalledWith('/api/restore/page',expect.objectContaining({method:'POST'}))
  })

  it('keeps preview in the current tab so the previewed draft is the next screen',()=>{
    render(<ToastProvider><PageEditor initial={page} versions={versions} canPublish={true} mediaAssets={[]}/></ToastProvider>)
    expect(screen.getByRole('link',{name:'Preview'})).not.toHaveAttribute('target','_blank')
  })
})
