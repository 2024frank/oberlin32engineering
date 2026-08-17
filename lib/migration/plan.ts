export type MigrationMode='migrate'|'review_only'
export type MigrationPlanItem={source:string;target:string|null;mode:MigrationMode}

export const migrationTablePlan:MigrationPlanItem[]=[
  {source:'profiles',target:null,mode:'review_only'},
  {source:'projects',target:'projects',mode:'migrate'},
  {source:'project_updates',target:'project_updates',mode:'migrate'},
  {source:'leaders',target:'leaders',mode:'migrate'},
  {source:'events',target:'events',mode:'migrate'},
  {source:'resources',target:'resources',mode:'migrate'},
  {source:'opportunities',target:'opportunities',mode:'migrate'},
  {source:'news_posts',target:'news_posts',mode:'migrate'},
  {source:'sponsors',target:'sponsors',mode:'migrate'},
  {source:'partner_schools',target:'partner_schools',mode:'migrate'},
  {source:'documents',target:'documents',mode:'migrate'},
  {source:'submissions',target:'submissions',mode:'migrate'},
  {source:'media',target:'media',mode:'migrate'},
  {source:'site_settings',target:'site_settings',mode:'migrate'},
  {source:'competition_editions',target:null,mode:'review_only'},
  {source:'impact',target:null,mode:'review_only'}
]
