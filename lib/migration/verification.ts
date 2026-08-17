type MigrationReviewReport={rejected?:unknown[];reviewOnly?:Record<string,unknown>}

export function countExplicitReviewItems(report:MigrationReviewReport):number{
  let count=Array.isArray(report.rejected)?report.rejected.length:0
  for(const value of Object.values(report.reviewOnly??{})){
    if(Array.isArray(value))count+=value.length
  }
  return count
}
