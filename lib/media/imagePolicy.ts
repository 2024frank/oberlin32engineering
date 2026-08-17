export type ImageSourceType = 'original' | 'licensed' | 'generated'

export type PublishableImageMetadata = {
  mimeType: string
  altText: string
  sourceType: ImageSourceType
  rightsNote?: string | null
  visualQaApproved: boolean
}

export type ImagePublishBlockReason =
  | 'IMAGE_ALT_REQUIRED'
  | 'LICENSED_IMAGE_RIGHTS_REQUIRED'
  | 'GENERATED_IMAGE_QA_REQUIRED'

export function getImagePublishBlockReason(input: PublishableImageMetadata): ImagePublishBlockReason | null {
  if (!input.mimeType.startsWith('image/')) return null
  if (!input.altText.trim()) return 'IMAGE_ALT_REQUIRED'
  if (input.sourceType === 'licensed' && !input.rightsNote?.trim()) return 'LICENSED_IMAGE_RIGHTS_REQUIRED'
  if (input.sourceType === 'generated' && !input.visualQaApproved) return 'GENERATED_IMAGE_QA_REQUIRED'
  return null
}

export function assertPublishableImageMetadata(input: PublishableImageMetadata): void {
  const reason = getImagePublishBlockReason(input)
  if (reason) throw new Error(reason)
}

export function isPublishableImageMetadata(input: PublishableImageMetadata): boolean {
  return getImagePublishBlockReason(input) === null
}
