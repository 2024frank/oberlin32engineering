import { describe,expect,it } from 'vitest'
import { assertPublishableImageMetadata,getImagePublishBlockReason } from '@/lib/media/imagePolicy'
import { collectContentMediaIds,collectPageMediaIds } from '@/lib/media/references'

const base={mimeType:'image/jpeg',altText:'Students assembling a sensor enclosure at a lab bench.',sourceType:'original' as const,rightsNote:null,visualQaApproved:false}

describe('image publication policy',()=>{
  it('requires alt text for every published image',()=>expect(()=>assertPublishableImageMetadata({...base,altText:' '})).toThrow('IMAGE_ALT_REQUIRED'))
  it('requires a rights note for licensed imagery',()=>expect(()=>assertPublishableImageMetadata({...base,sourceType:'licensed',rightsNote:' '})).toThrow('LICENSED_IMAGE_RIGHTS_REQUIRED'))
  it('requires human visual QA for generated imagery',()=>expect(()=>assertPublishableImageMetadata({...base,sourceType:'generated',visualQaApproved:false})).toThrow('GENERATED_IMAGE_QA_REQUIRED'))
  it('accepts original imagery with accessible metadata',()=>expect(getImagePublishBlockReason(base)).toBeNull())
})

describe('media reference collection',()=>{
  it('collects page metadata and image-section references once',()=>{
    const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']
    expect(collectPageMediaIds({ogMediaId:ids[0],sections:[{type:'hero',imageId:ids[1]},{type:'gallery',images:[{mediaId:ids[2]},{mediaId:ids[1]}]}]})).toEqual(ids)
  })
  it('uses only the declared media field for each structured content type',()=>{
    const id='00000000-0000-4000-8000-000000000004'
    expect(collectContentMediaIds('projects',{coverMediaId:id})).toEqual([id])
    expect(collectContentMediaIds('project_updates',{mediaId:id})).toEqual([id])
    expect(collectContentMediaIds('leaders',{photoMediaId:id})).toEqual([id])
    expect(collectContentMediaIds('sponsors',{logoMediaId:id})).toEqual([id])
    expect(collectContentMediaIds('opportunities',{coverMediaId:id})).toEqual([])
  })
})
